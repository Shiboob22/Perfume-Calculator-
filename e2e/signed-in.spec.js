import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import en from "../src/i18n/messages/en.js";

// The signed-in journey, against a deployed preview and the STAGING
// Supabase project: onboarding → waitlist → export → journal and sharing →
// delete account.
// Runs only when all three are set (never against production):
//   E2E_BASE_URL          a preview URL, e.g. https://scent-handbook-xxxx.vercel.app
//   E2E_SUPABASE_URL      the staging project URL
//   E2E_SERVICE_ROLE_KEY  the staging service-role key (a CI secret)
// Staging Auth must allow E2E_BASE_URL/** as a redirect URL.
// Each run creates a throwaway user and deletes it at the end.
const { E2E_BASE_URL, E2E_SUPABASE_URL, E2E_SERVICE_ROLE_KEY } = process.env;
const enabled = Boolean(E2E_BASE_URL && E2E_SUPABASE_URL && E2E_SERVICE_ROLE_KEY && !/nhfpgjikyolrwmbmqrng/.test(E2E_SUPABASE_URL));

test.describe.configure({ mode: "serial" });
test.skip(!enabled, "signed-in e2e needs E2E_BASE_URL, E2E_SUPABASE_URL and E2E_SERVICE_ROLE_KEY (staging)");
test.use({ baseURL: E2E_BASE_URL });

let admin;
let user;
const email = `e2e+${Date.now()}@example.test`;

test.beforeAll(async () => {
  admin = createClient(E2E_SUPABASE_URL, E2E_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  user = data.user;
});

test.afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id).catch(() => {});
});

async function signIn(page, path) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink", email, options: { redirectTo: `${E2E_BASE_URL}${path}` },
  });
  if (error) throw error;
  await page.goto(data.properties.action_link);
}

test("a new user answers onboarding and joins the waitlist", async ({ page }) => {
  await signIn(page, "/app/account");
  await expect(page.getByText(en.onboarding.title)).toBeVisible();
  await page.getByRole("button", { name: en.onboarding.unit.g }).click();
  await page.getByRole("button", { name: en.onboarding.next }).click();
  await page.getByRole("button", { name: "30 g" }).click();
  await page.getByRole("button", { name: en.onboarding.next }).click();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: en.onboarding.finish }).click();

  await expect(page).toHaveURL(/\/app\/account/);
  await page.getByRole("button", { name: en.account.waitlist.join }).click();
  await expect(page.getByRole("status").filter({ hasText: en.account.waitlist.joined })).toBeVisible();
});

test("the calculator opens at the saved bottle", async ({ page }) => {
  await signIn(page, "/app/calculator");
  await expect(page.locator("#calc-size")).toHaveValue("30");
});

test("export includes the profile", async ({ page }) => {
  await signIn(page, "/app/account");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: en.account.data.json }).click(),
  ]);
  const json = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString("utf8")));
  expect(json.profiles[0]).toMatchObject({ default_unit: "g", default_bottle: 30 });
  expect(JSON.stringify(json)).not.toContain(user.id);
});

test("journal and sharing work against the real API and database", async ({ page }) => {
  // A batch made 22 days ago (written as the service role, as /api would),
  // so its rest-start check-in (Woody: day 21) is due now.
  const started = new Date(Date.now() - 22 * 86400000 - 3600000);
  const local = `${started.getFullYear()}-${String(started.getMonth() + 1).padStart(2, "0")}-${String(started.getDate()).padStart(2, "0")}`;
  const { data: batch, error } = await admin.from("batches").insert({
    user_id: user.id, fragrance_name: "E2E Oud", tier: "woody", blend_date: local, created_at: started.toISOString(),
    concentration_pct: 25, oil_g: 23.75, oil_ml: 25, ethanol_g: 60.75, ethanol_ml: 75, total_g: 84.5, total_ml: 100,
    oil_cost: 99.99, notes: "E2E PRIVATE NOTE", oil_type: "E2E SUPPLIER", basis: "volume",
  }).select().single();
  if (error) throw error;

  await signIn(page, "/app/batches");
  const due = page.getByRole("region", { name: "1 batch is due for a check-in" });
  await due.getByLabel(/How does/).fill("Softer now");
  await due.getByRole("radio", { name: "4 of 5" }).check({ force: true });
  await due.getByRole("button", { name: en.journal.save }).click();
  await expect(due).toBeHidden();
  const { data: checkins } = await admin.from("batch_checkins").select("*").eq("batch_id", batch.id);
  expect(checkins).toMatchObject([{ user_id: user.id, scheduled_day: 21, rating: 4, note: "Softer now" }]);

  // The check-in comes back with the batch list (the embed) after a reload.
  await page.reload();
  await expect(page.getByText("Softer now")).toBeVisible();

  await page.getByRole("button", { name: en.share.open }).click();
  const panel = page.getByRole("region", { name: en.share.title });
  await panel.getByLabel(en.share.noteLabel).fill("Sharp for two weeks, then the oud rounds out beautifully.");
  await panel.getByRole("button", { name: en.share.publish }).click();
  const link = panel.getByRole("link", { name: /\/r\// });
  await expect(link).toBeVisible();
  const path = new URL(await link.getAttribute("href")).pathname;

  const recipe = await page.request.get(`${E2E_BASE_URL}${path}`);
  expect(recipe.status()).toBe(200);
  const html = await recipe.text();
  expect(html).toContain("E2E Oud");
  expect(html).not.toContain("noindex");
  for (const secret of ["99.99", "E2E PRIVATE NOTE", "E2E SUPPLIER", user.id, email]) expect(html).not.toContain(secret);

  await panel.getByRole("button", { name: en.share.stop }).click();
  await expect(page.getByRole("status").filter({ hasText: en.share.stopped })).toBeAttached();
  // Past the CDN's cached copy: the function no longer serves it.
  expect((await page.request.get(`${E2E_BASE_URL}${path}?after-unshare=${Date.now()}`)).status()).toBe(404);
});

test("deleting the account removes the user", async ({ page }) => {
  await signIn(page, "/app/account");
  await page.getByLabel(en.account.delete.confirmLabel).fill(email);
  await page.getByRole("button", { name: en.account.delete.button }).click();
  await expect(page).toHaveURL(`${E2E_BASE_URL}/`);
  const { data } = await admin.auth.admin.getUserById(user.id);
  expect(data.user).toBeNull();
  user = null;
});

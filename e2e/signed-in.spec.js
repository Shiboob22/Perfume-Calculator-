import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import en from "../src/i18n/messages/en.js";

// The signed-in journey, against a deployed preview and the STAGING
// Supabase project: onboarding → waitlist → export → delete account.
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

test("deleting the account removes the user", async ({ page }) => {
  await signIn(page, "/app/account");
  await page.getByLabel(en.account.delete.confirmLabel).fill(email);
  await page.getByRole("button", { name: en.account.delete.button }).click();
  await expect(page).toHaveURL(`${E2E_BASE_URL}/`);
  const { data } = await admin.auth.admin.getUserById(user.id);
  expect(data.user).toBeNull();
  user = null;
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Phase 8, the blend loop, against the production build with a fake
// session and a fake API: a link survives onboarding, the calculator keeps
// its inputs, a retry or an offline log can't log twice, bench mode keeps
// the full record and offers next steps, a batch can be edited and made
// again, and a locked feature offers the waitlist in one tap.

const BATCH_ID = "11111111-1111-4111-8111-111111111111";
const FRAG_ID = "22222222-2222-4222-8222-222222222222";
const BATCH = {
  id: BATCH_ID, user_id: USER.id, fragrance_id: FRAG_ID, fragrance_name: "Oud Nights", tier: "woody", concentration_pct: 25,
  blend_date: "2026-09-01", created_at: "2026-09-01T10:00:00Z", amount: 50, unit: "ml", lot: "L-7",
  oil_g: 11.875, oil_ml: 12.5, ethanol_g: 30.375, ethanol_ml: 37.5, total_g: 42.25, total_ml: 50, basis: "volume",
  oil_density: 0.95, ethanol_density: 0.81, batch_checkins: [], shared_recipes: null,
};

async function fakeApi(page, { plan = "pro", onboarded: startOnboarded = true, locale = "en", logAnswers = [] } = {}) {
  const sent = { logs: [], edits: [], profiles: [], waitlist: [] };
  let onboarded = startOnboarded;
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = req.url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) {
      if (req.method() !== "GET") {
        const body = req.postDataJSON();
        sent.profiles.push(body);
        onboarded = true;
        const row = { locale, default_unit: "ml", default_bottle: 100, digits: "latn", ...body };
        return json(route, (req.headers().accept || "").includes("pgrst.object") ? row : [row]);
      }
      return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: onboarded ? "2026-10-01T00:00:00Z" : null }]);
    }
    if (url.includes("/rest/v1/fragrances") && req.method() === "GET" && /Oud/.test(decodeURIComponent(url))) {
      const row = { id: FRAG_ID, name: "Oud Nights", tier: "woody" };
      return json(route, (req.headers().accept || "").includes("pgrst.object") ? row : [row]);
    }
    if (url.includes("/rest/v1/rpc/ensure_fragrance")) return json(route, [{ id: FRAG_ID, name: "Oud Nights", tier: "woody" }]);
    if (url.includes("/rest/v1/pro_waitlist") && req.method() === "POST") { sent.waitlist.push(req.postDataJSON()); return json(route, [], 201); }
    return json(route, []);
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") {
      return json(route, plan === "pro"
        ? { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, batchesUsed: 1 }
        : { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, batchesUsed: 1 });
    }
    if (url.pathname === "/api/batches" && req.method() === "GET") return json(route, { batches: [BATCH] });
    if (url.pathname === "/api/batches" && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.logs.push(body);
      const answer = logAnswers.shift() ?? "ok";
      if (answer === "offline") return route.abort("internetdisconnected");
      if (answer === "slow") return json(route, { error: "slow", code: "slow_write" }, 503);
      return json(route, { success: true, batch: { ...body, user_id: USER.id }, stock: "deducted" }, 201);
    }
    if (url.pathname === "/api/batches" && req.method() === "PATCH") {
      const body = req.postDataJSON();
      sent.edits.push(body);
      return json(route, { batch: { ...BATCH, ...body.edit } });
    }
    return json(route, {});
  });
  return sent;
}

test("a recipe link survives sign-up and onboarding, and its source is saved", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page, { onboarded: false });
  await page.goto("/app/calculator?family=woody&conc=25&size=50&unit=ml&name=Oud%20Nights&ref=recipe");
  await page.getByRole("button", { name: en.onboarding.unit.g }).click();
  await page.getByRole("button", { name: en.onboarding.next }).click();
  await page.getByRole("button", { name: "30 g" }).click();
  await page.getByRole("button", { name: en.onboarding.next }).click();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: en.onboarding.finish }).click();

  await expect(page).toHaveURL(/\/app\/calculator\?size=50&unit=ml&conc=25&family=woody&name=Oud\+Nights$/);
  await expect(page.getByRole("combobox", { name: en.calc.name })).toHaveValue("Oud Nights");
  expect(sent.profiles.some((p) => p.signup_ref === "recipe")).toBe(true);
});

test("the calculator keeps its inputs across a tab switch, and Start over clears them", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/app/calculator");
  await page.getByRole("combobox", { name: en.calc.name }).fill("Amber Draft");
  await page.getByRole("button", { name: new RegExp(en.app.tabs.batches) }).click();
  await page.getByRole("button", { name: new RegExp(en.app.tabs.calculator) }).click();
  await expect(page.getByRole("combobox", { name: en.calc.name })).toHaveValue("Amber Draft");
  await page.getByRole("button", { name: en.calculator.draft.startOver }).click();
  await expect(page.getByRole("combobox", { name: en.calc.name })).toHaveValue("");
});

test("a retry after a slow answer sends the same batch id", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page, { logAnswers: ["slow", "ok"] });
  await page.goto("/app/calculator?name=Oud%20Nights");
  const log = page.getByRole("button", { name: en.calc.log });
  await log.click();
  await expect(page.getByRole("status").filter({ hasText: en.errors.slow_write })).toBeVisible();
  await log.click();
  await expect(page.getByRole("status").filter({ hasText: en.calc.saved.split("{")[0].trim().slice(0, 12) })).toBeVisible();
  expect(sent.logs).toHaveLength(2);
  expect(sent.logs[1].id).toBe(sent.logs[0].id);
  expect(sent.logs[0].deduct_oil_g).toBeGreaterThan(0);
});

test("offline, a log waits on the device", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { logAnswers: ["offline"] });
  await page.goto("/app/calculator?name=Oud%20Nights");
  await page.getByRole("button", { name: en.calc.log }).click();
  await expect(page.getByText(en.calc.queued)).toBeVisible();
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem("sh-outbox") || "[]"));
  expect(queued).toHaveLength(1);
  expect(queued[0].batch.fragrance_name).toBe("Oud Nights");
});

test("bench mode logs the full record and offers next steps", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page);
  await page.goto("/app/calculator?size=50&unit=ml&conc=25&family=woody&name=Oud%20Nights");
  await page.getByRole("button", { name: en.bench.start }).click();
  await page.getByRole("checkbox").check();
  const next = page.getByRole("button", { name: en.bench.next, exact: true });
  await next.click(); // prepare → tare
  await next.click(); // tare → oil
  await page.getByLabel(en.bench.oil.actual).fill("11.9");
  await next.click(); // oil → tare again
  await next.click(); // → alcohol
  await page.getByLabel(en.bench.alcohol.actual).fill("30.4");
  await next.click(); // → mix
  await next.click(); // → qc
  await next.click(); // → label

  await page.reload(); // progress is kept for this run
  await page.getByLabel(en.bench.label.lot).fill("L-0412");
  await page.getByRole("button", { name: en.bench.label.log }).click();
  await expect(page.getByRole("navigation", { name: en.bench.after.title })).toBeVisible();
  expect(sent.logs[0]).toMatchObject({ lot: "L-0412", amount: 50, unit: "ml", actual_oil_g: 11.9, actual_ethanol_g: 30.4 });
  expect(sent.logs[0].notes).toBeNull();

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: en.bench.label.again }).click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
});

test("a batch is edited, and made again", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page);
  await page.goto("/app/batches");
  await page.getByRole("button", { name: en.batches.edit.open }).click();
  await page.getByLabel(en.batches.edit.name).fill("Oud Nights II");
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations).toEqual([]);
  await page.getByRole("button", { name: en.batches.edit.save }).click();
  await expect(page.getByText("Oud Nights II", { exact: true }).first()).toBeVisible();
  expect(sent.edits).toEqual([{ id: BATCH_ID, edit: { fragrance_name: "Oud Nights II" } }]);

  await page.getByRole("button", { name: en.batches.again }).click();
  await expect(page).toHaveURL(/\/app\/calculator\?size=50&unit=ml&conc=25&family=woody&name=Oud\+Nights\+II/);
});

test("Arabic: the edit form and the history panel", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { locale: "ar" });
  await page.addInitScript(() => localStorage.setItem("sh-locale", "ar"));
  await page.goto("/app/calculator?name=Oud%20Nights");
  await expect(page.getByRole("heading", { name: ar.calc.history.title })).toBeVisible();
  await page.goto("/app/batches");
  await page.getByRole("button", { name: ar.batches.edit.open }).click();
  await expect(page.getByLabel(ar.batches.edit.lot)).toHaveValue("L-7");
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("a locked feature offers the Pro waitlist in one tap", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page, { plan: "free" });
  await page.goto("/app/inventory");
  await page.getByRole("button", { name: en.account.waitlist.join }).click();
  await expect(page.getByText(en.account.waitlist.joined)).toBeVisible();
  expect(sent.waitlist[0]).toMatchObject({ locale: "en", source: "locked.inventory" });
});

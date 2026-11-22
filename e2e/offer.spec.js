import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { COMPARE_ROWS } from "../src/lib/plansConfig.js";
import { USER, json, signIn } from "./helpers.js";

// One offer (audit H8, owner's go-ahead 2026-11-22): the same headline, the
// same Free-and-Pro table and the same action (the 14-day trial, then the
// waitlist) on the Pricing page, in the upgrade sheet and in Account.
test.use({ serviceWorkers: "block" });

const FREE = { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, formulaCap: null, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 2 };
const msgs = { en, ar };
const AXE = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

async function signedIn(page, { locale = "en", trialOk = true } = {}) {
  await page.addInitScript(() => localStorage.setItem("kyphira.renameNoticeDismissed", "1"));
  await signIn(page);
  const sent = { trial: 0 };
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "2026-10-01T00:00:00Z" }]);
    if (url.includes("/rest/v1/pro_waitlist")) return json(route, []);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") return json(route, FREE);
    if (url.pathname === "/api/account" && req.method() === "POST") {
      sent.trial += 1;
      return trialOk ? json(route, { status: "started", trial_ends_at: "2026-12-06T00:00:00Z", days: 14 }) : json(route, { code: "trial_used" }, 409);
    }
    if (url.pathname === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
  return sent;
}

const rowNames = (m) => COMPARE_ROWS.map((r) => m.upgrade.rows[r.key]);

for (const locale of ["en", "ar"]) {
  test(`${locale}: Pricing has the headline, one table and the trial first`, async ({ page }) => {
    const m = msgs[locale];
    await page.goto(locale === "ar" ? "/ar/pricing" : "/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(m.site.pricing.titleEm);
    await expect(page.getByText(m.plan.trial.terms)).toBeVisible();
    await expect(page.getByRole("link", { name: m.plan.trial.start })).toHaveAttribute("href", "/app/account#pro");
    const heads = page.locator("table tbody th[scope=row]");
    await expect(heads).toHaveText(rowNames(m));
    const { violations } = await new AxeBuilder({ page }).include("main").withTags(AXE).analyze();
    expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
  });

  test(`${locale}: the upgrade sheet says the same and offers the trial`, async ({ page }) => {
    const m = msgs[locale];
    await signedIn(page, { locale });
    await page.goto(locale === "ar" ? "/ar/bench" : "/bench");
    await page.locator("[data-plan=free]").click();
    const sheet = page.getByRole("dialog", { name: m.upgrade.title });
    await expect(sheet.getByText(m.upgrade.lead, { exact: true })).toBeVisible();
    await expect(sheet.locator("tbody th[scope=row]")).toHaveText(rowNames(m));
    await expect(sheet.getByRole("button", { name: m.plan.trial.start })).toBeVisible();
    await expect(sheet.getByText(m.plan.trial.terms)).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).include("dialog[open]").withTags(AXE).analyze();
    expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test("Account's Pro section starts the trial above the waitlist", async ({ page }) => {
  const sent = await signedIn(page);
  await page.goto("/app/account#pro");
  const pro = page.locator("[data-trial]");
  await expect(pro.getByText(en.plan.trial.terms)).toBeVisible();
  await pro.getByRole("button", { name: en.plan.trial.start }).click();
  await expect(pro.getByRole("status")).toHaveText(en.plan.trial.startedNow);
  expect(sent.trial).toBe(1);
  await expect(page.getByRole("button", { name: en.account.waitlist.join })).toBeVisible();
});

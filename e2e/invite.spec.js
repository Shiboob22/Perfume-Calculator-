import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Bring a friend (0042): a Pro user's invite link in Account, and the line a
// friend sees at onboarding when they arrive through it.
test.use({ serviceWorkers: "block" });

const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 3 };
const FREE = { ...PRO, plan: "free", name: "Free", features: [], batchCap: 25 };
const ENDS = "2027-01-20T10:00:00Z";

async function fakeApi(page, { me = PRO, locale = "en", onboarded = true } = {}) {
  const asked = [];
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: onboarded ? "2026-10-01T00:00:00Z" : null }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") return json(route, me);
    if (url.pathname === "/api/account" && req.method() === "POST" && req.postDataJSON()?.action === "invite") {
      asked.push(1);
      return json(route, { code: "abcd2345", earned: 2, cap: 6, gift_ends_at: ENDS });
    }
    return json(route, {});
  });
  return asked;
}

test("a Pro user gets an invite link, months earned and the gifted Pro's end", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signIn(page);
  const asked = await fakeApi(page);
  await page.goto("/app/account");
  const box = page.locator("#invite");
  await expect(box.getByRole("heading", { name: en.account.invite.title })).toBeVisible();
  await expect(box.getByRole("textbox")).toHaveValue(/\/bench\?ref=invite-abcd2345$/);
  await expect(box).toContainText("Months earned: 2 of 6");
  await expect(box).toContainText("20 January 2027");
  await box.getByRole("button", { name: en.account.invite.copy }).click();
  await expect(box.getByRole("status")).toHaveText(en.account.invite.copied);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/ref=invite-abcd2345$/);
  expect(asked).toHaveLength(1);
});

test("Free users see the waitlist, not the invite", async ({ page }) => {
  await signIn(page);
  const asked = await fakeApi(page, { me: FREE });
  await page.goto("/app/account");
  await expect(page.getByRole("heading", { name: en.account.waitlist.title })).toBeVisible();
  await expect(page.locator("#invite")).toHaveCount(0);
  expect(asked).toHaveLength(0);
});

test("Arabic: the invite link opens the Arabic Bench", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { locale: "ar" });
  await page.goto("/app/account");
  const box = page.locator("#invite");
  await expect(box.getByRole("heading", { name: ar.account.invite.title })).toBeVisible();
  await expect(box.getByRole("textbox")).toHaveValue(/\/ar\/bench\?ref=invite-abcd2345$/);
  await expect(box).toContainText("2 من 6");
});

test("a friend arriving through an invite is told what they get", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { me: FREE, onboarded: false });
  await page.goto("/bench?ref=invite-abcd2345");
  await expect(page.locator("[data-invited]")).toHaveText(en.onboarding.invited);
  await page.goto("/bench?ref=pricing");
  await expect(page.getByRole("heading", { name: en.onboarding.title })).toBeVisible();
  await expect(page.locator("[data-invited]")).toHaveCount(0);
});

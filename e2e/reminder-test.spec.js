import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Account → Reminder test: admins only (is_admin), sends one reminder and says what went where.
test.use({ serviceWorkers: "block" });

const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };

async function fakeApi(page, { admin, locale = "en", answer }) {
  const sent = [];
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/rpc/is_admin")) return json(route, admin);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") return json(route, PRO);
    if (url.pathname === "/api/checkins" && url.searchParams.get("job") === "test" && req.method() === "POST") { sent.push(1); return json(route, answer); }
    return json(route, {});
  });
  return sent;
}

test("not shown to someone who is not an admin", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { admin: false, answer: {} });
  await page.goto("/app/account");
  await expect(page.getByRole("heading", { name: en.account.data.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: en.account.reminderTest.title })).toHaveCount(0);
});

test("an admin sends a test and reads what went where", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page, { admin: true, answer: { email: "sent", push: { devices: 2, sent: 1, gone: 1, failed: 0 }, items: 1 } });
  await page.goto("/app/account");
  await page.getByRole("button", { name: en.account.reminderTest.button }).click();
  const status = page.locator("#reminder-test [role=status]");
  await expect(status).toContainText(en.account.reminderTest.email.sent);
  await expect(status).toContainText("Notification sent to 1 of 2 devices.");
  expect(sent).toHaveLength(1);
});

test("Arabic: says when no device has notifications on", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { admin: true, locale: "ar", answer: { email: "off", push: { devices: 0, sent: 0, gone: 0, failed: 0 }, items: 1 } });
  await page.goto("/app/account"); // the profile locale switches it to Arabic
  await page.getByRole("button", { name: ar.account.reminderTest.button }).click();
  const status = page.locator("#reminder-test [role=status]");
  await expect(status).toContainText(ar.account.reminderTest.email.off);
  await expect(status).toContainText(ar.account.reminderTest.push.none);
});

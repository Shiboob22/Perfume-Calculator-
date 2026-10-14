// "Scent Ledger is now Kyphira": shown once to a signed-in user, gone after dismissing.
import { test, expect } from "@playwright/test";
import { USER, json, signIn } from "./helpers.js";

test.use({ serviceWorkers: "block" });

async function fakeApi(page) {
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => json(route, route.request().url().includes("/api/me")
    ? { plan: "free", name: "Free", features: [], batchCap: 25, batchesUsed: 0 } : {}));
}

test("the rename notice shows once and stays dismissed", async ({ page }) => {
  // The notice runs from 2026-10-14 for 60 days; pin the browser clock inside it.
  await page.clock.install({ time: new Date("2026-10-20T10:00:00Z") });
  await signIn(page);
  await fakeApi(page);
  await page.goto("/bench");
  const notice = page.getByRole("status").filter({ hasText: "Scent Ledger is now Kyphira" });
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: "Dismiss" }).click();
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
  await expect(page.getByRole("status").filter({ hasText: "Scent Ledger is now Kyphira" })).toHaveCount(0);
});

test("the notice is gone after 60 days", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-12-20T10:00:00Z") });
  await signIn(page);
  await fakeApi(page);
  await page.goto("/bench");
  await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
  await expect(page.getByRole("status").filter({ hasText: "is now Kyphira" })).toHaveCount(0);
});

import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";

test("the app asks you to sign in, and is kept out of search", async ({ page }) => {
  await page.goto("/app/calculator?size=50&unit=ml&conc=20");
  await expect(page.getByText(en.auth.signIn, { exact: true })).toBeVisible();
  await expect(page.getByLabel(en.auth.emailLabel)).toBeVisible();
  await expect(page.getByRole("button", { name: en.auth.continueGoogle })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("the app shell opens offline once it has been visited", async ({ page, context }) => {
  await page.goto("/app");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  // The first visit installs the worker; the next load is controlled by it.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel(en.auth.emailLabel)).toBeVisible();
  await context.setOffline(false);
});

test("a sign-in link that lands on the home page is handed to the app", async ({ page }) => {
  await page.goto("/#access_token=test&type=magiclink");
  await expect(page).toHaveURL(/\/app#access_token=test/);
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";

// Phase 9, the living handbook: the live bench works with and without
// JavaScript, guides turn like pages, motion respects the reader, and the
// new pages are accessible in both languages.

const scales = (page) => page.locator(".ledger [aria-live][aria-label]");

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the home page's bench shows 50 mL at 25%", async ({ page }) => {
    await page.goto("/");
    await expect(scales(page).first()).toHaveAttribute("aria-label", "11.88 grams of fragrance oil");
    await expect(scales(page).nth(1)).toHaveAttribute("aria-label", "30.38 grams of ethanol");
    await expect(page.getByText("28.1 : 71.9 by weight")).toBeVisible();
  });
});

test("the bench weighs every bottle and strength, and copies the recipe", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "100 mL" }).click();
  await page.getByRole("button", { name: /^15%/ }).click();
  await expect(scales(page).first()).toHaveAttribute("aria-label", "14.25 grams of fragrance oil");
  await expect(scales(page).nth(1)).toHaveAttribute("aria-label", "68.85 grams of ethanol");
  await expect(page.getByRole("button", { name: "100 mL" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: en.site.ledger.bench.copy }).click();
  await expect(page.getByRole("button", { name: en.site.ledger.bench.copied })).toBeVisible();
  await expect(page.getByRole("button", { name: en.site.ledger.bench.copy })).toBeVisible({ timeout: 4000 });
});

test("no sideways scrolling on a 390 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("a guide turns to the next one", async ({ page }) => {
  await page.goto("/guides/why-weigh");
  await page.getByRole("navigation", { name: en.site.guides.more }).getByRole("link").last().click();
  await expect(page).toHaveURL(/\/guides\/the-calculation$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The calculation");
});

test("reduced motion turns the reading hairline and pours off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/guides/the-calculation");
  await expect(page.locator(".read-progress")).toBeHidden();
  await page.goto("/");
  expect(await page.locator(".ledger-roll").first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
});

for (const [path, lang] of [["/", "en"], ["/ar", "ar"], ["/guides/the-calculation", "en"], ["/ar/guides/the-calculation", "ar"], ["/pricing", "en"], ["/ar/guides", "ar"]]) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations).toEqual([]);
  });
}

test("Arabic home: the bench in Arabic, numbers left to right, Scent Ledger in the title", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.getByRole("heading", { name: ar.site.ledger.bench.title })).toBeVisible();
  await expect(scales(page).first()).toHaveAttribute("dir", "ltr");
  await expect(page).toHaveTitle(/Scent Ledger/);
});

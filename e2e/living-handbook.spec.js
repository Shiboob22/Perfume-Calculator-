import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";

// Phase 9, the living handbook: the live bench works with and without
// JavaScript, guides turn like pages, motion respects the reader, and the
// new pages are accessible in both languages.

const readout = (page) => page.getByRole("status").locator(".readout");

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the home page shows the worked example on the bench", async ({ page }) => {
    await page.goto("/");
    await expect(readout(page)).toHaveText(["23.75 g", "60.75 g", "84.50 g"]);
    await expect(page.getByRole("link", { name: en.site.home.bench.open })).toHaveAttribute("href", "/app/calculator?size=100&unit=ml&conc=25&ref=home");
  });
});

test("the live bench pours the handbook's figures for the chosen bottle", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "50 mL" }).click();
  await page.getByRole("button", { name: "30% Extrait" }).click();
  await expect(readout(page)).toHaveText(["14.25 g", "28.35 g", "42.60 g"]);
  await expect(page.getByRole("link", { name: en.site.home.bench.open })).toHaveAttribute("href", "/app/calculator?size=50&unit=ml&conc=30&ref=home");
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
  expect(await page.locator(".pour").first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
});

for (const [path, lang] of [["/", "en"], ["/ar", "ar"], ["/guides/the-calculation", "en"], ["/ar/guides/the-calculation", "ar"], ["/pricing", "en"], ["/ar/guides", "ar"]]) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations).toEqual([]);
  });
}

test("Arabic home: the bench in Arabic, numbers left to right", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.getByText(ar.site.home.bench.label)).toBeVisible();
  await expect(readout(page).first()).toHaveAttribute("dir", "ltr");
});

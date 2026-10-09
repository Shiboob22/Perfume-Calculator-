import { test, expect } from "@playwright/test";

// No horizontal page scroll at the audit's six widths, on the public pages
// and the sign-in screen (the app itself needs an account).
const WIDTHS = [320, 375, 390, 768, 1024, 1440];
const PAGES = ["/", "/pricing", "/guides", "/app/calculator", "/ar/"];

for (const width of WIDTHS) {
  for (const path of PAGES) {
    test(`no horizontal overflow: ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.getByRole("heading").first().waitFor();
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(1);
    });
  }
}

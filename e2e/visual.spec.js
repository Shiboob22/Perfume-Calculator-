// Visual regression: every public page in both directions, light and dark.
// Baselines are macOS renders in e2e/__screenshots__ (see playwright.config.js);
// CI renders differently (Linux fonts), so it skips this file unless VISUAL=1.
//   npx playwright test -c pw.local.config.js e2e/visual.spec.js --update-snapshots   (refresh)
import { test, expect } from "@playwright/test";

test.skip(!!process.env.CI && !process.env.VISUAL, "baselines are macOS renders");
test.use({ reducedMotion: "reduce", serviceWorkers: "block" });

const PAGES = ["/", "/pricing", "/library", "/library/the-calculation", "/privacy", "/terms", "/no-such-page"];
// Phone covers every page and theme; desktop the three entry pages.
const DESKTOP_ONLY_PAGES = new Set(["/", "/pricing", "/library"]);

for (const lang of ["en", "ar"]) {
  for (const scheme of ["light", "dark"]) {
    for (const path of PAGES) {
      const url = lang === "ar" ? (path === "/" ? "/ar" : `/ar${path}`) : path;
      test(`${lang} ${scheme} ${path}`, async ({ page }, info) => {
        test.skip(info.project.name === "desktop" && (!DESKTOP_ONLY_PAGES.has(path) || scheme === "dark"), "phone covers it");
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(url, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const name = `${lang}-${scheme}-${path === "/" ? "home" : path.slice(1).replace(/\//g, "-")}.png`;
        await expect(page).toHaveScreenshot(name, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01, mask: [page.locator("canvas")] });
      });
    }
  }
}

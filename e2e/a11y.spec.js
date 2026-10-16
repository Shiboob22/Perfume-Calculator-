import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.2 A/AA checks on every kind of page, English and Arabic. Serious
// and critical violations fail; moderate/minor are printed for review.
const PAGES = ["/", "/ar", "/library", "/ar/library", "/library/the-calculation", "/ar/library/the-calculation", "/pricing", "/privacy", "/app"];

// Measure the settled page: short time-based fades (the bench readout's tick)
// would otherwise be sampled mid-way. Scroll-tied animations never "finish".
const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations()
  .filter((a) => a.timeline === document.timeline && Number.isFinite(a.effect?.getComputedTiming().endTime))
  .map((a) => a.finished.catch(() => {}))));

for (const path of PAGES) {
  test(`accessibility: ${path}`, async ({ page }, info) => {
    await page.goto(path);
    // The app keeps a few requests going (session, warm-up), so wait for its
    // first heading rather than for the network to go quiet.
    await page.locator("h1").first().waitFor();
    await page.waitForLoadState("load");
    await settled(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const summary = violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target}`);
    if (summary.length) info.annotations.push({ type: "axe", description: summary.join("\n") });
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id), summary.join("\n")).toEqual([]);
  });
}

// The dark edition (system preference, no saved choice) passes the same checks.
for (const path of ["/", "/library/the-calculation", "/pricing"]) {
  test(`accessibility, dark theme: ${path}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(path);
    await page.locator("h1").first().waitFor();
    await page.waitForLoadState("load");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(21, 18, 15)");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const summary = violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target}`);
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id), summary.join("\n")).toEqual([]);
  });
}

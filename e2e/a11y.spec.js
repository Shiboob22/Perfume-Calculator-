import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.2 A/AA checks on every kind of page, English and Arabic. Serious
// and critical violations fail; moderate/minor are printed for review.
const PAGES = ["/", "/ar", "/guides", "/ar/guides", "/guides/the-calculation", "/ar/guides/the-calculation", "/pricing", "/privacy", "/app"];

for (const path of PAGES) {
  test(`accessibility: ${path}`, async ({ page }, info) => {
    await page.goto(path);
    // The app keeps a few requests going (session, warm-up), so wait for its
    // first heading rather than for the network to go quiet.
    await page.locator("h1").first().waitFor();
    await page.waitForLoadState("load");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const summary = violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target}`);
    if (summary.length) info.annotations.push({ type: "axe", description: summary.join("\n") });
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id), summary.join("\n")).toEqual([]);
  });
}

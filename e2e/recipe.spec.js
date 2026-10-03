import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { recipePageHtml } from "../src/lib/recipePage.js";

// Shared recipe pages come from api/recipe.ts, which the local server
// doesn't run: serve the template's HTML at the real URL instead, with the
// real built stylesheet, and check it on a phone and a desktop.
const recipe = {
  slug: "oud-nights-k3x9qa", fragrance_name: "Oud Nights", tier: "woody", concentration_pct: "25", basis: "volume",
  total_ml: "100", total_g: "84.5", oil_g: "23.75", ethanol_g: "60.75", rest_days: 24,
  public_note: "Sharp for the first two weeks.\nThen the oud rounds out.\n\nBest from about day 24.", note_lang: "en", indexable: true,
};

for (const lang of ["en", "ar"]) {
  const path = lang === "ar" ? "/ar/r/oud-nights-k3x9qa" : "/r/oud-nights-k3x9qa";

  test(`shared recipe page: ${path}`, async ({ page, baseURL }, info) => {
    const html = recipePageHtml(recipe, { lang, site: baseURL, stylesheet: "/r-assets/site.css", reportEmail: "report@example.test" });
    await page.route(`**${path}`, (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }));
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oud Nights");
    // The stylesheet loaded: the page has the site's dark ground.
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("body > div")).backgroundColor)).toBe("rgb(16, 14, 10)");
    // No sideways scrolling on a phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const make = page.getByRole("link", { name: lang === "ar" ? "اصنع هذه الخلطة" : "Make this blend" });
    await expect(make).toHaveAttribute("href", "/app/calculator?family=woody&conc=25&size=100&unit=ml");

    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const summary = violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target}`);
    if (summary.length) info.annotations.push({ type: "axe", description: summary.join("\n") });
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id), summary.join("\n")).toEqual([]);
  });
}

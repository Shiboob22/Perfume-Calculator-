import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { GUIDES } from "../src/content/guides.js";

// Console errors (hydration mismatches show up here) fail the page.
function watchErrors(page) {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("home: English, left to right, the method in the headline", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.site.home.title);
  await expect(page.getByRole("link", { name: en.site.home.ctaApp })).toHaveAttribute("href", /\/app/);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("home: Arabic, right to left", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ar.site.home.title);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("the language link keeps you on the same page", async ({ page }) => {
  await page.goto("/guides");
  await page.getByRole("link", { name: en.site.nav.language, exact: true }).first().click();
  await expect(page).toHaveURL(/\/ar\/guides$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ar.site.guides.title);
});

test("guides: search narrows the library", async ({ page }) => {
  await page.goto("/guides");
  const all = await page.locator("main article, main li a[href^='/guides/']").count();
  await page.getByLabel(en.site.guides.search).fill("bench");
  await expect(page.locator("a[href='/guides/at-the-bench']").first()).toBeVisible();
  expect(await page.locator("main a[href^='/guides/']").count()).toBeLessThan(Math.max(all, GUIDES.length));
});

test("a guide opens the calculator at its example", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/guides/the-calculation");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The calculation");
  const calc = page.getByRole("link", { name: en.site.guides.openCalc });
  await expect(calc).toHaveAttribute("href", "/app/calculator?size=100&unit=ml&conc=25");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("pricing links to the Pro waitlist in the app", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("link", { name: en.site.pricing.waitlistCta })).toHaveAttribute("href", "/app/account#pro");
});

test("draft legal pages say so and stay out of search", async ({ page, request }) => {
  for (const path of ["/privacy", "/terms", "/ar/privacy"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  }
  await page.goto("/privacy");
  await expect(page.getByRole("note").first()).toHaveText(en.site.legal.draft);
  // sitemap.xml is an index: the build-time pages and the live recipes.
  const index = await (await request.get("/sitemap.xml")).text();
  expect(index).toContain("<sitemapindex");
  expect(index).toContain("/sitemap-pages.xml");
  expect(index).toContain("/sitemap-recipes.xml");
  const sitemap = await (await request.get("/sitemap-pages.xml")).text();
  expect(sitemap).not.toContain("/privacy");
  expect(sitemap).toContain("/guides/the-calculation");
});

test("unknown pages answer 404", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.site.notFound.title);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("public pages are complete HTML", async ({ page }) => {
    await page.goto("/guides/the-calculation");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The calculation");
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });
});

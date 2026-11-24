import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { USER, json, signIn } from "./helpers.js";

// UI/UX audit, the known open items (owner's go-ahead 2026-11-23).
test.use({ serviceWorkers: "block" });
const msgs = { en, ar };

async function bench(page, locale) {
  await page.addInitScript(() => localStorage.setItem("kyphira.renameNoticeDismissed", "1"));
  await signIn(page);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => json(route, new URL(route.request().url()).pathname === "/api/me" ? { plan: "free", name: "Free", features: [], batchCap: 25 } : {}));
  await page.goto("/bench");
}

for (const locale of ["en", "ar"]) {
  const m = msgs[locale];
  test(`M14 ${locale}: the Family box shows the name only, its notes under it (wide screens) and as its description`, async ({ page, isMobile }) => {
    await bench(page, locale);
    const family = page.locator("#calc-family");
    await expect(family).toBeVisible();
    expect(await family.locator("option").allTextContents()).toEqual(expect.arrayContaining([m.families.fresh.label, m.families.woody.label]));
    expect((await family.locator("option").allTextContents()).some((s) => s.includes("—"))).toBe(false);
    const sub = page.locator("[data-family-sub]");
    await (isMobile ? expect(sub).toBeHidden() : expect(sub).toBeVisible());
    await expect(family).toHaveAttribute("aria-describedby", "calc-family-sub");
    await family.selectOption("woody");
    await expect(sub).toHaveText(m.families.woody.sub);
    await expect(family).toHaveAccessibleDescription(m.families.woody.sub);
  });
}

test("Arabic display lines: Latin letters (I–VI, Pro) take the English serif, not the body face", async ({ page }) => {
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/ar");
  const stack = await page.locator(".ar-display").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(stack.split(",").slice(0, 2).map((s) => s.trim().replaceAll('"', ""))).toEqual(["Reem Kufi Variable", "Instrument Serif"]);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.01);
});

test.describe("an Arabic buyer page", () => {
  test.use({ locale: "ar-EG" });
  test("its heading keeps Reem Kufi, then the English serif for a Latin scent name", async ({ page }) => {
    await page.route("**/api/batches?**", (route) => json(route, { order: { shop: "Hisham Blends", scent: "Oud Nights", family: "woody", size_ml: 50, strength_pct: 25, bottled_on: "2026-11-01", feedback: null, can_edit: true } }));
    await page.goto("/ar/o/0123456789abcdef0123456789abcdef");
    const h1 = page.locator("[data-buyer-scent]");
    await expect(h1).toHaveText("Oud Nights");
    const stack = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(stack.split(",").slice(0, 2).map((s) => s.trim().replaceAll('"', ""))).toEqual(["Reem Kufi Variable", "Instrument Serif"]);
  });
});

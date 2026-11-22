import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The Bench on phones (UI/UX audit H1/H2, owner's go-ahead 2026-11-22): the
// bottle's own fields on the first screen, the resting batch, orders and
// formulas as short lines under them, what the scale said right above Log,
// "Add details" folded, prices asked once, and the selling fields in the cost
// card (open for sellers). The tour's link leaves the Bench once it is seen.
test.use({ serviceWorkers: "block" });

const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 3 };
const FREE = { plan: "free", name: "Free", features: [], batchCap: 25, formulaCap: null, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 3 };
const DAY = 86400000;
const started = new Date(Date.now() - 32 * DAY);
const BATCH = { id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001", user_id: USER.id, batch_no: 1, fragrance_name: "Santal Dry", tier: "woody", concentration_pct: 25, amount: 50, unit: "ml", blend_date: started.toISOString().slice(0, 10), created_at: started.toISOString(), oil_g: 11.88, ethanol_g: 30.38, total_g: 42.25, total_ml: 50, basis: "volume", batch_checkins: [] };

async function fakeApi(page, { locale = "en", me = PRO, sells = false } = {}) {
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", sells, currency: "EGP", bench_tour_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/me") return json(route, me);
    if (url.searchParams.get("resource") === "orders") return json(route, { orders: [] });
    if (url.pathname === "/api/batches") return json(route, { batches: [BATCH] });
    return json(route, {});
  });
}

const msgs = { en, ar };

for (const locale of ["en", "ar"]) {
  const m = msgs[locale];
  test(`${locale}: the bottle's fields are on the first screen, the rest folds below`, async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "the phone layout");
    // An account from after the rename sees no rename notice (renameNoticeVisible).
    await page.addInitScript(() => localStorage.setItem("kyphira.renameNoticeDismissed", "1"));
    await signIn(page);
    await fakeApi(page, { locale, me: FREE });
    await page.goto(locale === "ar" ? "/ar/bench" : "/bench");
    const sheet = page.locator("[data-tour=sheet]");
    await expect(sheet.locator("#calc-name")).toBeVisible();

    // Above the pinned result strip, with nothing scrolled.
    const strip = await page.locator("[data-quick-result]").boundingBox();
    const last = sheet.getByRole("button", { name: /Extrait/ }).first();
    for (const el of [sheet.locator("#calc-name"), sheet.locator("#calc-family"), sheet.getByRole("button", { name: "100 mL" }), last]) {
      const box = await el.boundingBox();
      expect(box.y + box.height, await el.evaluate((e) => e.outerHTML.slice(0, 60))).toBeLessThanOrEqual(strip.y);
    }
    expect(await page.evaluate(() => scrollY)).toBe(0);

    // Four bottle sizes, any other size by the stepper.
    await expect(sheet.getByRole("button", { name: /^\d+ mL$/ })).toHaveCount(4);
    await expect(sheet.getByRole("button", { name: "200 mL" })).toHaveCount(0);

    // The resting batch, orders and formulas: short lines inside the sheet, not cards on top.
    const lines = page.getByRole("navigation", { name: m.calc.onBench });
    await expect(lines.getByRole("link", { name: /Santal Dry/ })).toBeVisible();
    await expect(lines.getByRole("button", { name: m.calc.formulas.open })).toBeVisible();

    // What the scale said, then "Add details" folded, Free's price per gram inside it.
    await expect(page.getByRole("heading", { name: m.calc.scaleSaid })).toBeVisible();
    await expect(page.getByLabel(m.calc.pricePerGram)).toBeHidden();
    await page.locator("[data-add-details] summary").click();
    await expect(page.getByLabel(m.calc.pricePerGram)).toBeVisible();
    await expect(page.getByLabel(m.calc.blendedBy)).toBeVisible();

    // The flammability warning once on the page (the footer leaves it to the Bench).
    await expect(page.getByText(m.site.footer.safety)).toHaveCount(1);
    // Free's cost card on a phone: the title and the unlock, without the blurred fields.
    await expect(page.locator("[data-cost-body]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: m.calc.costCard.unlock })).toBeVisible();

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    // 5,430 px before (Arabic, Free); about 3,800 now, up to ~4,100 where Arabic falls back to taller fonts (CI).
    expect(height).toBeLessThan(4500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
}

test("Pro: prices are asked once, in the cost card; the selling fields are open for a seller", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { sells: true });
  await page.goto("/bench");
  await page.locator("[data-add-details] summary").click();
  await expect(page.getByLabel(en.calc.pricePerGram)).toHaveCount(0);
  await expect(page.getByLabel(en.calc.costCard.oilPrice)).toHaveCount(1);
  await expect(page.locator("#calc-eth-price, #calc-packaging")).toHaveCount(0);
  await expect(page.locator("[data-selling-fields]")).toHaveAttribute("open", "");
  await page.getByLabel(en.calc.costCard.oilPrice).fill("2");
  await page.getByLabel(en.calc.cost.bottleEach).fill("10");
  await page.getByLabel(en.calc.cost.salePrice).fill("60");
  await expect(page.getByText(/^Profit:/)).toBeVisible();
});

test("Pro, not selling: the selling fields are folded", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { sells: false });
  await page.goto("/bench");
  await expect(page.locator("[data-selling-fields]")).not.toHaveAttribute("open", "");
  await expect(page.getByLabel(en.calc.cost.salePrice)).toBeHidden();
});

test("the tour's link leaves the Bench once seen; the More sheet or Account starts it", async ({ page }, info) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/bench");
  await expect(page.locator("[data-tour=sheet]")).toBeVisible();
  await expect(page.getByRole("button", { name: en.tour.take })).toHaveCount(0);
  if (info.project.name === "phone") {
    await page.getByRole("navigation", { name: en.app.barLabel }).getByRole("button", { name: en.app.more }).click();
    await page.getByRole("link", { name: en.tour.again }).click();
  } else {
    await page.goto("/app/account");
    await page.getByRole("link", { name: en.tour.again }).click();
  }
  await expect(page.locator("[data-tour-card]")).toHaveAttribute("data-tour-card", "sheet");
  await expect(page).toHaveURL(/\/bench$/);
});

for (const locale of ["en", "ar"]) {
  for (const theme of ["light", "dark"]) {
    test(`axe: ${locale} ${theme}, details and selling fields open`, async ({ page }) => {
      await page.addInitScript((th) => localStorage.setItem("theme", th), theme);
      await signIn(page);
      await fakeApi(page, { locale, sells: true });
      await page.goto(locale === "ar" ? "/ar/bench" : "/bench");
      await page.locator("[data-add-details] summary").click();
      await expect(page.getByLabel(msgs[locale].calc.blendedBy)).toBeVisible();
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(axe.violations).toEqual([]);
    });
  }
}

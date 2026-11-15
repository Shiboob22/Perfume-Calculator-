import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The Journal's maturation curve and "your batches of this oil" (J3), in
// English and Arabic, light and dark: axe on both sections, no overflow, and
// (with SHOT_DIR set) the screenshots for the PR. Run at phone and desktop widths.
test.use({ serviceWorkers: "block" });

const DAY = 86400000;
const id = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${n}`;
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 3 };

function batch(n, daysAgo, pct, ratings) {
  const at = new Date(Date.now() - daysAgo * DAY - 3600000);
  const days = [0, 7, 14, 30];
  return {
    id: id(n), user_id: USER.id, batch_no: n, fragrance_name: "Oud Nights", tier: "woody", concentration_pct: pct, amount: 50, unit: "ml",
    blend_date: at.toISOString().slice(0, 10), created_at: at.toISOString(), remind: false, total_ml: 50, basis: "volume",
    batch_checkins: ratings.map((r, i) => ({ id: `${id(n)}-${i}`, day: days[i], scheduled_day: days[i], note: "x", rating: r, tags: i === 2 ? ["rounder"] : [], skipped: false, created_at: at.toISOString() })),
    shared_recipes: null,
  };
}

for (const [locale, m] of [["en", en], ["ar", ar]]) {
  for (const theme of ["light", "dark"]) {
    test(`${locale} ${theme}: the curve and the oil overlay`, async ({ page }, info) => {
      await signIn(page);
      await page.addInitScript((th) => { try { localStorage.setItem("theme", th); } catch { /* blocked */ } }, theme);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const batches = [batch(7, 40, 25, [3, 5, 4, 4]), batch(6, 60, 20, [2, 3, 4, 4]), batch(5, 90, 30, [3, 4, 4, 3])];
      await page.route(/\/(auth|rest)\/v1\//, (route) => {
        const url = route.request().url();
        if (url.includes("/auth/v1/user")) return json(route, USER);
        if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
        return json(route, []);
      });
      await page.route("**/api/**", (route) => {
        const p = new URL(route.request().url()).pathname;
        if (p === "/api/me") return json(route, PRO);
        if (p === "/api/batches") return json(route, { batches });
        return json(route, { patterns: {}, locked: false });
      });
      await page.goto(`${locale === "ar" ? "/ar" : ""}/journal?batch=${id(7)}`);
      const curve = page.locator("[data-curve]");
      const oil = page.locator("[data-oil]");
      await expect(curve.locator("[data-curve-svg]")).toBeVisible();
      await expect(oil.locator("[data-oil-svg]")).toBeVisible();
      await expect(oil.locator("[data-oil-row]")).toHaveCount(3);
      await expect(curve).toContainText(m.journal.page.curve.title);

      // Nothing runs off the screen.
      const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(wide).toBe(false);

      if (process.env.SHOT_DIR) {
        const base = `${process.env.SHOT_DIR}/${locale}-${theme}-${info.project.name}`;
        await curve.screenshot({ path: `${base}-curve.png` });
        await oil.screenshot({ path: `${base}-oil.png` });
      }
      for (const [what, include] of [["curve", "[data-curve]"], ["oil", "[data-oil]"]]) {
        const { violations } = await new AxeBuilder({ page }).include(include).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(violations.map((v) => `${what}: ${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
      }
    });
  }
}

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { USER, json, signIn } from "./helpers.js";

// Bench SaaS Phase 8 (final QA): WCAG 2.2 A/AA on the round's screens, in
// English and Arabic, light and dark: the Bench (Simple and Blend), Pour
// along (prepare, tare, a pour), the Journal room, the upgrade sheet and every
// stop of the tour. Serious and critical violations fail; the rest is noted.
test.use({ serviceWorkers: "block" });

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const batch = (n, name, tier, daysAgo) => {
  const at = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${n}`, user_id: USER.id, batch_no: n, fragrance_name: name, tier, concentration_pct: 20, amount: 50, unit: "ml",
    blend_date: iso(at), created_at: at.toISOString(), remind: false, oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: 50, basis: "volume",
    batch_checkins: n === 2 ? [{ id: "c1", day: 0, scheduled_day: 0, note: "Bright, thin.", rating: 3, tags: ["sharp"], skipped: false, created_at: at.toISOString() }] : [], shared_recipes: null,
  };
};
const FREE = { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, formulaCap: 5, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 4 };

async function setup(page, locale, theme) {
  await signIn(page);
  await page.addInitScript((th) => { try { localStorage.setItem("theme", th); } catch { /* blocked */ } }, theme);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "2026-11-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, FREE);
    if (p === "/api/batches") return json(route, { batches: [batch(4, "Amber Room", "oriental", 3), batch(3, "Neroli Eau", "fresh", 20), batch(2, "Santal Dry", "woody", 50), batch(1, "Tonka", "gourmand", 120)] });
    return json(route, {});
  });
}

const settle = (page) => page.evaluate(() => Promise.race([
  Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime)).map((a) => a.finished.catch(() => {}))),
  new Promise((r) => setTimeout(r, 1000)),
]));

async function axe(page, info, what, include) {
  await settle(page);
  let b = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);
  if (include) b = b.include(include);
  const { violations } = await b.analyze();
  const summary = violations.map((v) => `${what}: ${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target}`);
  if (summary.length) info.annotations.push({ type: "axe", description: summary.join("\n") });
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(" | ")}`), `${what}\n${summary.join("\n")}`).toEqual([]);
}

for (const [locale, m] of [["en", en], ["ar", ar]]) {
  for (const theme of ["light", "dark"]) {
    test.describe(`${locale} ${theme}`, () => {
      test.beforeEach(async ({ page }) => setup(page, locale, theme));

      test("bench (simple, blend) and the upgrade sheet", async ({ page }, info) => {
        await page.goto("/bench?size=100&unit=ml&conc=20&family=fresh&name=Neroli%20Eau");
        await page.locator("#calc-readout").waitFor();
        await axe(page, info, "bench simple");
        await page.getByRole("button", { name: m.calc.blend.blend, exact: true }).click();
        await page.getByRole("button", { name: m.calc.blend.add }).click();
        await axe(page, info, "bench blend");
        await page.getByRole("button", { name: m.upgrade.badgeFree }).click();
        await page.locator("dialog[open]").waitFor();
        await axe(page, info, "upgrade sheet", "dialog[open]");
      });

      test("pour along: prepare, tare, a pour", async ({ page }, info) => {
        await page.addInitScript(() => sessionStorage.setItem("sh-bench", JSON.stringify({
          name: "Neroli Eau", fragranceId: null, tier: "fresh", amount: 50, unit: "ml", concPct: 20, densities: { oil: 0.87, ethanol: 0.81 },
          blend: [{ name: "Bergamot", type: "eo", pct: "60" }, { name: "Hedione", type: "aroma", pct: "40" }], startedAt: 1,
        })));
        await page.goto("/app/bench");
        await page.getByRole("heading", { level: 1 }).waitFor();
        await axe(page, info, "pour prepare");
        await page.getByRole("checkbox").check();
        await page.getByRole("button", { name: m.bench.next, exact: true }).click();
        await axe(page, info, "pour tare");
        await page.getByRole("button", { name: m.bench.next, exact: true }).click();
        await page.getByRole("group", { name: m.bench.pour.sim }).waitFor();
        await axe(page, info, "pour material");
      });

      test("journal room", async ({ page }, info) => {
        await page.goto("/journal");
        await page.getByRole("heading", { level: 1 }).waitFor();
        await page.getByText("Amber Room").first().waitFor();
        await axe(page, info, "journal");
      });

      test("tour, every stop", async ({ page }, info) => {
        await page.goto("/bench?size=100&unit=ml&conc=20&family=fresh&tour=1");
        const card = page.locator("[data-tour-card]");
        for (let i = 0; i < 6; i += 1) {
          await expect(card.locator("[data-tour-count]")).toHaveText(`${i + 1} / 6`);
          await axe(page, info, `tour stop ${i + 1}`, "[data-tour-card]");
          if (i === 3) await axe(page, info, "tour pour demo", "[data-bench-demo]");
          if (i < 5) await card.locator("[data-tour-next]").click();
        }
      });
    });
  }
}

/* global process, Storage, URL, sessionStorage, localStorage, console */
// Bench SaaS Phase 8 (final QA): the round's screens, EN/AR × light/dark ×
// desktop/phone, against the served production build with a fake session
// and API (no real project). node qa-shots.mjs <out dir> [base url]
import { createRequire } from "node:module";
import fs from "node:fs";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
const OUT = process.argv[2];
const BASE = process.argv[3] || "http://localhost:4174";
fs.mkdirSync(OUT, { recursive: true });
const USER = { id: "00000000-0000-4000-8000-000000000001", email: "qa@example.test", aud: "authenticated", role: "authenticated" };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const DAY = 86400000;
const batch = (n, name, tier, daysAgo, note) => {
  const at = new Date(Date.now() - daysAgo * DAY - 3600000);
  return { id: `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${n}`, user_id: USER.id, batch_no: n, fragrance_name: name, tier, concentration_pct: 20, amount: 50, unit: "ml",
    blend_date: at.toISOString().slice(0, 10), created_at: at.toISOString(), remind: false, oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: 50, basis: "volume",
    batch_checkins: note ? [{ id: `c${n}`, day: 0, scheduled_day: 0, note, rating: 3, tags: ["sharp"], skipped: false, created_at: at.toISOString() }] : [], shared_recipes: null };
};
const BATCHES = [batch(4, "Amber Room", "oriental", 3, "Alcohol bite on top."), batch(3, "Neroli Eau", "fresh", 20, "Bright, thin."), batch(2, "Santal Dry", "woody", 50), batch(1, "Tonka Praline", "gourmand", 120)];
const FREE = { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, formulaCap: 5, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 4 };
const PLAN = { name: "Neroli Eau", fragranceId: null, tier: "fresh", amount: 50, unit: "ml", concPct: 20, densities: { oil: 0.87, ethanol: 0.81 },
  blend: [{ name: "Bergamot", type: "eo", pct: "60" }, { name: "Hedione", type: "aroma", pct: "40" }], startedAt: 1 };

const browser = await chromium.launch();
async function open(locale, theme, device) {
  const ctx = await browser.newContext({ ...(device === "phone" ? devices["Pixel 7"] : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }), colorScheme: theme, reducedMotion: "reduce", serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.addInitScript(([user, theme, plan]) => {
    const session = JSON.stringify({ access_token: "qa", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user });
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) { return /^sb-.+-auth-token$/.test(k) ? session : k === "theme" ? theme : k === "kyphira.renameNoticeDismissed" ? "1" : get.call(this, k); };
    try { sessionStorage.setItem("sh-bench", JSON.stringify(plan)); localStorage.setItem("kyphira.benchTourSeen", "1"); } catch { /* blocked */ }
  }, [USER, theme, PLAN]);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "2026-11-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, FREE);
    if (p === "/api/batches") return json(route, { batches: BATCHES });
    return json(route, {});
  });
  return { ctx, page };
}

const BENCH = "/bench?size=100&unit=ml&conc=20&family=fresh&name=Neroli%20Eau";
const SCREENS = {
  bench: async (page) => { await page.goto(BASE + BENCH); await page.locator("#calc-readout").waitFor(); },
  pour: async (page) => {
    await page.goto(BASE + "/app/bench"); await page.getByRole("checkbox").check();
    for (let i = 0; i < 2; i += 1) await page.locator("main ~ * button, footer button, button").filter({ hasText: /^(Next|التالي)$/ }).last().click();
  },
  journal: async (page) => { await page.goto(BASE + "/journal"); await page.getByText("Amber Room").first().waitFor(); },
  upgrade: async (page) => { await SCREENS.bench(page); await page.locator("[data-plan]").first().click(); await page.locator("dialog[open]").waitFor(); },
  tour: async (page) => { await page.goto(BASE + BENCH + "&tour=1"); await page.locator("[data-tour-card]").waitFor(); },
};

for (const [name, go] of Object.entries(SCREENS)) for (const device of ["desktop", "phone"]) for (const locale of ["en", "ar"]) for (const theme of ["light", "dark"]) {
  const { ctx, page } = await open(locale, theme, device);
  try {
    await go(page);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}-${device}-${locale}-${theme}.png` });
  } catch (e) { console.log(`FAIL ${name} ${device} ${locale} ${theme}: ${e.message.split("\n")[0]}`); }
  await ctx.close();
}
await browser.close();

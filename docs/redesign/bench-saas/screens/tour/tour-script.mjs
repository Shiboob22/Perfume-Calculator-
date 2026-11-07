/* global process, Storage, URL */
// Phase 7 tour: a screenshot per stop (EN/AR, desktop/phone, light/dark) and a recording of the walk.
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
const OUT = process.argv[2];
const BASE = process.argv[3] || "http://localhost:4174";
const VIDEO = process.argv[4];
fs.mkdirSync(OUT, { recursive: true });
const USER = { id: "00000000-0000-4000-8000-000000000001", email: "e2e@example.test", aud: "authenticated", role: "authenticated" };
const FREE = { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, formulaCap: 5, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 2 };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const STOPS = ["sheet", "blend", "scale", "pour", "cost", "upgrade"];
const browser = await chromium.launch();

async function setup({ locale, theme, device, reduce = true, video = null }) {
  const ctx = await browser.newContext({ ...(device === "phone" ? devices["Pixel 7"] : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: video ? 1 : 2 }), colorScheme: theme, reducedMotion: reduce ? "reduce" : "no-preference", serviceWorkers: "block", ...(video ? { recordVideo: { dir: video, size: { width: 1280, height: 800 } }, viewport: { width: 1280, height: 800 } } : {}) });
  const page = await ctx.newPage();
  await page.addInitScript(([user, theme]) => {
    const session = JSON.stringify({ access_token: "e2e", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user });
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) { return /^sb-.+-auth-token$/.test(k) ? session : k === "theme" ? theme : k === "kyphira.renameNoticeDismissed" ? "1" : get.call(this, k); };
  }, [USER, theme]);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return route.request().method() === "GET" ? json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: null }]) : json(route, { locale, onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "x" });
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, FREE);
    if (p === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
  await page.goto(`${BASE}/bench?size=100&unit=ml&conc=20&family=fresh&name=Neroli%20Eau`);
  await page.locator("[data-tour-card]").waitFor();
  return { ctx, page };
}

if (!VIDEO) {
  for (const device of ["desktop", "phone"]) for (const locale of ["en", "ar"]) for (const theme of ["light", "dark"]) {
    if (theme === "dark" && device === "phone" && locale === "en") continue;
    const { ctx, page } = await setup({ locale, theme, device });
    for (let i = 0; i < STOPS.length; i += 1) {
      await page.waitForTimeout(500);
      if (i === 0 || theme === "light") await page.screenshot({ path: `${OUT}/tour-${i + 1}-${STOPS[i]}-${device}-${locale}-${theme}.png` });
      if (i < STOPS.length - 1) await page.locator("[data-tour-next]").click();
    }
    await ctx.close();
  }
} else {
  const { ctx, page } = await setup({ locale: "en", theme: "light", device: "desktop", reduce: false, video: VIDEO });
  for (let i = 0; i < STOPS.length; i += 1) {
    await page.waitForTimeout(i === 4 ? 2200 : 1700);
    await page.locator("[data-tour-next]").click();
  }
  await page.waitForTimeout(1200);
  await ctx.close();
}
await browser.close();

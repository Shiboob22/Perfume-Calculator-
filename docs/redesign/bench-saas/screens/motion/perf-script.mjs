// Bench SaaS Phase 6: frame timings on a mid-range Android profile (Pixel 7, 4x CPU throttle) and the
// recording, against the served production build with a fake session and API (no real project).
// Run: node perf-script.mjs <outdir>, with `PORT=4174 node scripts/serve-dist.mjs` serving dist/.
/* global process, Storage, URL, window, PerformanceObserver, requestAnimationFrame, console, setInterval, clearInterval */
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
const USER = { id: "00000000-0000-4000-8000-000000000001", email: "e2e@example.test", aud: "authenticated", role: "authenticated" };
const FREE = { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, formulaCap: 5, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 2 };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:4174";
const m = (await import("/home/user/Perfume-Calculator-/src/i18n/messages/en.js")).default;
const browser = await chromium.launch();

async function open(ctxOpts) {
  const ctx = await browser.newContext({ serviceWorkers: "block", ...ctxOpts });
  const page = await ctx.newPage();
  await page.addInitScript(([user]) => {
    const session = JSON.stringify({ access_token: "e2e", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user });
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) { return /^sb-.+-auth-token$/.test(k) ? session : k === "kyphira.renameNoticeDismissed" ? "1" : get.call(this, k); };
  }, [USER]);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, FREE);
    if (p === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
  await page.goto(`${BASE}/bench?size=30&unit=ml&conc=15&family=woody`);
  await page.getByRole("spinbutton", { name: m.calc.batchSize }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 560));
  await page.waitForTimeout(800);
  return { ctx, page };
}
const hold = async (page, name, ms) => {
  await page.getByRole("button", { name }).hover();
  await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up();
};
const script = async (page) => {
  await hold(page, m.calc.stepper.concMore, 1800); // 15% → ~27%: digits keep rolling, oil darkens by tier
  await page.waitForTimeout(900);
  await hold(page, /^Add \d+ mL$/, 2200); // the bottle grows
  await page.waitForTimeout(900);
  for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: m.calc.stepper.concLess }).click(); await page.waitForTimeout(700); }
  await page.getByRole("spinbutton", { name: m.calc.batchSize }).fill("10"); // shrinks to the smallest
  await page.waitForTimeout(1000);
};

// 1. Performance: Pixel 7 profile with DevTools' mid-tier mobile CPU throttle (4×).
{
  const { ctx, page } = await open({ ...devices["Pixel 7"] });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Performance.enable");
  const metric = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  await page.evaluate(() => {
    window.__f = []; window.__lt = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ type: "longtask", buffered: false });
    const loop = (t) => { window.__f.push(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  });
  const before = await metric();
  await script(page);
  const after = await metric();
  const { f, lt } = await page.evaluate(() => ({ f: window.__f, lt: window.__lt }));
  const d = f.slice(1).map((t, i) => t - f[i]).sort((a, b) => a - b);
  const q = (p) => d[Math.min(d.length - 1, Math.floor(p * d.length))];
  const span = (f[f.length - 1] - f[0]) / 1000;
  const res = {
    profile: "Pixel 7 viewport + 4x CPU throttle (DevTools mid-tier mobile), headless Chromium",
    seconds: +span.toFixed(2), frames: f.length, avgFps: +(f.length / span).toFixed(1),
    medianMs: +q(0.5).toFixed(2), p95Ms: +q(0.95).toFixed(2), p99Ms: +q(0.99).toFixed(2), maxMs: +d[d.length - 1].toFixed(2),
    over25ms: d.filter((x) => x > 25).length, over33ms: d.filter((x) => x > 33.4).length,
    longTasks: lt.length, longTaskMaxMs: lt.length ? +Math.max(...lt).toFixed(1) : 0,
    layouts: after.LayoutCount - before.LayoutCount, styleRecalcs: after.RecalcStyleCount - before.RecalcStyleCount,
    layoutMs: +((after.LayoutDuration - before.LayoutDuration) * 1000).toFixed(1), scriptMs: +((after.ScriptDuration - before.ScriptDuration) * 1000).toFixed(1),
  };
  fs.writeFileSync(`${OUT}/perf.json`, JSON.stringify(res, null, 2));
  console.log(res);
  await ctx.close();
}

// 2. Recording: desktop, no throttle, the instrument cropped later.
{
  const { ctx, page } = await open({ viewport: { width: 1280, height: 1500 }, recordVideo: { dir: OUT, size: { width: 1280, height: 1500 } } });
  const boxes = [];
  const t = setInterval(async () => { try { boxes.push(await page.locator("[data-instrument]").boundingBox()); } catch {} }, 500);
  await script(page);
  clearInterval(t);
  fs.writeFileSync(`${OUT}/box.json`, JSON.stringify(boxes));
  const v = page.video();
  await ctx.close();
  fs.renameSync(await v.path(), `${OUT}/bench.webm`);
}
await browser.close();

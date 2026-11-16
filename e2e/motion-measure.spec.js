import { test, expect } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import en from "../src/i18n/messages/en.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Motion M6, the numbers for the submission (lab, not field: D7). Runs only
// with MOTION_MEASURE=1, alone (a busy machine skews every figure), desktop
// Chromium with the CPU slowed 4x:
//   - response to a tap (INP proxy): the longest Event Timing entry per room;
//   - layout shift (as CLS counts it) per room, from load through the taps;
//   - frame rate while the signature plays.
// Writes docs/redesign/motion/m6/numbers.json. Headless, software rendering,
// shared CPU: indicative, never a pass mark (the only assertion is that each
// measurement produced data).
test.use({ serviceWorkers: "block" });
test.skip(!process.env.MOTION_MEASURE, "set MOTION_MEASURE=1 to measure");

const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };
const DAY = 86400000;
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bid = (n) => `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`;
const batch = (n) => {
  const started = new Date(Date.now() - (1 + n * 3) * DAY - 3600000);
  return {
    id: bid(n), user_id: USER.id, batch_no: n, fragrance_name: `Batch ${n}`, tier: "woody", concentration_pct: 20, amount: 10 + ((n * 37) % 90), unit: "ml",
    blend_date: localDate(started), created_at: started.toISOString(), remind: false,
    oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: 10 + ((n * 37) % 90), basis: "volume", batch_checkins: [], shared_recipes: null,
  };
};
const BATCHES = Array.from({ length: 24 }, (_, i) => batch(i + 1));

async function fakeApi(page) {
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    if (url.includes("/rest/v1/rpc/ensure_fragrance")) return json(route, [{ id: "22222222-2222-4222-8222-222222222222", name: "Oud Nights", tier: "woody" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/me") return json(route, PRO);
    if (path === "/api/batches" && req.method() === "POST") return json(route, { success: true, batch: { ...req.postDataJSON(), user_id: USER.id, batch_no: 72 } }, 201);
    if (path === "/api/batches") return json(route, { batches: BATCHES });
    if (path === "/api/checkins") return json(route, { patterns: {}, locked: false });
    return json(route, {});
  });
}

const observe = (page) => page.addInitScript(() => {
  localStorage.setItem("kyphira.flag.motion", "1");
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  window.__ev = [];
  window.__ls = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__ev.push({ name: e.name, d: e.duration }); }).observe({ type: "event", durationThreshold: 16, buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__ls.push(e.value); }).observe({ type: "layout-shift", buffered: true });
});
const read = (page) => page.evaluate(() => ({
  inp: Math.round(Math.max(0, ...window.__ev.map((e) => e.d))),
  taps: window.__ev.length,
  cls: Math.round(window.__ls.reduce((a, b) => a + b, 0) * 1000) / 1000,
}));

// Each room: where it opens, and the taps a person makes there.
const ROOMS = [
  ["bench", "/bench?size=50&unit=ml&conc=25&family=woody&name=Oud%20Nights", async (page) => {
    // The four strength tiers: tap three of them.
    const tiers = page.getByRole("group", { name: en.calc.tiers.label }).first().getByRole("button");
    for (const i of [1, 3, 0]) await tiers.nth(i).click();
  }],
  ["journal", "/journal", async (page) => {
    const chips = page.getByRole("group", { name: en.journal.page.sort.label });
    await chips.getByRole("button", { name: en.journal.page.sort.size, exact: true }).click();
    await chips.getByRole("button", { name: en.journal.page.sort.new, exact: true }).click();
    await page.locator(`button[data-batch="${bid(5)}"]`).click();
  }],
  // The header's plan badge opens the upgrade sheet (a modal <dialog> rising).
  ["planSheet", "/bench/journal", async (page) => { await page.locator("button[data-plan]").first().click(); await page.waitForTimeout(500); await page.keyboard.press("Escape"); }],
  ["account", "/app/account", async (page) => {
    const g = page.getByRole("group", { name: en.settings.motion.label }).last();
    await g.getByText(en.settings.motion.calm, { exact: true }).click();
    await g.getByText(en.settings.motion.full, { exact: true }).click();
  }],
  ["guides", "/library", async (page) => {
    await page.getByRole("button", { name: en.site.guides.tabs.glossary }).click();
    await page.getByRole("button", { name: en.site.guides.tabs.essays }).click();
  }],
];

test("motion numbers: response, layout shift, signature frame rate (4x CPU)", async ({ page, browserName }, info) => {
  test.skip(info.project.name !== "desktop" || browserName !== "chromium", "one CDP measurement");
  test.setTimeout(180000);
  await observe(page);
  await signIn(page);
  await fakeApi(page);
  const cdp = await page.context().newCDPSession(page);
  const rooms = {};
  page.setDefaultTimeout(8000);
  for (const [name, url, act] of ROOMS) {
    await page.goto(url);
    await page.waitForTimeout(1200);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await act(page);
    await page.waitForTimeout(800);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    rooms[name] = await read(page);
    console.log(name, JSON.stringify(rooms[name]));
  }

  // The signature, from a log on the Bench: frame gaps while the bottle is on screen.
  await page.goto("/bench?size=50&unit=ml&conc=25&family=woody&name=Oud%20Nights");
  const log = page.getByRole("button", { name: en.calc.log, exact: true });
  await log.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    window.__frames = [];
    const tick = (t) => { if (document.querySelector("[data-mo-signature]")) window.__frames.push(t); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await log.click();
  await page.waitForTimeout(2000);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const frames = await page.evaluate(() => window.__frames);
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  const signature = gaps.length
    ? { frames: frames.length, fps: Math.round(10000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)) / 10, worstFrameMs: Math.round(Math.max(...gaps)) }
    : { frames: 0 };

  const out = { measured: new Date().toISOString(), setup: "Playwright Chromium headless, desktop 1280x720, software rendering, CPU throttled 4x via CDP, fake API", rooms, signature };
  mkdirSync("docs/redesign/motion/m6", { recursive: true });
  writeFileSync("docs/redesign/motion/m6/numbers.json", `${JSON.stringify(out, null, 2)}\n`);
  info.annotations.push({ type: "numbers", description: JSON.stringify(out) });
  console.log(JSON.stringify(out, null, 2));
  expect(Object.keys(rooms)).toHaveLength(ROOMS.length);
  expect(signature.frames).toBeGreaterThan(3);
});

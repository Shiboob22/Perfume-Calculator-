import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Motion M3, hold: loading keeps the shape of the page, a re-sort is shown
// (rows slide to their places), the nav badge settles, and a quick note is
// saved optimistically (and put back if the server refuses it). Against the
// production build with a fake session and a fake API.
test.use({ serviceWorkers: "block" });

const p = en.journal.page;
const DAY = 86400000;
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bid = (n) => `bbbbbbbb-bbbb-4bbb-8bbb-${String(n).padStart(12, "0")}`;
function batch(n, daysAgo, ml = 50) {
  const started = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: bid(n), user_id: USER.id, batch_no: n, fragrance_name: `Batch ${n}`, tier: "woody", concentration_pct: 20, amount: ml, unit: "ml",
    blend_date: localDate(started), created_at: started.toISOString(), remind: false,
    oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: ml, basis: "volume", batch_checkins: [], shared_recipes: null,
  };
}
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };

async function fakeApi(page, { batches, batchesDelay = 0, checkin = () => ({ status: 201 }) } = {}) {
  const sent = [];
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/me") return json(route, PRO);
    if (path === "/api/batches") {
      if (batchesDelay) await new Promise((r) => setTimeout(r, batchesDelay));
      return json(route, { batches });
    }
    if (path === "/api/checkins" && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.push(body);
      const { status, delay = 0 } = checkin(body);
      if (delay) await new Promise((r) => setTimeout(r, delay));
      if (status >= 400) return json(route, { error: "refused", code: "refused" }, status);
      const row = { ...body };
      delete row.upsert;
      return json(route, { checkin: { ...row, skipped: false, created_at: new Date().toISOString() } }, 201);
    }
    if (path === "/api/checkins") return json(route, { patterns: {}, locked: false });
    return json(route, {});
  });
  return sent;
}

const motion = (page) => page.addInitScript(() => {
  localStorage.setItem("kyphira.flag.motion", "1");
  window.__shifts = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shifts.push({ value: e.value, recent: e.hadRecentInput, t: e.startTime }); }).observe({ type: "layout-shift", buffered: true });
});
// The slides running on list rows right now: { key, duration, from }.
const slides = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => a.effect?.target?.hasAttribute?.("data-flip"))
  .map((a) => ({ key: a.effect.target.getAttribute("data-flip"), duration: a.effect.getTiming().duration, from: a.effect.getKeyframes()[0].transform ?? null })));
const sortChip = (page, name) => page.getByRole("group", { name: p.sort.label }).getByRole("button", { name, exact: true });

test("a re-sort of the Journal slides the rows to their places on the base step", async ({ page }) => {
  await motion(page);
  await signIn(page);
  await fakeApi(page, { batches: [batch(1, 80, 100), batch(2, 40, 30), batch(3, 20, 50), batch(4, 5, 10)] });
  await page.goto("/journal");
  await expect(page.locator("[data-flip]")).toHaveCount(4);
  await sortChip(page, p.sort.size).click();
  await expect.poll(async () => (await slides(page)).length).toBeGreaterThan(0);
  const moving = await slides(page);
  for (const s of moving) {
    expect(s.duration).toBe(250);
    expect(s.from).toMatch(/^translate\(/);
  }
  // Largest first: 100, 50, 30, 10 mL.
  const order = await page.locator("[data-flip]").evaluateAll((els) => els.map((e) => e.getAttribute("data-flip")));
  expect(order).toEqual([bid(1), bid(3), bid(2), bid(4)]);
});

test("reduced motion: a re-sort is a plain swap", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await motion(page);
  await signIn(page);
  await fakeApi(page, { batches: [batch(1, 80, 100), batch(2, 40, 30), batch(3, 20, 50)] });
  await page.goto("/journal");
  await expect(page.locator("[data-flip]")).toHaveCount(3);
  await sortChip(page, p.sort.size).click();
  await expect(page.locator("[data-flip]").first()).toHaveAttribute("data-flip", bid(1));
  expect(await slides(page)).toEqual([]);
});

test("while the Journal loads, its rows hold their shape and nothing shifts when they arrive", async ({ page }) => {
  await motion(page);
  await signIn(page);
  await fakeApi(page, { batches: [batch(1, 80), batch(2, 40), batch(3, 20)], batchesDelay: 1200 });
  await page.goto("/journal");
  const skeleton = page.locator("[data-skeleton]");
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute("role", "status");
  await expect(skeleton).toContainText(en.app.loading);
  const since = await page.evaluate(() => performance.now());
  await expect(page.locator("[data-flip]")).toHaveCount(3);
  await expect(skeleton).toHaveCount(0);
  await page.waitForTimeout(300);
  const cls = await page.evaluate((t0) => window.__shifts.filter((s) => !s.recent && s.t >= t0).reduce((a, s) => a + s.value, 0), since);
  expect(cls).toBe(0);
});

test("a quick note is in the Journal at once, then saved; the badge settles to the new count", async ({ page }) => {
  await motion(page);
  await signIn(page);
  const sent = await fakeApi(page, { batches: [batch(1, 8), batch(2, 15)], checkin: () => ({ status: 201, delay: 1500 }) });
  await page.goto("/journal");
  const strip = page.getByRole("region", { name: p.todayStrip.title });
  const card = strip.locator(`[data-today-card="${bid(1)}"]`);
  await card.getByRole("button", { name: p.todayStrip.add }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: en.journal.page.ratingN.other.replace("{count}", "4") }).click();
  await sheet.getByRole("button", { name: p.save, exact: true }).click();
  // Before the server answers: the sheet is gone, the card is gone, the strip says it is saving.
  await expect(sheet).toBeHidden();
  await expect(card).toHaveCount(0);
  await expect(strip.locator('[data-save-state="working"]')).toBeVisible();
  expect(sent).toHaveLength(1);
  await expect(strip.locator('[data-save-state="saved"]')).toBeVisible({ timeout: 5000 });
  const badge = page.locator("[data-badge]").first();
  await expect(badge).toHaveClass(/kx-settle/);
});

test("a note the server refuses comes back out, with its words kept for the next try", async ({ page }) => {
  await motion(page);
  await signIn(page);
  await fakeApi(page, { batches: [batch(1, 8)], checkin: () => ({ status: 403, delay: 300 }) });
  await page.goto("/journal");
  const strip = page.getByRole("region", { name: p.todayStrip.title });
  const card = strip.locator(`[data-today-card="${bid(1)}"]`);
  await card.getByRole("button", { name: p.todayStrip.add }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("textbox").fill("Cedar coming through.");
  await sheet.getByRole("button", { name: p.save, exact: true }).click();
  await expect(card).toHaveCount(0);
  await expect(strip.locator('[data-save-state="failed"]')).toBeVisible();
  await expect(card).toHaveCount(1);
  await card.getByRole("button", { name: p.todayStrip.add }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("Cedar coming through.");
});

test("a re-sort of 60 batches on a 4x slower CPU: frame rate measured", async ({ page, browserName }, info) => {
  test.skip(info.project.name !== "desktop" || browserName !== "chromium", "one CDP measurement is enough");
  await motion(page);
  await signIn(page);
  await fakeApi(page, { batches: Array.from({ length: 60 }, (_, i) => batch(i + 1, 1 + i, 10 + ((i * 37) % 90))) });
  await page.goto("/journal");
  await expect(page.locator("[data-flip]")).toHaveCount(60);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const frames = page.evaluate(() => new Promise((resolve) => {
    const times = [];
    const t0 = performance.now();
    const tick = (t) => { times.push(t); if (t - t0 < 600) requestAnimationFrame(tick); else resolve(times); };
    requestAnimationFrame(tick);
  }));
  await sortChip(page, p.sort.size).click();
  const times = await frames;
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  // The longest frame is the re-render of the list itself (React, 60 rows); the others are the slide.
  const worst = Math.max(...gaps);
  const slide = gaps.filter((g, i) => i !== gaps.indexOf(worst));
  const fps = (list) => 1000 / (list.reduce((a, b) => a + b, 0) / list.length);
  const line = `${fps(gaps).toFixed(1)} fps overall, ${fps(slide).toFixed(1)} fps during the slide, re-render frame ${worst.toFixed(1)} ms`;
  info.annotations.push({ type: "fps", description: line });
  console.log(`M3 re-sort of 60 batches at 4x CPU: ${line}`);
  // A measurement for the report (headless, software rendering, shared CPU), not a pass mark: it must keep moving.
  expect(slide.length).toBeGreaterThan(5);
});

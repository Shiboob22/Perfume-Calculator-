import { test, expect } from "@playwright/test";
import { FEATURES } from "../src/lib/entitlements.js";
import en from "../src/i18n/messages/en.js";
import { USER, json, signIn } from "./helpers.js";

test.use({ serviceWorkers: "block" });

// Room motion (flags `motion` + `roommotion`), against the production build
// with a fake session and an empty fake API: no console errors in any room,
// the first screen is never hidden, reduced motion never fetches GSAP, Lenis
// runs only where the allowlist says, and two earlier-review items (the
// Batches list Flip, the Wardrobe answer words) end fully visible.
// Desktop project only: widths are set per test (375 / 1440, fine pointer).

const ON = "?flag=motion&flag=roommotion";
const ROOMS = ["/bench", "/journal", "/ar/journal", "/wardrobe", "/atlas", "/salon", "/nose", "/app/selector"];
const GSAP_ROOMS = ["/bench", "/journal", "/ar/journal", "/wardrobe", "/salon"]; // the rooms whose scenes fetch GSAP with the fake API
const idFor = (n) => `77777777-7777-4777-8777-${String(n).padStart(12, "0")}`;
const BATCHES = ["Oud Nights", "Amber Dusk"].map((name, i) => ({
  id: `11111111-1111-4111-8111-00000000000${i + 1}`, user_id: USER.id, fragrance_id: null, fragrance_name: name, tier: "woody", concentration_pct: 25,
  blend_date: `2026-09-0${i + 1}`, created_at: `2026-09-0${i + 1}T10:00:00Z`, amount: 50, unit: "ml", lot: null, batch_no: i + 1,
  oil_g: 11.875, oil_ml: 12.5, ethanol_g: 30.375, ethanol_ml: 37.5, total_g: 42.25, total_ml: 50, basis: "volume",
  oil_density: 0.95, ethanol_density: 0.81, batch_checkins: [], shared_recipes: null,
}));
const BOTTLES = [["Citrus Day", "fresh"], ["Amber Night", "oriental"]].map(([name, family], i) => ({
  id: idFor(i + 1), user_id: USER.id, status: "owned", kind: "bottle", clusters: [], projection: null, fill_pct: null, size_ml: null, price: null,
  currency: null, note: null, purchase_date: null, fragrance_id: null, family, name, created_at: "2026-10-14T00:00:00Z", updated_at: "2026-10-14T00:00:00Z",
}));

async function setup(page, { locale = "en", batches = [], bottles = [] } = {}) {
  await signIn(page);
  await page.addInitScript(() => {
    ["wardrobe", "atlas", "salon", "nose"].forEach((n) => localStorage.setItem(`kyphira.flag.${n}`, "1"));
    localStorage.setItem("kyphira.benchTourSeen", "1");
  });
  const live = { batches: batches.map((b) => ({ ...b })) };
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = req.url();
    const one = (req.headers().accept || "").includes("pgrst.object");
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) {
      const row = { locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "2026-10-01T00:00:00Z", wear_stats_opt_in: false };
      return json(route, one ? row : [row]);
    }
    if (url.includes("/rest/v1/wardrobe_bottles") && req.method() === "GET") return json(route, bottles);
    return json(route, one ? null : []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    if (p === "/api/me") return json(route, { plan: "free", name: "Free", features: FEATURES.slice(0, 1), batchCap: 25, batchesUsed: live.batches.length });
    if (p === "/api/batches" && req.method() === "GET") return json(route, { batches: live.batches });
    if (p === "/api/batches" && req.method() === "DELETE") {
      const id = new URL(req.url()).searchParams.get("id") ?? req.postDataJSON?.()?.id;
      live.batches = live.batches.filter((b) => b.id !== id);
      return json(route, { success: true });
    }
    return json(route, {});
  });
  return live;
}

// Console errors only; a blocked or empty fake answer is not one.
const watchErrors = (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  return errors;
};

// eslint-disable-next-line no-unused-vars -- Playwright insists on a destructured first argument
test.beforeEach(({ page }, testInfo) => test.skip(testInfo.project.name !== "desktop", "viewport is set per test on the desktop project"));

for (const width of [375, 1440]) {
  for (const room of ROOMS) {
    test(`${room} at ${width}: no console errors, first screen shown at once`, async ({ page }) => {
      const errors = watchErrors(page);
      let chunks = 0;
      page.on("response", (r) => { if (/\/assets\/gsap-/.test(r.url())) chunks++; });
      await setup(page, { locale: room.startsWith("/ar/") ? "ar" : "en" });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${room}${ON}`);
      await page.locator("h1, h2").first().waitFor({ state: "attached" });
      // Rooms that load GSAP: the three chunks must arrive (up to 2 s), then settle, so a scene that hides start states after load is caught. Other rooms are checked as is.
      if (GSAP_ROOMS.includes(room)) {
        await expect.poll(() => chunks, { timeout: 2000 }).toBe(3);
        await page.waitForTimeout(300);
      }
      // Every heading, control and link on the first screen is at full opacity (itself and its ancestors; decorative light and spans are not text of record).
      const hidden = await page.evaluate(() => [...document.querySelectorAll("h1, main h2, main h3, main button, main a, main input, main select, main textarea, main label")].filter((el) => {
        const r = el.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && r.top < innerHeight)) return false;
        for (let n = el; n && n !== document.body; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 1) return true;
        return false;
      }).map((el) => el.tagName + "." + String(el.className).slice(0, 40)));
      expect(hidden).toEqual([]);
      await page.waitForTimeout(800);
      expect(errors).toEqual([]);
    });
  }
}

test("reduced motion: no GSAP chunk is requested in any room", async ({ page }) => {
  const gsap = [];
  page.on("request", (r) => { if (/\/assets\/gsap-/.test(r.url())) gsap.push(r.url()); });
  await setup(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const room of ROOMS) { await page.goto(`${room}${ON}`); await page.locator("h1, h2").first().waitFor({ state: "attached" }); await page.waitForTimeout(400); }
  expect(gsap).toEqual([]);
});

test("motion on: the three GSAP chunks are fetched on the Bench (the reduced-motion regex can match)", async ({ page }) => {
  const gsap = [];
  page.on("request", (r) => { if (/\/assets\/gsap-/.test(r.url())) gsap.push(r.url()); });
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/bench${ON}`); // the Bench mounts scenes at once; the Atlas landing has none
  await expect.poll(() => gsap.length).toBe(3);
});

test("Lenis: on at 1440 /atlas and /library, off on /bench and at 375, stopped while a Sheet is open", async ({ page }) => {
  await setup(page);
  const has = (cls) => page.evaluate((c) => document.documentElement.classList.contains(c), cls);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/atlas${ON}`);
  await expect.poll(() => has("lenis")).toBe(true);
  await page.goto(`/library${ON}`);
  await expect.poll(() => has("lenis")).toBe(true);
  await page.goto(`/atlas${ON}`);
  await expect.poll(() => has("lenis")).toBe(true);
  // The plan badge opens the upgrade sheet (a kx/Sheet) from any app page. A sheet pauses Lenis by
  // destroying it (smooth.js halt), so the brief's `lenis-stopped` never shows: the class `lenis` goes instead.
  await page.getByRole("button", { name: /upgrade/i }).first().click();
  await expect.poll(() => has("lenis")).toBe(false);
  await page.keyboard.press("Escape");
  await expect.poll(() => has("lenis")).toBe(true);

  await page.goto("/bench");
  await page.locator("h1, h2").first().waitFor({ state: "attached" });
  await page.waitForTimeout(800);
  expect(await has("lenis")).toBe(false);

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/atlas");
  await page.locator("h1, h2").first().waitFor({ state: "attached" });
  await page.waitForTimeout(800);
  expect(await has("lenis")).toBe(false);
});

// Review focus 5: ScrollTrigger is not exposed on window in the build, so this asserts only that leaving a room
// straight after load throws nothing.
test("leaving /atlas for /bench within 200 ms raises no error", async ({ page }) => {
  const errors = watchErrors(page);
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/atlas${ON}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(150);
  await page.evaluate(() => { history.pushState({}, "", "/bench"); dispatchEvent(new PopStateEvent("popstate")); });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test("Batches list: after a delete the rows are in visual order with no leftover transform", async ({ page }) => {
  await setup(page, { batches: BATCHES });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/bench/journal${ON}`);
  const rows = page.locator("nav li[data-flip]");
  await expect(rows).toHaveCount(2);
  await page.getByRole("button", { name: en.batches.delete }).first().click();
  await page.getByRole("button", { name: en.batches.delete }).first().click();
  await expect(rows).toHaveCount(1);
  await page.waitForTimeout(1000);
  const state = await rows.evaluateAll((els) => els.map((e) => ({ transform: getComputedStyle(e).transform, top: e.getBoundingClientRect().top })));
  for (const s of state) expect(s.transform).toBe("none");
  expect(state.map((s) => s.top)).toEqual([...state.map((s) => s.top)].sort((a, b) => a - b));
});

test("Wardrobe Tonight: the answer's words are fully visible 1 s after choosing an occasion", async ({ page }) => {
  await setup(page, { bottles: BOTTLES });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/wardrobe${ON}`);
  await page.getByRole("button", { name: en.wardrobe.tabs.today }).click();
  await page.getByLabel(en.wardrobe.today.temp).fill("5");
  await page.getByRole("button", { name: en.wardrobe.occasions.date }).click();
  await page.waitForTimeout(1000);
  const words = page.locator("#today-answer [data-word]");
  expect(await words.count()).toBeGreaterThan(0);
  expect(await words.evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity))).toEqual(Array(await words.count()).fill("1"));
});

import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

// The home page's 3D pour (src/site/compounding/hero3d), against the
// production build. It needs both the `compounding` and `hero3d` device
// flags; without them, or under reduced motion, on a low-power device or
// without WebGL, the static reading stage stays.

const flags = (page, names = ["compounding", "hero3d"]) =>
  page.addInitScript((list) => {
    for (const n of list) localStorage.setItem(`kyphira.flag.${n}`, "1");
    // A test machine may report few cores; the gate would call it low power.
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  }, names);
const noWebGL = (page) => page.addInitScript(() => {
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/.test(type) ? null : get.call(this, type, ...a); };
});
// Whether this browser can draw WebGL at all (headless Chrome usually can, via SwiftShader).
const webgl = (page) => page.evaluate(() => { const c = document.createElement("canvas"); return Boolean(c.getContext("webgl2") || c.getContext("webgl")); });
const hero = (page) => page.locator("[data-hero3d]");
// Scrolls the pinned track to progress p and waits a frame.
const toP = (page, p) => page.evaluate(async (v) => {
  const t = document.querySelector("[data-hero3d]");
  const top = t.getBoundingClientRect().top + scrollY;
  scrollTo(0, top + v * (t.offsetHeight - innerHeight));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}, p);
const readout = (page) => page.locator("[data-hero3d] .h3-read span.text-\\[22px\\]").textContent();

test("the prerendered home page is the static stage, whatever the flags say", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toContain("data-hero3d");
  expect(html).toMatch(/<h1[ >]/);
});

test("flag off: the static reading stage and the weighing stay", async ({ page }) => {
  await flags(page, ["compounding"]);
  await page.goto("/");
  await page.locator('[data-stage="reading"] h1').waitFor();
  await page.waitForTimeout(1500);
  await expect(hero(page)).toHaveCount(0);
  await expect(page.locator('[data-stage="weigh"]')).toHaveCount(1);
});

test("reduced motion keeps the static stage", async ({ page }) => {
  await flags(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForTimeout(1500);
  await expect(hero(page)).toHaveCount(0);
  await expect(page.locator('[data-stage="reading"] h1')).toBeVisible();
});

test("no WebGL keeps the static stage", async ({ page }) => {
  await flags(page);
  await noWebGL(page);
  await page.goto("/");
  await page.waitForTimeout(1500);
  await expect(hero(page)).toHaveCount(0);
});

test.describe("flags on, with WebGL", () => {
  test.beforeEach(async ({ page }) => {
    await flags(page);
    // Layout shifts around the moment the pour swaps in (the device flags also switch
    // the plain home page to the scene after load; that shift is not the pour's).
    await page.addInitScript(() => {
      window.__shifts = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shifts.push([e.startTime, e.value]); }).observe({ type: "layout-shift", buffered: true });
      new MutationObserver((_, mo) => { if (document.querySelector("[data-hero3d]")) { window.__swap = performance.now(); mo.disconnect(); } }).observe(document, { childList: true, subtree: true });
    });
    await page.goto("/");
    test.skip(!(await webgl(page)), "this browser has no WebGL");
    await hero(page).locator("canvas").waitFor({ timeout: 15000 });
  });

  test("swaps in without a layout shift and keeps one headline", async ({ page }) => {
    await page.waitForTimeout(600);
    const cls = await page.evaluate(() => window.__shifts.filter(([t]) => t >= window.__swap - 20 && t <= window.__swap + 500).reduce((a, [, v]) => a + v, 0));
    expect(cls).toBeLessThan(0.01);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("#h3-title")).toBeVisible();
    // The pour tells the weighing, so the old pinned weighing is gone.
    await expect(page.locator('[data-stage="weigh"]')).toHaveCount(0);
  });

  test("the scale reads 0, the oil, 0 again, then the batch; both ways land on the same figure", async ({ page }) => {
    await toP(page, 0.05);
    expect(await readout(page)).toBe("0.00");
    await toP(page, 0.459);
    expect(Number(await readout(page))).toBeCloseTo(23.75, 0);
    await toP(page, 0.48);
    expect(await readout(page)).toBe("0.00");
    await toP(page, 1);
    expect(await readout(page)).toBe("84.50");
    await toP(page, 0.6);
    const down = await readout(page);
    await toP(page, 0.2);
    await toP(page, 0.6);
    expect(await readout(page)).toBe(down);
  });

  test("the dials snap to the named strengths and sizes, and the Bench link carries them", async ({ page }) => {
    const strength = page.getByRole("slider").first();
    await strength.focus();
    await page.keyboard.press("ArrowUp");
    await expect(strength).toHaveAttribute("aria-valuenow", "30");
    await page.keyboard.press("Home");
    await expect(strength).toHaveAttribute("aria-valuenow", "15");
    await page.keyboard.press("ArrowUp");
    await expect(strength).toHaveAttribute("aria-valuenow", "20");
    const size = page.getByRole("slider").nth(1);
    await size.focus();
    await page.keyboard.press("ArrowDown");
    await expect(size).toHaveAttribute("aria-valuenow", "50");
    await toP(page, 1);
    // 50 mL at 20%: 50 × .2 × .95 + 50 × .8 × .81 = 9.50 + 32.40.
    expect(await readout(page)).toBe("41.90");
    const name = page.locator("[data-hero3d] input");
    await name.fill("Amber one");
    const href = await page.locator("[data-hero3d] a.h3-cta").getAttribute("href");
    const q = new URL(href, "http://x").searchParams;
    expect(Object.fromEntries(q)).toEqual({ size: "50", unit: "ml", conc: "20", name: "Amber one", ref: "home" });
  });

  test("captions cross-fade: the first at the top, the last at the foot", async ({ page }) => {
    const caps = page.locator("[data-hero3d] .h3-cap");
    await toP(page, 0);
    await expect(caps.nth(0)).toBeVisible();
    await expect(caps.nth(4)).toBeHidden();
    await toP(page, 1);
    await expect(caps.nth(4)).toBeVisible();
    await expect(caps.nth(0)).toBeHidden();
  });
});

test("Arabic mirrors the rail", async ({ page }) => {
  await flags(page);
  await page.goto("/ar/");
  test.skip(!(await webgl(page)), "this browser has no WebGL");
  await hero(page).locator("canvas").waitFor({ timeout: 15000 });
  const origin = await page.locator(".h3-rail > i").evaluate((e) => getComputedStyle(e).transformOrigin);
  const width = await page.locator(".h3-rail").evaluate((e) => e.getBoundingClientRect().width);
  expect(parseFloat(origin)).toBeCloseTo(width, 0);
});

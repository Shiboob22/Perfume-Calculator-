import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

// The kyphi band's music (src/site/Ambient.jsx, src/site/templeSound.js),
// behind the `ambient` flag (the band itself needs `imagery`), against the production build.
const setup = (page, { names = ["imagery", "ambient"], motion } = {}) =>
  page.addInitScript(({ list, motion }) => {
    for (const n of list) localStorage.setItem(`kyphira.flag.${n}`, "1");
    if (motion) localStorage.setItem("kyphira.motion", motion);
    // Tap the output: every AudioContext's destination also feeds an analyser.
    const O = window.AudioContext;
    window.__contexts = 0;
    window.AudioContext = class extends O {
      constructor(o) {
        super(o);
        window.__contexts++;
        const tap = this.createGain(), an = this.createAnalyser();
        tap.connect(super.destination); tap.connect(an);
        Object.defineProperty(this, "destination", { get: () => tap });
        window.__ac = this; window.__an = an;
      }
    };
  }, { list: names, motion });

const level = (page) => page.evaluate(() => {
  const b = new Float32Array(2048); window.__an.getFloatTimeDomainData(b);
  return 20 * Math.log10(Math.sqrt(b.reduce((s, v) => s + v * v, 0) / b.length) || 1e-9);
});

test("flag off: no Listen button, no track fetched", async ({ page }) => {
  await setup(page, { names: ["imagery"] });
  const fetched = [];
  page.on("request", (r) => r.url().includes("/media/kyphi-") && fetched.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#kyphi-h")).toBeVisible();
  await expect(page.locator("[data-ambient]")).toHaveCount(0);
  expect(fetched).toEqual([]);
});

test("plays by default: starts on load (or the first press anywhere), Stop is remembered, Listen clears it", async ({ page }) => {
  await setup(page);
  const fetched = [];
  page.on("request", (r) => r.url().includes("/media/kyphi-") && fetched.push(r.url()));
  await page.goto("/");
  await expect.poll(() => fetched.length, { timeout: 8000 }).toBe(1); // no press needed to load
  await page.mouse.click(5, 5); // a first press elsewhere lets the sound in where the browser holds it
  const button = page.locator("[data-ambient]");
  await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 8000 });
  await expect(button).toHaveText(/Stop the music/);
  await expect.poll(() => level(page), { timeout: 8000 }).toBeGreaterThan(-40); // real sound, not silence
  expect(await page.evaluate(() => window.__contexts)).toBe(1);
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate(() => window.__ac.state), { timeout: 4000 }).toBe("closed");

  await page.reload(); // stopped stays stopped on this device
  await expect(page.locator("[data-ambient]")).toHaveText(/Listen/);
  await page.waitForTimeout(500);
  expect(fetched).toHaveLength(1);
  await page.locator("[data-ambient]").click();
  await expect(page.locator("[data-ambient]")).toHaveAttribute("aria-pressed", "true", { timeout: 8000 });
  expect(await page.evaluate(() => localStorage.getItem("kyphira.ambientStopped"))).toBeNull();
});

test("a double press on Listen starts one copy", async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => localStorage.setItem("kyphira.ambientStopped", "1"));
  await page.goto("/");
  const button = page.locator("[data-ambient]");
  await button.scrollIntoViewIfNeeded();
  await button.dblclick();
  await expect.poll(() => level(page), { timeout: 8000 }).toBeGreaterThan(-40);
  expect(await page.evaluate(() => window.__contexts)).toBe(1);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("phone: a tap anywhere lets the music in (a finger's press counts on touchend, not pointerdown)", async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, "touch screens only");
  await setup(page);
  await page.goto("/");
  await expect(page.locator("[data-ambient]")).toHaveCount(1);
  await page.touchscreen.tap(20, 300);
  await expect(page.locator("[data-ambient]")).toHaveAttribute("aria-pressed", "true", { timeout: 10000 });
  await expect.poll(() => level(page), { timeout: 10000 }).toBeGreaterThan(-40);
});

test("Arabic label", async ({ page }) => {
  await setup(page);
  await page.goto("/ar/");
  await expect(page.locator("[data-ambient]")).toHaveText(/استمع|أوقف الموسيقى/);
});

test("Motion Off: no Listen button, nothing plays", async ({ page }) => {
  await setup(page, { motion: "off" });
  await page.goto("/");
  await expect(page.locator("#kyphi-h")).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator("[data-ambient]")).toHaveCount(0);
  expect(await page.evaluate(() => window.__contexts)).toBe(0);
});

test("a failed load says so and offers a reload (a page left open across a deploy)", async ({ page }) => {
  await setup(page);
  await page.route("**/media/kyphi-chant.m4a", (r) => r.fulfill({ status: 404, body: "" }));
  await page.goto("/");
  const button = page.locator("[data-ambient]");
  await expect(page.locator("[data-ambient-failed]")).toHaveText("Couldn’t load the music.");
  await expect(button).toHaveText(/Reload and try again/);
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await page.unroute("**/media/kyphi-chant.m4a");
  await Promise.all([page.waitForEvent("load"), button.click()]); // reloads onto the live release
  await expect(page.locator("[data-ambient]")).toHaveText(/Stop the music|Listen/);
});

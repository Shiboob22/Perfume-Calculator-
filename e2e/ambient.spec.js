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
  page.on("request", (r) => r.url().includes("kyphi-music") && fetched.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#kyphi-h")).toBeVisible();
  await expect(page.locator("[data-ambient]")).toHaveCount(0);
  expect(fetched).toEqual([]);
});

test("one press plays (the first press, on a fresh page), the second stops", async ({ page }) => {
  await setup(page);
  const fetched = [];
  page.on("request", (r) => r.url().includes("kyphi-music") && fetched.push(r.url()));
  await page.goto("/");
  const button = page.locator("[data-ambient]");
  await button.scrollIntoViewIfNeeded();
  expect(fetched).toEqual([]); // nothing before the press
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toHaveText(/Stop the music/);
  await expect.poll(() => level(page), { timeout: 8000 }).toBeGreaterThan(-40); // real sound, not silence
  expect(await page.evaluate(() => window.__contexts)).toBe(1);
  expect(fetched).toHaveLength(1);
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate(() => window.__ac.state), { timeout: 4000 }).toBe("closed");
});

test("a double press starts one copy", async ({ page }) => {
  await setup(page);
  await page.goto("/");
  const button = page.locator("[data-ambient]");
  await button.scrollIntoViewIfNeeded();
  await button.dblclick();
  await expect.poll(() => level(page), { timeout: 8000 }).toBeGreaterThan(-40);
  expect(await page.evaluate(() => window.__contexts)).toBe(1);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("Arabic label", async ({ page }) => {
  await setup(page);
  await page.goto("/ar/");
  await expect(page.locator("[data-ambient]")).toHaveText(/استمع/);
});

test("Motion Off: no Listen button", async ({ page }) => {
  await setup(page, { motion: "off" });
  await page.goto("/");
  await expect(page.locator("#kyphi-h")).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator("[data-ambient]")).toHaveCount(0);
});

test("a failed load says so and offers a reload (a page left open across a deploy)", async ({ page }) => {
  await setup(page);
  await page.route("**/media/kyphi-music.m4a", (r) => r.fulfill({ status: 404, body: "" }));
  await page.goto("/");
  const button = page.locator("[data-ambient]");
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(page.locator("[data-ambient-failed]")).toHaveText("Couldn’t load the music.");
  await expect(button).toHaveText(/Reload and try again/);
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await page.unroute("**/media/kyphi-music.m4a");
  await Promise.all([page.waitForEvent("load"), button.click()]); // reloads onto the live release
  await expect(page.locator("[data-ambient]")).toHaveText(/Listen/);
});

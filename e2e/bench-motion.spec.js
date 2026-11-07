import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import { USER, json, signIn } from "./helpers.js";

// Bench SaaS Phase 6: the realistic bench. The scale display and the flacon
// read one animation clock: a change rolls the digits (STABLE dark while they
// move) and pours (cap up, a stream), then settles; reduced motion jumps
// straight to the result. Holding + keeps stepping, and the roll carries on
// from the shown value. The arithmetic is in src/lib/calc/flacon.ts (Vitest).
test.use({ serviceWorkers: "block" });

async function fakeApi(page) {
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, { plan: "free", name: "Free", features: [], batchCap: 25, batchesUsed: 0 });
    if (p === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
}

const instrument = (page) => page.locator("#calc-readout [data-instrument]");
const lcd = (page, row) => instrument(page).locator(`[data-row="${row}"] span.relative`).last();
const stable = (page) => instrument(page).locator("[data-stable]");

async function open(page) {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/bench?size=100&unit=ml&conc=25&family=woody");
  await expect(lcd(page, "oil")).toHaveText("23.25");
}

test("a change rolls the digits and pours, then the scale reads STABLE", async ({ page }) => {
  await open(page);
  await expect(stable(page)).toHaveAttribute("data-stable", "true");
  await expect(instrument(page).locator("[data-engrave]")).toHaveAttribute("data-engrave", "100 mL");
  await page.getByRole("button", { name: en.calc.stepper.concMore }).click();
  // Moving: the mark goes dark and the cap lifts for the pour.
  await expect(stable(page)).toHaveAttribute("data-stable", "false");
  await expect(instrument(page).locator("[data-cap]")).toHaveAttribute("data-cap", "up");
  // Settled on the new reading (100 mL at 26%, family density 0.93).
  await expect(stable(page)).toHaveAttribute("data-stable", "true");
  await expect(lcd(page, "oil")).toHaveText("24.18");
  await expect(instrument(page).locator("[data-cap]")).toHaveAttribute("data-cap", "down");
  await expect(page.locator("#calc-readout")).toContainText("24.18 g");
});

test("holding + keeps stepping, and the bottle grows with the batch", async ({ page }) => {
  await open(page);
  const svg = instrument(page).locator("svg.kx-flacon");
  await expect(svg).toHaveAttribute("data-scale-k", "1.000");
  const more = page.getByRole("button", { name: /^Add 5 mL$/ });
  await more.hover();
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  const size = Number(await page.getByRole("spinbutton", { name: en.calc.batchSize }).inputValue());
  expect(size).toBeGreaterThanOrEqual(130); // the first step, then one every 120 ms after 400 ms
  await expect(svg).toHaveAttribute("data-scale-k", Math.cbrt(size / 100).toFixed(3));
  await expect(instrument(page).locator("[data-engrave]")).toHaveAttribute("data-engrave", `${size} mL`);
  await expect(stable(page)).toHaveAttribute("data-stable", "true");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("everything jumps to its final state", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: en.calc.stepper.concMore }).click();
    // No frame in between: the reading, the mark and the cap are final at once.
    const seen = await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => {
      const box = document.querySelector("#calc-readout [data-instrument]");
      done({ oil: box.querySelector('[data-row="oil"] > span.relative > span:last-child').textContent, stable: box.querySelector("[data-stable]").dataset.stable, cap: box.querySelector("[data-cap]").dataset.cap });
    })));
    expect(seen).toEqual({ oil: "24.18", stable: "true", cap: "down" });
    const transition = await instrument(page).locator("svg.kx-flacon").evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(transition).toBe("0s");
  });
});

test("the instrument is decoration: screen readers get the readout's text, and axe passes", async ({ page }) => {
  await open(page);
  await expect(instrument(page).locator("[data-flacon]")).toHaveAttribute("aria-hidden", "true");
  await expect(instrument(page).locator("[data-scale=rows]")).toHaveAttribute("aria-hidden", "true");
  const results = await new AxeBuilder({ page }).include("#calc-readout [data-instrument]").analyze();
  expect(results.violations).toEqual([]);
});

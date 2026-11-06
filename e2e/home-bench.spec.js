import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";

// Section I: the home page's bench card. The Bench's glass flacon (no pan)
// pours on every change of bottle or strength while the three figures roll;
// the card keeps its height; four strengths sit in one row on a wide card
// and two by two on a phone (never three and one); the first view pours once
// from empty; reduced motion jumps. In the scroll scene (?flag=compounding)
// the side gauge stays on the phone's screen and reads the card's total.
// The arithmetic and timings are unit-tested (benchFigures, benchClock, flacon).

const card = (page) => page.locator("[data-home-bench]");
const figs = (page) => card(page).locator("[data-fig]");
const cap = (page) => card(page).locator("[data-cap]");
const status = (page) => card(page).getByRole("status");
const choose = (page, name) => card(page).getByRole("button", { name, exact: true }).click();
const ETHANOL_TOP = { light: "#F1F4F0", dark: "#34413B" }; // ETHANOL_TINT in src/lib/calc/flacon.ts

// Rows of the four strength buttons, as counts per line: [4] or [2, 2].
async function strengthRows(page) {
  const group = card(page).getByRole("group", { name: en.site.home.bench.strength }).or(card(page).locator("fieldset").nth(1));
  const tops = await group.first().getByRole("button").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  const rows = new Map();
  for (const y of tops) rows.set(y, (rows.get(y) ?? 0) + 1);
  return [...rows.values()];
}

// Records each new text the rolling total shows, and every state of the cap, from the first paint.
async function recordFigures(page) {
  await page.addInitScript(() => {
    window.__figs = [];
    window.__caps = [];
    new MutationObserver((list) => {
      for (const m of list) {
        const el = (m.target.nodeType === 1 ? m.target : m.target.parentElement);
        const fig = el?.closest?.("[data-fig='exampleTotal']");
        if (fig && window.__figs.at(-1) !== fig.textContent) window.__figs.push(fig.textContent);
        if (m.type === "attributes" && m.attributeName === "data-cap") window.__caps.push(m.target.getAttribute("data-cap"));
      }
    }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-cap"] });
  });
}

for (const lang of ["en", "ar"]) {
  for (const scheme of ["light", "dark"]) {
    test(`${lang} ${scheme}: a new bottle or strength pours and rolls, and the card keeps its height`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(lang === "ar" ? "/ar" : "/");
      await card(page).scrollIntoViewIfNeeded();
      await expect(figs(page)).toHaveText(["23.75 g", "60.75 g", "84.50 g"]);
      await expect(cap(page)).toHaveAttribute("data-cap", "down");
      await expect(card(page).locator('linearGradient[id$="eth"] stop').first()).toHaveAttribute("stop-color", ETHANOL_TOP[scheme]);
      expect(await strengthRows(page)).toEqual(info.project.name === "desktop" ? [4] : [2, 2]);
      const height = (await card(page).boundingBox()).height;

      await choose(page, "50 mL");
      await expect(cap(page)).toHaveAttribute("data-cap", "up"); // the pour runs
      await choose(page, "30 Extrait");
      await expect(figs(page)).toHaveText(["14.25 g", "28.35 g", "42.60 g"]);
      await expect(cap(page)).toHaveAttribute("data-cap", "down");
      await expect(card(page).locator("svg.kx-flacon")).toHaveAttribute("data-scale-k", "0.794"); // cbrt(50/100)
      await expect(status(page)).toContainText("42.60 g");
      await expect(card(page).locator('a[href^="/bench"]')).toHaveAttribute("href", "/bench?size=50&unit=ml&conc=30&ref=home");

      await choose(page, "10 mL");
      await expect(figs(page)).toHaveText(["2.85 g", "5.67 g", "8.52 g"]);
      await expect(card(page).locator("svg.kx-flacon")).toHaveAttribute("data-scale-k", "0.464");
      expect(Math.abs((await card(page).boundingBox()).height - height)).toBeLessThan(0.5);
      // No pan or engraving on the home page.
      await expect(card(page).locator("[data-engrave]")).toHaveCount(0);
    });
  }
}

test("the first view pours once from empty, and not again on the way back", async ({ page }) => {
  await recordFigures(page);
  await page.goto("/");
  await card(page).scrollIntoViewIfNeeded();
  await expect(figs(page).last()).toHaveText("84.50 g");
  await expect(cap(page)).toHaveAttribute("data-cap", "down");
  const figsSeen = await page.evaluate(() => window.__figs);
  expect(figsSeen.filter((t) => t === "0.00 g").length).toBe(1); // poured from empty, once
  expect(figsSeen.some((t) => t !== "0.00 g" && t !== "84.50 g")).toBe(true); // it rolled through values on the way
  expect(await page.evaluate(() => window.__caps)).toContain("up");
  const seen = figsSeen.length;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await card(page).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__figs.length)).toBe(seen);
});

test("reduced motion: the figures and the bottle jump to their final state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordFigures(page);
  await page.goto("/");
  await card(page).scrollIntoViewIfNeeded();
  await expect(figs(page)).toHaveText(["23.75 g", "60.75 g", "84.50 g"]);
  const before = await page.evaluate(() => window.__figs.length); // the page as parsed
  await choose(page, "10 mL");
  await expect(figs(page)).toHaveText(["2.38 g", "6.08 g", "8.45 g"], { timeout: 100 });
  const shown = await page.evaluate(() => window.__figs);
  expect(shown).not.toContain("0.00 g"); // no pour from empty
  expect(shown.slice(before)).toEqual(["8.45 g"]); // straight to the new total, no rolling
  expect(await page.evaluate(() => window.__caps)).not.toContain("up"); // the cap never lifts
  expect(await card(page).locator("svg.kx-flacon").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
});

test("390 px phone: strengths two by two, and the side gauge fully on screen reading the card", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "a phone check");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?flag=compounding");
  await expect(page.locator("[data-compounding]")).toBeVisible();
  await card(page).scrollIntoViewIfNeeded();
  await expect(figs(page)).toHaveText(["23.75 g", "60.75 g", "84.50 g"]);
  expect(await strengthRows(page)).toEqual([2, 2]);

  const live = page.locator("[data-gauge-live]");
  const read = live.locator(".cmp-read");
  await expect(live).toHaveAttribute("data-sync", "");
  const box = await read.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  const reading = () => read.evaluate((el) => getComputedStyle(el).getPropertyValue("--cg").trim());
  await expect.poll(reading).toBe("8450");
  await choose(page, "10 mL");
  await expect(figs(page)).toHaveText(["2.38 g", "6.08 g", "8.45 g"]);
  await expect.poll(reading).toBe("845"); // in step with the card's total

  await info.attach("home-bench-390", { body: await page.screenshot(), contentType: "image/png" });
});

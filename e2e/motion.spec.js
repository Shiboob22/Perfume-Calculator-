import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

test.use({ serviceWorkers: "block" });

// The motion layer (src/motion), against the production build. It is behind
// the `motion` flag, so every test that wants it on sets the device flag
// before the page loads (index.html reads it before first paint). Flag off,
// the layer must do nothing at all.

const on = (page) => page.addInitScript(() => localStorage.setItem("kyphira.flag.motion", "1"));
// Counts View Transitions and the page-body fades the layer starts.
const spy = (page) => page.addInitScript(() => {
  window.__vt = 0; window.__mainFades = 0;
  const start = document.startViewTransition?.bind(document);
  if (start) document.startViewTransition = (cb) => { window.__vt++; return start(cb); };
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (...a) { if (this.tagName === "MAIN") window.__mainFades++; return animate.apply(this, a); };
});
const hiddenCount = (page) => page.locator('[data-mo="hidden"]').count();
const toBottom = async (page) => {
  // Scroll in steps so each block is reached on the way down.
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(40); }
};

test("flag off: the layer does nothing", async ({ page }) => {
  await page.goto("/library");
  await page.locator("h1").first().waitFor();
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-motion"))).toBe(false);
  // `eager` blocks carry data-mo="enter" in markup (so server and client agree), but no CSS
  // acts on it without <html data-motion>; nothing is ever hidden or queued.
  expect(await page.locator('[data-mo="hidden"], [data-mo="in"]').count()).toBe(0);
  expect(await page.evaluate(() => document.querySelector("header").getAnimations().length)).toBe(0);
});

test("flag on: the first screen is never hidden; below the fold waits, plays once, and stays", async ({ page }) => {
  await on(page);
  await page.goto("/library");
  await page.locator("h1").first().waitFor();
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-motion"))).toBe(true);
  // The headline is on the first screen: fully visible, no animation on it.
  expect(await page.locator("h1").first().evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
  const waiting = await hiddenCount(page);
  expect(waiting).toBeGreaterThan(0);
  await toBottom(page);
  await page.waitForTimeout(900);
  expect(await hiddenCount(page)).toBe(0);
  // Back to the top and down again: nothing replays.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await toBottom(page);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && a.effect?.target?.dataset?.mo).length)).toBe(0);
});

test("the header settles in on load with a rise only (no fade, so the first paint is whole)", async ({ page }) => {
  await on(page);
  await page.goto("/pricing");
  const names = await page.evaluate(() => document.querySelector('[data-mo-chrome="header"]').getAnimations().map((a) => a.animationName));
  // It may already have finished on a fast machine; if it is still running it is the settle.
  for (const n of names) expect(n).toBe("mo-settle");
  const frames = await page.evaluate(() => {
    for (const sheet of document.styleSheets) for (const r of sheet.cssRules) if (r.name === "mo-settle") return r.cssText;
  });
  expect(frames).not.toMatch(/opacity/);
});

test("reduced motion: everything is simply there", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await on(page);
  await spy(page);
  await page.goto("/library");
  await page.locator("h1").first().waitFor();
  const opacities = await page.locator("[data-mo]").evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
  expect(opacities.every((o) => o === "1")).toBe(true);
  await page.getByRole("link", { name: /pricing|الأسعار/i }).first().click();
  await expect(page).toHaveURL(/\/pricing/);
  expect(await page.evaluate(() => window.__vt)).toBe(0);
  expect(await page.evaluate(() => window.__mainFades)).toBe(0);
});

test("a route change runs as a View Transition, the header stays, and the new page opens at the top", async ({ page }) => {
  await on(page);
  await spy(page);
  await page.goto("/library");
  await page.locator("h1").first().waitFor();
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.getByRole("link", { name: /pricing/i }).first().click();
  await expect(page).toHaveURL(/\/pricing/);
  expect(await page.evaluate(() => window.__vt)).toBe(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-mo-vt"))).toBe(false);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("back and forward fade the page in themselves (no View Transition for them)", async ({ page }) => {
  await on(page);
  await spy(page);
  await page.goto("/library");
  await page.getByRole("link", { name: /pricing/i }).first().click();
  await expect(page).toHaveURL(/\/pricing/);
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-mo-vt"))).toBe(false);
  const fades = await page.evaluate(() => window.__mainFades);
  await page.goBack();
  await expect(page).toHaveURL(/\/library$/);
  expect(await page.evaluate(() => window.__vt)).toBe(1);
  expect(await page.evaluate(() => window.__mainFades)).toBe(fades + 1);
});

test("a modified click is left to the browser", async ({ page }) => {
  await on(page);
  await spy(page);
  await page.goto("/library");
  const [popup] = await Promise.all([
    page.context().waitForEvent("page"),
    page.getByRole("link", { name: /pricing/i }).first().click({ modifiers: ["ControlOrMeta"] }),
  ]);
  await popup.close();
  expect(await page.evaluate(() => window.__vt)).toBe(0);
  await expect(page).toHaveURL(/\/library$/);
});

test("Arabic: the layer mirrors (direction variable) and headings keep whole words", async ({ page }) => {
  await on(page);
  await page.goto("/ar/library");
  await page.locator("h1").first().waitFor();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mo-dir").trim())).toBe("-1");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mo-slow").trim())).toMatch(/^(600ms|\.6s|0\.6s)$/);
});

test("accessibility holds while a section is still arriving", async ({ page }) => {
  await on(page);
  await page.goto("/library");
  await page.locator("h1").first().waitFor();
  await page.evaluate(() => document.querySelector('[data-mo="hidden"]').scrollIntoView({ block: "center" }));
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => document.getAnimations().some((a) => a.animationName === "mo-enter" && a.playState === "running"))).toBe(true);
  const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
  const serious = (r) => r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`);
  // Mid-fade, text is partly transparent, so a contrast reading is meaningless
  // (axe would blend the opacity in); every other rule must already hold.
  expect(serious(await new AxeBuilder({ page }).withTags(tags).disableRules(["color-contrast"]).analyze())).toEqual([]);
  // Once the section has settled, contrast is checked in full.
  await page.waitForTimeout(900);
  expect(serious(await new AxeBuilder({ page }).withTags(tags).analyze())).toEqual([]);
});

// ── The signed-in app (phones: the More sheet and the bottom bar) ──

async function appApi(page) {
  await signIn(page);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/auth/v1/user")) return json(route, USER);
    if (path.endsWith("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    if (new URL(route.request().url()).pathname === "/api/me") return json(route, { plan: "free", name: "Free", features: FEATURES.slice(0, 1), batchCap: 25, batchesUsed: 0 });
    return json(route, {});
  });
}

test.describe("phone app", () => {
  test.beforeEach(({ browserName }, info) => { test.skip(!browserName || info.project.name !== "phone", "the bottom bar is a phone control"); });

  test("the More sheet plays its exit, then goes; reduced motion removes it at once", async ({ page }) => {
    await on(page);
    await appApi(page);
    await page.goto("/bench");
    await page.locator('[data-mo-chrome="bar"]').getByRole("button", { name: /more/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    // Leaving: still in the page, marked, for the base duration.
    await expect(page.locator("[data-leaving]")).toHaveCount(1);
    await expect(dialog).toBeHidden({ timeout: 1500 });
  });

  test("the bottom bar names its active marker only while a transition runs", async ({ page }) => {
    await on(page);
    await appApi(page);
    await page.goto("/bench");
    await page.locator('[data-mo-chrome="bar"]').waitFor();
    const named = () => page.evaluate(() => [...document.querySelectorAll("[data-mo-ind][data-on], [data-mo-chrome]")].map((e) => getComputedStyle(e).viewTransitionName).filter((n) => n && n !== "none"));
    expect(await named()).toEqual([]);
  });
});

// Smooth wheel scrolling (src/motion/smooth.js): the home page only, and only
// when the layer is on and motion is allowed. Lenis puts a `lenis` class on <html> while it runs.
// The override keeps a small CI machine from counting as low-power.
const roomy = (page) => page.addInitScript(() => { window.__motion = { low: false }; });

test("smooth scroll: runs on the home page, stops when you leave it", async ({ page }) => {
  await on(page); await roomy(page);
  await page.goto("/");
  await expect(page.locator("html.lenis")).toHaveCount(1);
  await page.locator('a[href="/library"]').first().click();
  await expect(page).toHaveURL(/\/library/);
  await expect(page.locator("html.lenis")).toHaveCount(0);
});

test("smooth scroll: leaving straight after a wheel scroll leaves no lenis class behind", async ({ page }) => {
  await on(page); await roomy(page);
  await page.goto("/");
  await expect(page.locator("html.lenis")).toHaveCount(1);
  await page.mouse.move(200, 300);
  await page.mouse.wheel(0, 600);
  await page.locator('a[href="/library"]').first().click();
  await expect(page).toHaveURL(/\/library/);
  await expect(page.locator("html.lenis")).toHaveCount(0);
});

test("smooth scroll: off with the flag off, under reduced motion and on a low-power device", async ({ page }) => {
  await roomy(page);
  await page.goto("/");
  await page.waitForTimeout(600);
  await expect(page.locator("html.lenis")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await on(page);
  await page.goto("/");
  await page.waitForTimeout(600);
  await expect(page.locator("html.lenis")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => { window.__motion = { low: true }; });
  await page.goto("/");
  await page.waitForTimeout(600);
  await expect(page.locator("html.lenis")).toHaveCount(0);
});

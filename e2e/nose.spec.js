import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

test.use({ serviceWorkers: "block" });

// The Nose (Phase 7), against the production build with a fake session and a
// fake /api/ai (no Gemini). Flagged: off, /nose returns to the Bench. On: a
// question is sent with the language, the catalog's fragrances come back with
// their matched accords, health and blending questions get a pointer, and each
// failure code reads in the user's language.

const PICKS = {
  kind: "picks",
  intro: "Warm woods with a soft base.",
  picks: [
    { id: "88888888-8888-4888-8888-000000000001", name: "Amber Wood", brand: "Maison Test", year: 2019, family: "Woody", matched: ["Woody", "Amber"], reason: "Amber over a dry wood heart." },
    { id: "88888888-8888-4888-8888-000000000002", name: "Plain Wood", brand: null, year: null, family: "Woody", matched: ["Woody"], reason: "" },
  ],
};

async function fakeApi(page, { locale = "en", answer = PICKS, status = 200 } = {}) {
  const asked = [];
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/auth/v1/user")) return json(route, USER);
    if (path.endsWith("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    if (p === "/api/me") return json(route, { plan: "free", name: "Free", features: FEATURES.slice(0, 1), batchCap: 25, batchesUsed: 0 });
    if (p === "/api/ai" && req.method() === "POST") {
      asked.push(req.postDataJSON());
      return json(route, answer, status);
    }
    return json(route, {});
  });
  return asked;
}
const flags = (page, ...names) => page.addInitScript((list) => list.forEach((n) => localStorage.setItem(`kyphira.flag.${n}`, "1")), names);

test("with the flag off, /nose goes back to the Bench and the nav has no Nose link", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/nose");
  await expect(page).toHaveURL(/\/bench/);
  await expect(page.getByRole("link", { name: en.site.nav.nose })).toHaveCount(0);
});

test("?flag=nose turns the room on for this device", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/nose?flag=nose");
  await expect(page.getByRole("heading", { level: 1, name: en.nose.title })).toBeVisible();
  await expect(page.getByRole("link", { name: en.site.nav.nose })).toBeVisible();
});

test("shows the AI-and-privacy notice, asks, and lists catalog picks with the accords that matched", async ({ page }) => {
  await flags(page, "nose");
  await signIn(page);
  const asked = await fakeApi(page);
  await page.goto("/nose");
  await expect(page.getByText(en.nose.safety)).toBeVisible();
  await expect(page.getByText(en.nose.privacy)).toBeVisible();
  await page.getByLabel(en.nose.label).fill("warm and woody for winter");
  await page.getByRole("button", { name: en.nose.ask }).click();
  await expect(page.getByRole("heading", { level: 2, name: en.nose.heading })).toBeVisible();
  await expect(page.getByText("Amber Wood")).toBeVisible();
  await expect(page.getByText("Amber over a dry wood heart.")).toBeVisible();
  await expect(page.getByText(en.nose.matched.replace("{list}", "Woody, Amber"))).toBeVisible();
  expect(asked).toEqual([{ task: "nose", question: "warm and woody for winter", locale: "en" }]);
});

test("a starter sends its own sentence; a pick links to the Atlas only when the Atlas is on", async ({ page }) => {
  await flags(page, "nose");
  await signIn(page);
  const asked = await fakeApi(page);
  await page.goto("/nose");
  await page.getByRole("button", { name: en.nose.starters.fresh }).click();
  await expect(page.getByText("Amber Wood")).toBeVisible();
  expect(asked[0].question).toBe(en.nose.starters.fresh);
  await expect(page.getByRole("link", { name: "Amber Wood" })).toHaveCount(0);
  await flags(page, "atlas");
  await page.reload();
  await page.getByRole("button", { name: en.nose.starters.warm }).click();
  await expect(page.getByRole("link", { name: "Amber Wood" })).toHaveAttribute("href", /\/atlas\/fragrance\/8888/);
});

test("a too-short question is stopped in the browser", async ({ page }) => {
  await flags(page, "nose");
  await signIn(page);
  const asked = await fakeApi(page);
  await page.goto("/nose");
  await page.getByLabel(en.nose.label).fill("hi");
  await page.getByRole("button", { name: en.nose.ask }).click();
  await expect(page.getByRole("alert").filter({ hasText: en.nose.errors.short })).toBeVisible();
  expect(asked).toEqual([]);
});

test("health and blending questions get a pointer, never picks", async ({ page }) => {
  await flags(page, "nose");
  await signIn(page);
  await fakeApi(page, { answer: { kind: "redirect", reason: "health" } });
  await page.goto("/nose");
  await page.getByLabel(en.nose.label).fill("a perfume for my allergies");
  await page.getByRole("button", { name: en.nose.ask }).click();
  await expect(page.getByText(en.nose.redirect.health)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: en.nose.heading })).toHaveCount(0);

  await page.unroute("**/api/**");
  await page.route("**/api/**", (route) => route.request().url().includes("/api/ai") ? json(route, { kind: "redirect", reason: "diy" }) : json(route, {}));
  await page.getByRole("button", { name: en.nose.ask }).click();
  await expect(page.getByText(en.nose.redirect.diy)).toBeVisible();
  await expect(page.getByRole("link", { name: en.nose.openBench })).toHaveAttribute("href", "/bench");
});

test("nothing matched reads plainly", async ({ page }) => {
  await flags(page, "nose");
  await signIn(page);
  await fakeApi(page, { answer: { kind: "none" } });
  await page.goto("/nose");
  await page.getByLabel(en.nose.label).fill("something very unusual");
  await page.getByRole("button", { name: en.nose.ask }).click();
  await expect(page.getByText(en.nose.none)).toBeVisible();
});

for (const [code, status, key] of [["nose_off", 503, "off"], ["nose_limit", 429, "limit"], ["nose_busy", 503, "busy"], ["feature_locked", 403, "locked"]]) {
  test(`${code} reads as its own message`, async ({ page }) => {
    await flags(page, "nose");
    await signIn(page);
    await fakeApi(page, { answer: { error: "x", code }, status });
    await page.goto("/nose");
    await page.getByLabel(en.nose.label).fill("a warm woody scent");
    await page.getByRole("button", { name: en.nose.ask }).click();
    await expect(page.getByRole("alert").filter({ hasText: en.nose.errors[key] })).toBeVisible();
  });
}

test("Arabic at 320 px: sends locale ar, no sideways scroll, no axe violations, with and without results", async ({ page }) => {
  await flags(page, "nose");
  await signIn(page);
  const asked = await fakeApi(page, { locale: "ar" });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/nose");
  await expect(page.getByRole("heading", { level: 1, name: ar.nose.title })).toBeVisible();
  const check = async (label) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), label).toBe(false);
    await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1500))])); // entrances settle first: axe must not read a half-faded colour
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations, label).toEqual([]);
  };
  await check("empty");
  await page.getByLabel(ar.nose.label).fill("عطر خشبي دافئ للشتاء");
  await page.getByRole("button", { name: ar.nose.ask }).click();
  await expect(page.getByRole("heading", { level: 2, name: ar.nose.heading })).toBeVisible();
  await check("results");
  expect(asked[0].locale).toBe("ar");
});

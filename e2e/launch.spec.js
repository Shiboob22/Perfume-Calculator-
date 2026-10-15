import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

test.use({ serviceWorkers: "block" });

// Launch readiness (Phase 8): the six rooms as a whole. With no flags a
// visitor sees only what is finished (Bench, Library) and every unfinished
// room's address returns to the Bench. With every flag on, each room opens, the
// nav reaches it, nothing scrolls sideways at 320 px in Arabic and axe is
// clean. The order and conditions for turning flags on are in LAUNCH.md.

const ROOMS = [
  { flag: "wardrobe", path: "/wardrobe", nav: "wardrobe", title: (m) => m.wardrobe.title },
  { flag: "atlas", path: "/atlas", nav: "atlas", title: (m) => m.atlas.title },
  { flag: "salon", path: "/salon", nav: "salon", title: (m) => m.salon.title },
  { flag: "nose", path: "/nose", nav: "nose", title: (m) => m.nose.title },
];

async function fakeApi(page, locale = "en") {
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/auth/v1/user")) return json(route, USER);
    if (path.endsWith("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, { plan: "free", name: "Free", features: FEATURES.slice(0, 1), batchCap: 25, batchesUsed: 0 });
    return json(route, {});
  });
}
const flags = (page, names) => page.addInitScript((list) => list.forEach((n) => localStorage.setItem(`kyphira.flag.${n}`, "1")), names);

test("with no flags, none of the unfinished rooms is reachable or linked", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  for (const room of ROOMS) {
    await page.goto(room.path);
    await expect(page, room.path).toHaveURL(/\/bench/);
    await expect(page.getByRole("link", { name: en.site.nav[room.nav], exact: true }), room.nav).toHaveCount(0);
  }
  await expect(page.getByRole("link", { name: en.site.nav.calculator }).first()).toBeVisible();
});

test("with every flag on, each room opens from the nav", async ({ page }) => {
  await flags(page, ROOMS.map((r) => r.flag));
  await signIn(page);
  await fakeApi(page);
  await page.goto("/bench");
  for (const room of ROOMS) {
    await page.getByRole("link", { name: en.site.nav[room.nav], exact: true }).first().click();
    await expect(page, room.path).toHaveURL(new RegExp(`${room.path}$`));
    await expect(page.getByRole("heading", { level: 1, name: room.title(en) })).toBeVisible();
  }
});

test("Arabic at 320 px: every room opens, no sideways scroll, no axe violations", async ({ page }) => {
  await flags(page, ROOMS.map((r) => r.flag));
  await signIn(page);
  await fakeApi(page, "ar");
  await page.setViewportSize({ width: 320, height: 700 });
  for (const room of ROOMS) {
    await page.goto(room.path);
    await expect(page.getByRole("heading", { level: 1, name: room.title(ar) }), room.path).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), room.path).toBe(false);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations, room.path).toEqual([]);
  }
});

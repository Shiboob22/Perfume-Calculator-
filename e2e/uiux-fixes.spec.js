import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// UI/UX audit 2026-11-21 (OUTPUTS/Kyphira/Kyphira-UIUX-Audit_Report_v1.md):
// the small fixes, against the production build with a fake session and API.
test.use({ serviceWorkers: "block" });

const DAY = 86400000;
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };
const FREE = { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, formulaCap: null, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 0 };
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bid = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
function batch(n, name, tier, daysAgo, notes = []) {
  const started = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: bid(n), user_id: USER.id, batch_no: n, fragrance_name: name, tier, concentration_pct: 25, amount: 50, unit: "ml",
    blend_date: localDate(started), created_at: started.toISOString(), remind: false,
    oil_g: 11.88, oil_ml: 12.5, ethanol_g: 30.38, ethanol_ml: 37.5, total_g: 42.25, total_ml: 50, basis: "volume",
    batch_checkins: notes.map(([k, day, note, rating]) => ({ id: `${bid(n)}-${k}`, day, scheduled_day: day, note, rating, tags: [], skipped: false, created_at: new Date(started.getTime() + day * DAY).toISOString() })),
    shared_recipes: null,
  };
}

async function fakeApi(page, { plan = "pro", batches = [], popular = null, fail = false } = {}) {
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/me") return json(route, plan === "pro" ? PRO : FREE);
    if (url.pathname === "/api/search" && url.searchParams.get("popular")) return popular ? json(route, { results: popular() }) : json(route, { error: "down" }, 500);
    if (fail) return json(route, { code: "server_error" }, 500);
    if (url.pathname === "/api/batches") return json(route, { batches });
    if (url.pathname === "/api/checkins") return json(route, { patterns: {}, locked: false });
    return json(route, {});
  });
}

test("H9: Search says so when the most-rated list fails, and Try again loads it", async ({ page }) => {
  await signIn(page);
  let up = false;
  await fakeApi(page, { popular: () => (up ? [{ id: "f1", name: "Aventus", brand: "Creed", rating: 4.3, popularity: 9000, accords: ["fruity"] }] : []) });
  await page.goto("/app/search");
  const empty = page.locator("[data-popular-empty]");
  await expect(empty).toContainText(en.search.popularFailed);
  up = true;
  await empty.getByRole("button", { name: en.search.retry }).click();
  await expect(page.getByText("Aventus").first()).toBeVisible();
  await expect(empty).toHaveCount(0);
});

test("H10: the Journal badge reads the same in the Journal and in Batch history", async ({ page }) => {
  await signIn(page);
  // No milestone opened in the last week, but the older family schedule owes check-ins.
  const batches = [
    batch(4, "Santal Dry", "woody", 50),
    batch(3, "Oud Nights", "woody", 34, [["d0", 0, "Harsh.", 1], ["w1", 7, "Better.", 3], ["m1", 30, "Smooth.", 4]]),
    batch(2, "Tonka Praline", "gourmand", 120),
    batch(1, "Neroli Eau", "fresh", 16, [["d0", 0, "Thin.", 2], ["w1", 7, "Rounder.", 3], ["w2", 14, "Settling.", 4]]),
  ];
  await fakeApi(page, { batches });
  await page.goto("/journal");
  await expect(page.locator("[data-batch]")).toHaveCount(4);
  await expect(page.locator("[data-badge]")).toHaveCount(0);
  await page.goto("/bench/journal");
  await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
  await expect(page.getByText("Santal Dry").first()).toBeVisible();
  await expect(page.locator("[data-badge]")).toHaveCount(0);
});

test("M15: the Arabic 404 is drawn in Arabic, with no hydration error and no shift", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  const res = await page.goto("/ar/no-such-page");
  expect(res.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).not.toHaveAttribute("data-relocale", "");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: ar.site.nav.pricing }).first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.01);
});

test("M15: the English 404 still hydrates as before", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const res = await page.goto("/no-such-page");
  expect(res.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("link", { name: en.site.nav.pricing }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("M16: one main heading on the screens that had none", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { plan: "free" });
  for (const path of ["/app/bench", "/app/selector", "/bench/orders"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  }
});

test("M16: the Journal keeps its name when the list can't load", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { fail: true });
  await page.goto("/journal");
  await expect(page.getByRole("alert")).toContainText(en.journal.page.loadFailed);
  await expect(page.getByRole("heading", { level: 1, name: en.journal.page.title })).toBeVisible();
});

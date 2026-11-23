import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// UI/UX audit polish M4–M8 (owner's go-ahead 2026-11-22): one page heading,
// error states that keep the room, ratings with named ends, one main button
// colour, and a reason when Log is greyed out.
test.use({ serviceWorkers: "block" });

const DAY = 86400000;
const AXE = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 1 };
const msgs = { en, ar };
const bid = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
function batch(n, daysAgo) {
  const at = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: bid(n), user_id: USER.id, batch_no: n, fragrance_name: `Oud No. ${n}`, tier: "woody", concentration_pct: 25, amount: 50, unit: "ml",
    blend_date: at.toISOString().slice(0, 10), created_at: at.toISOString(), remind: false, total_ml: 50, basis: "volume",
    oil_g: 11.88, ethanol_g: 30.38, total_g: 42.25, batch_checkins: [], shared_recipes: null,
  };
}

// `api.batches`: "ok" | "fail"; it can change during a test.
async function open(page, { locale = "en", path, api = { batches: "ok" }, offline = false } = {}) {
  await page.addInitScript(({ off }) => {
    localStorage.setItem("kyphira.renameNoticeDismissed", "1");
    if (off) Object.defineProperty(Navigator.prototype, "onLine", { get: () => false });
  }, { off: offline });
  await signIn(page);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "2026-10-01T00:00:00Z", sells: true, currency: "EGP" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/me") return json(route, PRO);
    if (url.searchParams.get("resource") === "orders") return api.orders === "fail" ? route.abort() : json(route, { orders: [] });
    if (url.pathname === "/api/batches") return api.batches === "fail" ? route.abort() : json(route, { batches: [batch(1, 8)] });
    if (url.pathname === "/api/checkins") return json(route, { patterns: {}, locked: false });
    return json(route, {});
  });
  await page.goto(`${locale === "ar" ? "/ar" : ""}${path}`);
}

// M4: the tools and pages use the rooms' heading: one h1, the large title, the rule under it.
const PAGES = [
  ["/app/inventory", (m) => m.inventory.title],
  ["/app/labels", (m) => m.labels.title],
  ["/app/selector", (m) => m.selector.title],
  ["/app/ask", (m) => m.chat.title],
  ["/app/account", (m) => m.account.title],
  ["/bench/journal", (m) => m.batches.title],
];
for (const [path, title] of PAGES) {
  test(`M4 ${path}: one h1, drawn as the rooms' heading`, async ({ page }) => {
    await open(page, { path });
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(title(en));
    await expect(h1).toBeVisible();
    await expect(page.locator("header:has(h1) .kx-rule")).toHaveCount(1);
  });
}

test("M4: the Selector's eyebrow is a plain line, not spaced capitals", async ({ page }) => {
  await open(page, { path: "/app/selector" });
  const kicker = page.getByText(en.selector.intro.kicker, { exact: true });
  await expect(kicker).toBeVisible();
  expect(await kicker.evaluate((el) => getComputedStyle(el).textTransform)).toBe("none");
});

for (const locale of ["en", "ar"]) {
  test(`M5 ${locale}: the Journal keeps its header when the list fails, and says No connection offline`, async ({ page }) => {
    const m = msgs[locale];
    await open(page, { locale, path: "/journal", api: { batches: "fail" }, offline: true });
    await expect(page.getByRole("heading", { level: 1, name: m.journal.page.title })).toBeVisible();
    await expect(page.getByText(m.journal.page.lead)).toBeVisible();
    await expect(page.getByRole("alert")).toHaveText(m.app.load.offline);
    const { violations } = await new AxeBuilder({ page }).include("main").withTags(AXE).analyze();
    expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test("M5: a reload that fails keeps the list from earlier in the visit, and Try again refreshes it", async ({ page }) => {
  const api = { batches: "ok" };
  await open(page, { path: "/journal", api });
  await expect(page.getByText("Oud No. 1").first()).toBeVisible();
  // Leave and come back inside the app (same visit), with the API down.
  api.batches = "fail";
  await page.locator('[data-tab="calculator"]:visible').first().click();
  await expect(page).toHaveURL(/\/bench/);
  await page.locator('[data-tab="journal"]:visible').first().click();
  const stale = page.locator("[data-stale]");
  await expect(stale).toContainText(en.app.load.staleFailed);
  await expect(page.getByText("Oud No. 1").first()).toBeVisible();
  api.batches = "ok";
  await stale.getByRole("button", { name: en.journal.page.retry }).click();
  await expect(stale).toHaveCount(0);
});

test("M5: Orders say No connection when offline, under the room's header", async ({ page }) => {
  await open(page, { path: "/bench/orders", api: { batches: "ok", orders: "fail" }, offline: true });
  await expect(page.getByRole("heading", { level: 1, name: en.orders.title })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(en.app.load.offline);
});

for (const locale of ["en", "ar"]) {
  test(`M6 ${locale}: the Journal's rating row names its ends`, async ({ page }) => {
    const m = msgs[locale];
    await open(page, { locale, path: `/journal?batch=${bid(1)}` });
    const group = page.locator("[data-note-block]").getByRole("group", { name: m.journal.page.rating });
    await expect(group).toBeVisible();
    const ends = group.locator("[data-rating-ends]");
    await expect(ends).toContainText(m.rating.low);
    await expect(ends).toContainText(m.rating.high);
    const described = await group.evaluate((el) => document.getElementById(el.getAttribute("aria-describedby"))?.textContent);
    expect(described).toBe(m.rating.ends);
    // "Not for me" sits under 1, "Love it" under 5 (mirrored in Arabic).
    const [one, five, low, high] = await Promise.all([
      group.getByRole("button").first().boundingBox(),
      group.getByRole("button").nth(4).boundingBox(),
      ends.locator("span").first().boundingBox(),
      ends.locator("span").last().boundingBox(),
    ]);
    const near = (a, b) => Math.abs((a.x + a.width / 2) - (b.x + b.width / 2));
    expect(near(low, one)).toBeLessThan(near(low, five));
    expect(near(high, five)).toBeLessThan(near(high, one));
  });
}

test("M7: the Journal's Save note is the amber main button", async ({ page }) => {
  await open(page, { path: `/journal?batch=${bid(1)}` });
  const save = page.locator("[data-note-block]").getByRole("button", { name: en.journal.page.save, exact: true });
  await expect(save).toBeVisible();
  const [bg, amber] = await save.evaluate((el) => {
    const probe = document.createElement("span");
    probe.style.background = "var(--c-amber)";
    document.body.append(probe);
    const want = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return [getComputedStyle(el).backgroundColor, want];
  });
  expect(bg).toBe(amber);
});

for (const locale of ["en", "ar"]) {
  test(`M8 ${locale}: a greyed-out Log says it needs a name, and the line goes once there is one`, async ({ page }) => {
    const m = msgs[locale];
    await open(page, { locale, path: "/bench" });
    const log = page.getByRole("button", { name: m.calc.log, exact: true });
    await expect(log).toBeDisabled();
    const hint = page.locator("[data-log-needs-name]");
    await expect(hint).toHaveText(m.calc.logNeedsName);
    await expect(log).toHaveAttribute("aria-describedby", await hint.getAttribute("id"));
    await page.locator("#calc-name").fill("Oud Nights");
    await expect(hint).toHaveCount(0);
    await expect(log).toBeEnabled();
  });
}

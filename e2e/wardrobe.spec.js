import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

test.use({ serviceWorkers: "block" });

// The Wardrobe (Phase 4), against the production build with a fake session
// and a fake API. The room is behind the "wardrobe" flag: off, /wardrobe
// goes back to the Bench; on (build flag or ?flag=wardrobe on this device),
// the whole loop works: add bottles, get a ranked pick with reasons, log a
// wearing, see statistics, and keep a wish list.

const idFor = (n) => `77777777-7777-4777-8777-${String(n).padStart(12, "0")}`;

async function fakeApi(page, { locale = "en", bottles = [], wear = [] } = {}) {
  const db = { bottles: bottles.map((b) => ({ ...b })), wear: wear.map((w) => ({ ...w })), posts: { bottles: [], wear: [] }, patches: [] };
  let n = 100;
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = req.url();
    const one = (req.headers().accept || "").includes("pgrst.object");
    const answer = (row, status = 200) => json(route, one ? row : [row], status);
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    if (url.includes("/rest/v1/wardrobe_bottles")) {
      if (req.method() === "GET") return json(route, db.bottles);
      if (req.method() === "POST") {
        const row = { id: idFor(++n), user_id: USER.id, created_at: "2026-10-14T00:00:00Z", updated_at: "2026-10-14T00:00:00Z", ...req.postDataJSON() };
        db.posts.bottles.push(row); db.bottles.push(row);
        return answer(row, 201);
      }
      if (req.method() === "PATCH") {
        const id = new URL(url).searchParams.get("id")?.replace("eq.", "");
        const row = db.bottles.find((b) => b.id === id);
        Object.assign(row, req.postDataJSON()); db.patches.push({ id, ...req.postDataJSON() });
        return answer(row);
      }
      if (req.method() === "DELETE") { const id = new URL(url).searchParams.get("id")?.replace("eq.", ""); db.bottles = db.bottles.filter((b) => b.id !== id); return json(route, [], 204); }
    }
    if (url.includes("/rest/v1/wear_log")) {
      if (req.method() === "GET") return json(route, db.wear);
      if (req.method() === "POST") {
        const row = { id: idFor(++n), user_id: USER.id, created_at: "2026-10-14T00:00:00Z", ...req.postDataJSON() };
        db.posts.wear.push(row); db.wear.unshift(row);
        return answer(row, 201);
      }
    }
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/me") return json(route, { plan: "free", name: "Free", features: FEATURES.slice(0, 1), batchCap: 25, batchesUsed: 0 });
    return json(route, {});
  });
  return db;
}

const bottle = (n, extra) => ({ id: idFor(n), user_id: USER.id, status: "owned", kind: "bottle", clusters: [], projection: null, fill_pct: null, size_ml: null, price: null, currency: null, note: null, purchase_date: null, fragrance_id: null, family: null, ...extra });
const flagOn = (page) => page.addInitScript(() => localStorage.setItem("kyphira.flag.wardrobe", "1"));

test("with the flag off, /wardrobe goes back to the Bench and the nav has no Wardrobe link", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/wardrobe");
  await expect(page).toHaveURL(/\/bench$/);
  await expect(page.getByRole("link", { name: en.site.nav.wardrobe })).toHaveCount(0);
});

test("?flag=wardrobe turns the room on for this device, and ?unflag turns it off", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/bench?flag=wardrobe");
  // On phones the Wardrobe sits behind More on the bottom bar.
  await expect(page.getByRole("link", { name: en.site.nav.calculator }).first()).toBeVisible();
  const more = page.getByRole("button", { name: en.app.more });
  if (await more.isVisible()) await more.click();
  await expect(page.getByRole("link", { name: en.site.nav.wardrobe })).toBeVisible();
  await page.getByRole("link", { name: en.site.nav.wardrobe }).click();
  await expect(page.getByRole("heading", { level: 1, name: en.wardrobe.title })).toBeVisible();
  await page.goto("/bench?unflag=wardrobe");
  await expect(page.getByRole("link", { name: en.site.nav.wardrobe })).toHaveCount(0);
});

test("add bottles, get a ranked pick with reasons, log a wearing", async ({ page }) => {
  await flagOn(page);
  await signIn(page);
  const db = await fakeApi(page);
  await page.goto("/wardrobe");
  await expect(page.getByText(en.wardrobe.today.empty)).toBeVisible();
  await page.getByRole("button", { name: en.wardrobe.today.goCollection }).click();

  for (const [name, family] of [["Citrus Day", "fresh"], ["Amber Night", "oriental"]]) {
    await page.getByRole("button", { name: en.wardrobe.collection.add }).click();
    await page.getByLabel(en.wardrobe.collection.name).fill(name);
    await page.getByLabel(en.wardrobe.collection.family).selectOption(family);
    await page.getByRole("button", { name: en.wardrobe.collection.save, exact: true }).click();
    await expect(page.getByRole("heading", { level: 3, name })).toBeVisible();
  }
  expect(db.posts.bottles.map((b) => [b.name, b.family, b.status])).toEqual([["Citrus Day", "fresh", "owned"], ["Amber Night", "oriental", "owned"]]);

  await page.getByRole("button", { name: en.wardrobe.tabs.today }).click();
  // The board's two controls up front (a temperature stepper, the occasion as chips); time of day is folded away until asked for.
  await expect(page.getByRole("group", { name: en.wardrobe.today.question })).toBeVisible();
  await page.getByLabel(en.wardrobe.today.temp).fill("35");
  const first = page.getByRole("article");
  await expect(first.getByRole("heading", { level: 3 })).toHaveText("Citrus Day");
  await expect(first).toContainText("hot (30°C and above)");
  await expect(page.getByText(en.wardrobe.spray.fewerInHeat)).toBeVisible();

  await page.getByText(en.wardrobe.today.more).click();
  await page.getByLabel(en.wardrobe.today.time).selectOption("day");
  await page.getByRole("button", { name: en.wardrobe.occasions.professional }).click();
  await page.getByRole("button", { name: en.wardrobe.today.wearOf.replace("{name}", "Citrus Day") }).click();
  await page.getByLabel(en.wardrobe.today.sprays).fill("2");
  await page.getByRole("button", { name: en.wardrobe.today.save }).click();
  await expect(page.getByRole("status").filter({ hasText: en.wardrobe.today.saved.replace("{name}", "Citrus Day") })).toBeVisible();
  expect(db.posts.wear[0]).toMatchObject({ bottle_id: db.bottles[0].id, occasion: "professional", time_of_day: "day", temp_c: 35, sprays: 2 });
  expect(db.posts.wear[0].worn_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  // The log shows up in the statistics.
  await page.getByRole("button", { name: en.wardrobe.tabs.stats }).click();
  await expect(page.getByText(en.wardrobe.stats.total.replace("{wearings}", "1").replace("{bottles}", "1"))).toBeVisible();
});

test("the wish list keeps what you want, and a wish-list bottle is never suggested", async ({ page }) => {
  await flagOn(page);
  await signIn(page);
  const db = await fakeApi(page, { bottles: [bottle(1, { name: "Owned One", family: "woody" })] });
  await page.goto("/wardrobe?section=lists");
  await page.getByRole("button", { name: en.wardrobe.lists.addTo.replace("{list}", en.wardrobe.lists.wishlist) }).click();
  await page.getByLabel(en.wardrobe.collection.name).fill("Someday Bottle");
  await page.getByRole("button", { name: en.wardrobe.collection.save, exact: true }).click();
  await expect(page.getByText("Someday Bottle", { exact: true })).toBeVisible();
  expect(db.posts.bottles[0]).toMatchObject({ name: "Someday Bottle", status: "wishlist" });
  await page.getByRole("button", { name: en.wardrobe.tabs.today }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Owned One" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Someday Bottle" })).toHaveCount(0);
});

test("a bad value is named in the form, not sent", async ({ page }) => {
  await flagOn(page);
  await signIn(page);
  const db = await fakeApi(page);
  await page.goto("/wardrobe?section=collection");
  await page.getByRole("button", { name: en.wardrobe.collection.add }).click();
  await page.getByLabel(en.wardrobe.collection.name).fill("Test");
  await page.getByLabel(en.wardrobe.collection.fill).fill("150");
  await page.getByRole("button", { name: en.wardrobe.collection.save, exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: en.wardrobe.fields.fill_pct })).toBeVisible();
  expect(db.posts.bottles).toHaveLength(0);
});

test("Arabic at 320 px: no sideways scroll, no axe violations on any section", async ({ page }) => {
  await flagOn(page);
  await signIn(page);
  await fakeApi(page, {
    locale: "ar",
    bottles: [bottle(1, { name: "عود الليل", family: "oriental", price: 120, currency: "EGP", fill_pct: 10 }), bottle(2, { name: "ليمون", family: "fresh" })],
    wear: [{ id: idFor(50), bottle_id: idFor(1), worn_on: "2026-10-01", occasion: "date", temp_c: 14 }],
  });
  await page.setViewportSize({ width: 320, height: 700 });
  for (const section of ["today", "collection", "stats", "lists"]) {
    await page.goto(section === "today" ? "/wardrobe" : `/wardrobe?section=${section}`);
    await expect(page.getByRole("heading", { level: 1, name: ar.wardrobe.title })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, section).toBe(false);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations, section).toEqual([]);
  }
});

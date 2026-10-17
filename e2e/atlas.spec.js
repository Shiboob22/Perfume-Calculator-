import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

test.use({ serviceWorkers: "block" });

// The Atlas (Phase 5), against the production build with a fake session and
// a fake API. Flagged: off, /atlas returns to the Bench; on, the whole loop
// works (search with filters in the URL, a fragrance page with the notes as
// light, browse, an entity page, contributing, the review queue, and the
// Wardrobe opt-in for community counts).

const ID1 = "88888888-8888-4888-8888-000000000001";
const ID2 = "88888888-8888-4888-8888-000000000002";
const F1 = {
  id: ID1, name: "Citrus Dawn", brand: "Maison Test", year: 2008, tier: "fresh", olfactory_family: "Fresh", gender: "unisex", rating: 4.1, country: "France",
  accords: ["Citrus", "Woody"], top_notes: ["Lemon", "Bergamot"], middle_notes: ["Neroli"], base_notes: ["Cedar", "Musk"], perfumers: ["Ada Test"],
  source: "Perfume dataset", image_url: null, status: "approved",
};
const F2 = { ...F1, id: ID2, name: "Amber Dusk", tier: "oriental", accords: ["Amber"], top_notes: ["Saffron"], middle_notes: [], base_notes: ["Amber"] };

async function fakeApi(page, { locale = "en", admin = false, wear = { shown: false }, terms = [], queue = [], submitError = null } = {}) {
  const seen = { search: [], submit: [], review: [], profilePosts: [] };
  const pending = queue.map((q) => ({ ...q }));
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const one = (req.headers().accept || "").includes("pgrst.object");
    const rows = (arr) => json(route, one ? arr[0] ?? null : arr);
    const path = url.pathname;
    if (path.includes("/auth/v1/user")) return json(route, USER);
    if (path.endsWith("/rest/v1/profiles")) {
      if (req.method() !== "GET") { seen.profilePosts.push(req.postDataJSON()); return json(route, [], 201); }
      return rows([{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", wear_stats_opt_in: false }]);
    }
    if (path.endsWith("/rpc/is_admin")) return json(route, admin);
    if (path.endsWith("/rpc/atlas_search")) {
      const args = req.postDataJSON();
      seen.search.push(args);
      const all = [F1, F2].map((f) => ({ ...f, total: 2 }));
      return json(route, args.p_q && !/citrus|dawn|amber|dusk|versace/i.test(args.p_q) ? [] : all);
    }
    if (path.endsWith("/rpc/similar_fragrances")) return json(route, { basis: "accords", similar: [F2], same_brand: [] });
    if (path.endsWith("/rpc/atlas_wear_stats")) return json(route, wear);
    if (path.endsWith("/rpc/atlas_submit")) {
      seen.submit.push(req.postDataJSON());
      return submitError ? json(route, { code: submitError, message: "x" }, 409) : json(route, ID2, 200);
    }
    if (path.endsWith("/rpc/atlas_queue")) return json(route, pending);
    if (path.endsWith("/rpc/atlas_review")) {
      const args = req.postDataJSON();
      seen.review.push(args);
      const i = pending.findIndex((p) => p.id === args.p_id);
      if (i >= 0) pending.splice(i, 1);
      return json(route, null, 204);
    }
    if (path.endsWith("/rest/v1/atlas_terms")) return json(route, terms);
    if (path.endsWith("/rest/v1/atlas_houses")) return url.searchParams.get("key") ? rows([{ key: "maison test", name: "Maison Test", fragrances: 2, first_year: 2008, last_year: 2015, avg_rating: 4.1 }]) : json(route, [{ key: "maison test", name: "Maison Test", fragrances: 2 }]);
    if (path.endsWith("/rest/v1/atlas_notes")) return json(route, [{ key: "bergamot", name: "Bergamot", fragrances: 40 }]);
    if (path.endsWith("/rest/v1/atlas_accords")) return json(route, [{ key: "citrus", name: "Citrus", fragrances: 90 }]);
    if (path.endsWith("/rest/v1/atlas_perfumers")) return json(route, [{ key: "ada test", name: "Ada Test", fragrances: 3 }]);
    if (path.endsWith("/rest/v1/fragrances")) {
      const id = url.searchParams.get("id")?.replace("eq.", "");
      return rows([F1, F2].filter((f) => !id || f.id === id));
    }
    if (path.endsWith("/rest/v1/wardrobe_bottles") || path.endsWith("/rest/v1/wear_log")) return json(route, req.method() === "GET" ? [] : [{ id: "x" }], req.method() === "GET" ? 200 : 201);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, { plan: "free", name: "Free", features: FEATURES.slice(0, 1), batchCap: 25, batchesUsed: 0 });
    return json(route, {});
  });
  return seen;
}
const flags = (page, ...names) => page.addInitScript((list) => list.forEach((n) => localStorage.setItem(`kyphira.flag.${n}`, "1")), names);

test("with the flag off, /atlas returns to the Bench and the nav has no Atlas link", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/atlas");
  await expect(page).toHaveURL(/\/bench$/);
  await expect(page.getByRole("link", { name: en.site.nav.atlas })).toHaveCount(0);
});

test("search keeps the filters in the URL and opens a fragrance with its notes as light", async ({ page }) => {
  await flags(page, "atlas");
  await signIn(page);
  const seen = await fakeApi(page, { wear: { shown: true, owners: 25, wearers: 10, occasions: ["date"] } });
  await page.goto("/atlas");
  await expect(page.getByRole("heading", { level: 1, name: en.atlas.title })).toBeVisible();
  await expect(page.getByText(en.atlas.search.start)).toBeVisible();

  await page.getByRole("searchbox", { name: en.atlas.search.label }).fill("citrus");
  await page.getByRole("search").getByRole("button", { name: en.atlas.search.submit }).click();
  await expect(page).toHaveURL(/q=citrus/);
  await expect(page.getByRole("link", { name: "Citrus Dawn" })).toBeVisible();
  await expect(page.getByText(en.atlas.search.results.replace("{count}", "2"))).toBeVisible();
  expect(seen.search.at(-1)).toMatchObject({ p_q: "citrus", p_limit: 24, p_offset: 0 });

  // Filters come from the URL and go to the function.
  await page.goto("/atlas?family=woody&from=2000&to=2010&note=Bergamot");
  await expect(page.getByRole("link", { name: "Citrus Dawn" })).toBeVisible();
  expect(seen.search.at(-1)).toMatchObject({ p_family: "woody", p_year_from: 2000, p_year_to: 2010, p_note: "Bergamot" });

  await page.getByRole("link", { name: "Citrus Dawn" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Citrus Dawn" })).toBeVisible();
  const figure = page.getByRole("figure", { name: en.atlas.fragrance.pyramid });
  for (const layer of ["top", "heart", "base"]) await expect(figure.getByRole("heading", { name: en.atlas.fragrance.layers[layer] })).toBeVisible();
  await expect(figure.getByRole("link", { name: "Lemon" })).toHaveAttribute("href", "/atlas/note/lemon");
  await expect(page.getByRole("link", { name: "Citrus" })).toHaveAttribute("href", "/atlas/accord/citrus");
  await expect(page.getByRole("link", { name: "Ada Test" })).toBeVisible();
  await expect(page.getByText(en.atlas.fragrance.wear.owners.replace("{n}", "25"))).toBeVisible();
  await expect(page.getByRole("heading", { name: en.atlas.fragrance.similar })).toBeVisible();
  await expect(page.getByText(en.atlas.fragrance.source.replace("{source}", "Perfume dataset"))).toBeVisible();
});

test("an unknown search says so, and no counts show below the threshold", async ({ page }) => {
  await flags(page, "atlas");
  await signIn(page);
  await fakeApi(page);
  await page.goto("/atlas?q=zzzz");
  await expect(page.getByText(en.atlas.search.none)).toBeVisible();
  await page.goto(`/atlas/fragrance/${ID1}`);
  await expect(page.getByRole("heading", { level: 2, name: "Citrus Dawn" })).toBeVisible();
  await expect(page.getByText(en.atlas.fragrance.wear.title)).toHaveCount(0);
});

test("browse lists houses, and a house page lists its fragrances", async ({ page }) => {
  await flags(page, "atlas");
  await signIn(page);
  const seen = await fakeApi(page);
  await page.goto("/atlas/browse");
  await page.getByRole("link", { name: /Maison Test/ }).click();
  await expect(page).toHaveURL(/\/atlas\/house\/maison%20test/);
  await expect(page.getByRole("heading", { level: 2, name: "Maison Test" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Amber Dusk" })).toBeVisible();
  expect(seen.search.at(-1)).toMatchObject({ p_house: "Maison Test" });
  await page.goto("/atlas/browse");
  await page.getByRole("button", { name: en.atlas.browse.kinds.note }).click();
  await expect(page.getByRole("link", { name: /Bergamot/ })).toBeVisible();
});

test("contributing names a bad field, sends a good one, and says when the name exists", async ({ page }) => {
  await flags(page, "atlas");
  await signIn(page);
  const seen = await fakeApi(page);
  await page.goto("/atlas/contribute");
  await page.getByLabel(en.atlas.contribute.name).fill("Quiet Cedar");
  await page.getByLabel(en.atlas.contribute.year).fill("1500");
  await page.getByRole("button", { name: en.atlas.contribute.send }).click();
  await expect(page.getByRole("alert").filter({ hasText: en.atlas.fields.tier })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: en.atlas.fields.year })).toBeVisible();
  expect(seen.submit).toHaveLength(0);

  await page.getByLabel(en.atlas.contribute.tier).selectOption("woody");
  await page.getByLabel(en.atlas.contribute.year).fill("2021");
  await page.getByLabel(en.atlas.contribute.top).fill("Cedar, Pepper");
  await page.getByRole("button", { name: en.atlas.contribute.send }).click();
  await expect(page.getByRole("status").filter({ hasText: en.atlas.contribute.sent.replace("{name}", "Quiet Cedar") })).toBeVisible();
  expect(seen.submit[0].p).toMatchObject({ name: "Quiet Cedar", tier: "woody", year: 2021, top_notes: ["Cedar", "Pepper"], brand: null });
});

test("a duplicate name is explained", async ({ page }) => {
  await flags(page, "atlas");
  await signIn(page);
  await fakeApi(page, { submitError: "23505" });
  await page.goto("/atlas/contribute");
  await page.getByLabel(en.atlas.contribute.name).fill("Citrus Dawn");
  await page.getByLabel(en.atlas.contribute.tier).selectOption("fresh");
  await page.getByRole("button", { name: en.atlas.contribute.send }).click();
  await expect(page.getByRole("alert").filter({ hasText: en.atlas.contribute.exists })).toBeVisible();
});

test("the review queue is for editors: others are told, editors approve", async ({ page }) => {
  await flags(page, "atlas");
  await signIn(page);
  await fakeApi(page);
  await page.goto("/atlas/review");
  await expect(page.getByText(en.atlas.review.notAdmin)).toBeVisible();
  await expect(page.getByRole("link", { name: en.atlas.nav.review })).toHaveCount(0);
});

test("an editor sees the queue and approves a suggestion", async ({ page }) => {
  await flags(page, "atlas");
  await signIn(page);
  const seen = await fakeApi(page, { admin: true, queue: [{ ...F2, id: ID2, name: "Pending One", status: "pending" }] });
  await page.goto("/atlas/review");
  await expect(page.getByRole("heading", { level: 3, name: "Pending One" })).toBeVisible();
  await page.getByRole("button", { name: en.atlas.review.approve }).click();
  await expect(page.getByRole("status").filter({ hasText: en.atlas.review.approved.replace("{name}", "Pending One") })).toBeVisible();
  expect(seen.review).toEqual([{ p_id: ID2, p_approve: true }]);
  await expect(page.getByText(en.atlas.review.empty)).toBeVisible();
});

test("the Wardrobe opt-in for community counts starts off and saves when turned on", async ({ page }) => {
  await flags(page, "atlas", "wardrobe");
  await signIn(page);
  const seen = await fakeApi(page);
  await page.goto("/wardrobe");
  const box = page.getByRole("checkbox", { name: en.wardrobe.privacy.label });
  await expect(box).not.toBeChecked();
  await box.check();
  await expect(page.getByText(en.wardrobe.privacy.saved)).toBeVisible();
  expect(seen.profilePosts.at(-1)).toMatchObject({ wear_stats_opt_in: true });
});

test("Arabic at 320 px: Arabic names, no sideways scroll, no axe violations", async ({ page }) => {
  await flags(page, "atlas");
  await signIn(page);
  await fakeApi(page, { locale: "ar", admin: true, terms: [{ kind: "note", key: "lemon", ar: "ليمون" }, { kind: "house", key: "maison test", ar: "ميزون تست" }],
    wear: { shown: true, owners: 10, wearers: null, occasions: [] }, queue: [{ ...F2, name: "Pending One", status: "pending" }] });
  await page.setViewportSize({ width: 320, height: 700 });
  const pages = [["/atlas?q=citrus", ar.atlas.title], [`/atlas/fragrance/${ID1}`, ar.atlas.title], ["/atlas/browse", ar.atlas.title], ["/atlas/house/maison%20test", ar.atlas.title], ["/atlas/contribute", ar.atlas.title], ["/atlas/review", ar.atlas.title]];
  for (const [url, h1] of pages) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, url).toBe(false);
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {})))); // entrances settle first: axe must not read a half-faded colour
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations, url).toEqual([]);
  }
  await page.goto(`/atlas/fragrance/${ID1}`);
  await expect(page.getByRole("link", { name: "ليمون" })).toBeVisible();   // the Arabic note name
  await expect(page.getByRole("link", { name: ar.atlas.fragrance.by.replace("{house}", "ميزون تست") })).toBeVisible();
});

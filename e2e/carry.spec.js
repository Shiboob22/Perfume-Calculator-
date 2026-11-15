import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Motion M2, carry: continuity between screens, against the production build
// with a fake session and a fake API. A View Transition is recorded as it
// runs (its direction, which element holds the shared name before and after
// the new state is pictured); reduced motion cuts; browser back returns to
// where a list was scrolled; nothing shifts the layout on the way.
test.use({ serviceWorkers: "block" });

const DAY = 86400000;
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bid = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
function batch(n, name, daysAgo) {
  const started = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: bid(n), user_id: USER.id, batch_no: n, fragrance_name: name, tier: "woody", concentration_pct: 20, amount: 50, unit: "ml",
    blend_date: localDate(started), created_at: started.toISOString(), remind: false,
    oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: 50, basis: "volume", batch_checkins: [], shared_recipes: null,
  };
}
const NAMES = ["Amber Room", "Neroli Eau", "Santal Dry", "Tuberose Soir", "Tonka Praline", "Vetiver Cut", "Iris Pale", "Oud Smoke", "Fig Leaf", "Cedar Ink", "Rose Tar", "Musk Linen"];
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 12 };

const F1 = {
  id: "88888888-8888-4888-8888-000000000001", name: "Citrus Dawn", brand: "Maison Test", year: 2008, tier: "fresh", olfactory_family: "Fresh", gender: "unisex", rating: 4.1,
  accords: ["Citrus"], top_notes: ["Lemon"], middle_notes: ["Neroli"], base_notes: ["Cedar"], perfumers: [], source: "Perfume dataset", image_url: null, status: "approved",
};
const F2 = { ...F1, id: "88888888-8888-4888-8888-000000000002", name: "Amber Dusk", tier: "oriental", accords: ["Amber"] };

async function fakeApi(page, { fragranceDelay = 400, locale = "en" } = {}) {
  const batches = NAMES.map((name, i) => batch(NAMES.length - i, name, 3 + i * 9));
  await page.route(/\/(auth|rest)\/v1\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const one = (req.headers().accept || "").includes("pgrst.object");
    const rows = (arr) => json(route, one ? arr[0] ?? null : arr);
    if (path.includes("/auth/v1/user")) return json(route, USER);
    if (path.endsWith("/rest/v1/profiles")) return rows([{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", wear_stats_opt_in: false }]);
    if (path.endsWith("/rpc/is_admin")) return json(route, false);
    if (path.endsWith("/rpc/atlas_search")) return json(route, [F1, F2].map((f) => ({ ...f, total: 2 })));
    if (path.endsWith("/rpc/similar_fragrances")) return json(route, { basis: "accords", similar: [F2], same_brand: [] });
    if (path.endsWith("/rpc/atlas_wear_stats")) return json(route, { shown: false });
    if (path.endsWith("/rest/v1/fragrances")) {
      // The page's own row arrives a little after the route, as on a phone.
      await new Promise((r) => setTimeout(r, fragranceDelay));
      const id = url.searchParams.get("id")?.replace("eq.", "");
      return rows([F1, F2].filter((f) => !id || f.id === id));
    }
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, PRO);
    if (p === "/api/batches") return json(route, { batches });
    if (p === "/api/checkins") return json(route, { patterns: {}, locked: false });
    return json(route, {});
  });
  return batches;
}

// Motion layer on, a device that is not low power, and a record of every View Transition.
const setup = (page, flags = []) => page.addInitScript((list) => {
  localStorage.setItem("kyphira.flag.motion", "1");
  for (const n of list) localStorage.setItem(`kyphira.flag.${n}`, "1");
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  window.__vts = [];
  addEventListener("pointerdown", () => { window.__firstTap ??= performance.now(); }, { capture: true });
  window.__shifts = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shifts.push({ value: e.value, recent: e.hadRecentInput, t: e.startTime }); }).observe({ type: "layout-shift", buffered: true });
  const named = () => [...document.querySelectorAll("[data-mo-share], [data-mo-share-to]")]
    .filter((el) => el.style.viewTransitionName === "mo-share")
    .map((el) => (el.hasAttribute("data-mo-share-to") ? `to:${el.getAttribute("data-mo-share-to")}` : `from:${el.getAttribute("data-mo-share")}`));
  const start = document.startViewTransition?.bind(document);
  if (!start) return;
  document.startViewTransition = (cb) => {
    const rec = { nav: document.documentElement.getAttribute("data-mo-nav"), before: named(), after: null, done: false };
    window.__vts.push(rec);
    const t = start(async () => { await cb(); rec.after = named(); });
    // Read after the layer's own clean-up, which is attached after this one.
    t.finished.finally(() => setTimeout(() => { rec.left = named(); rec.vt = document.documentElement.hasAttribute("data-mo-vt"); rec.done = true; }, 0));
    return t;
  };
}, flags);
const vts = (page) => page.evaluate(() => window.__vts);
const lastVt = async (page) => {
  await expect.poll(async () => (await vts(page)).at(-1)?.done ?? false).toBe(true);
  return (await vts(page)).at(-1);
};
// Layout shift (as CLS counts it: not within 500 ms of an input) from the first tap on: the transitions' own.
const cls = (page) => page.evaluate(() => window.__shifts.filter((s) => !s.recent && s.t >= (window.__firstTap ?? Infinity)).reduce((a, s) => a + s.value, 0));

test("a batch picked in the Journal carries its name into the detail", async ({ page }, info) => {
  await setup(page);
  await signIn(page);
  const batches = await fakeApi(page);
  await page.goto("/journal");
  const row = page.locator(`button[data-batch="${batches[2].id}"]`);
  await expect(page.locator("#journal-batch")).toBeVisible();
  // The detail's heading and the row both on screen (the share only runs between two things the eye can see).
  await page.evaluate(() => window.scrollTo(0, document.querySelector("#journal-batch").getBoundingClientRect().top + window.scrollY - 80));
  await row.click();
  await expect(page.getByRole("heading", { level: 2, name: "Santal Dry" })).toBeVisible();
  const vt = await lastVt(page);
  expect(vt.nav).toBe("fade"); // the same page: a cross-fade, no travel
  expect(vt.before).toEqual([`from:batch-${batches[2].id}`]);
  // One name at a time: in the new state it is on the detail's heading when that is on screen (desktop), else it stays on the row.
  if (info.project.name === "desktop") expect(vt.after).toEqual([`to:batch-${batches[2].id}`]);
  else expect(vt.after).toHaveLength(1);
  expect(vt.left).toEqual([]); // the names are gone once it has run
  expect(vt.vt).toBe(false);
  expect(await cls(page)).toBe(0);
});

test("a fragrance card goes forward into its page, its name in place at once, and back out", async ({ page }) => {
  await setup(page, ["atlas"]);
  await signIn(page);
  await fakeApi(page);
  await page.goto("/atlas?q=citrus");
  await page.getByRole("link", { name: "Citrus Dawn" }).click();
  // The heading is there before the row arrives (the card carried the name).
  await expect(page.getByRole("heading", { level: 2, name: "Citrus Dawn" })).toBeVisible();
  const forward = await lastVt(page);
  expect(forward.nav).toBe("forward");
  expect(forward.before).toEqual([`from:frag-${F1.id}`]);
  expect(forward.after).toEqual([`to:frag-${F1.id}`]);
  await expect(page.getByRole("heading", { name: en.atlas.fragrance.notes })).toBeVisible();

  await page.locator("article").getByRole("link", { name: en.atlas.nav.search, exact: true }).click();
  await expect(page).toHaveURL(/\/atlas$/);
  expect((await lastVt(page)).nav).toBe("back");
  expect(await cls(page)).toBe(0);
});

test("changing room is a cross-fade", async ({ page }) => {
  await setup(page);
  await signIn(page);
  await fakeApi(page);
  await page.goto("/journal");
  await page.getByRole("link", { name: en.journal.page.records }).click();
  await expect(page).toHaveURL(/\/bench\/journal/);
  expect((await lastVt(page)).nav).toBe("fade");
});

test("in Arabic the same directions run, mirrored", async ({ page }) => {
  await setup(page, ["atlas"]);
  await signIn(page);
  await fakeApi(page, { locale: "ar", fragranceDelay: 0 });
  await page.goto("/atlas?q=citrus");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("link", { name: "Citrus Dawn" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Citrus Dawn" })).toBeVisible();
  const vt = await lastVt(page);
  expect(vt.nav).toBe("forward");
  expect(vt.after).toEqual([`to:frag-${F1.id}`]);
  // "From the end edge" is the left in Arabic: --mo-dir flips the travel.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mo-dir").trim())).toBe("-1");
});

test("reduced motion: a route change and a pick are cuts, with no transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page, ["atlas"]);
  await signIn(page);
  const batches = await fakeApi(page, { fragranceDelay: 0 });
  await page.goto("/journal");
  await page.locator(`button[data-batch="${batches[1].id}"]`).click();
  await expect(page.getByRole("heading", { level: 2, name: "Neroli Eau" })).toBeVisible();
  await page.goto("/atlas?q=citrus");
  await page.getByRole("link", { name: "Citrus Dawn" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Citrus Dawn" })).toBeVisible();
  expect(await vts(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-mo-nav"))).toBe(false);
});

test("browser back returns to where the list was scrolled", async ({ page }) => {
  await setup(page);
  await signIn(page);
  await fakeApi(page);
  await page.goto("/journal");
  await expect(page.locator("button[data-batch]").first()).toBeVisible();
  const link = page.getByRole("link", { name: en.journal.page.records });
  await link.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(100);
  await link.click();
  await expect(page).toHaveURL(/\/bench\/journal/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5); // a new page opens at its top
  await page.goBack();
  await expect(page).toHaveURL(/\/journal/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 3);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(y + 3);
});

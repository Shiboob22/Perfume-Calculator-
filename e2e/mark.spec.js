import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Motion M4, mark: the product's signature (a logged batch is filed into the
// Journal), the Journal's Ready day, and a Search result that grows from its
// row. Against the production build with a fake session and a fake API.
test.use({ serviceWorkers: "block" });

const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };
const DAY = 86400000;
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bid = (n) => `cccccccc-cccc-4ccc-8ccc-${String(n).padStart(12, "0")}`;
function batch(n, daysAgo) {
  const started = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: bid(n), user_id: USER.id, batch_no: n, fragrance_name: `Batch ${n}`, tier: "woody", concentration_pct: 20, amount: 50, unit: "ml",
    blend_date: localDate(started), created_at: started.toISOString(), remind: false,
    oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: 50, basis: "volume", batch_checkins: [], shared_recipes: null,
  };
}

async function fakeApi(page, { locale = "en", batches = [] } = {}) {
  const logs = [];
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    if (url.includes("/rest/v1/rpc/ensure_fragrance")) return json(route, [{ id: "22222222-2222-4222-8222-222222222222", name: "Oud Nights", tier: "woody" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/me") return json(route, PRO);
    if (path === "/api/batches" && req.method() === "POST") {
      const body = req.postDataJSON();
      logs.push(body);
      return json(route, { success: true, batch: { ...body, user_id: USER.id, batch_no: 72 } }, 201);
    }
    if (path === "/api/batches") return json(route, { batches });
    if (path === "/api/checkins") return json(route, { patterns: {}, locked: false });
    return json(route, {});
  });
  return logs;
}

// Motion layer on, not a low-power device; record every signature that starts (its label, where it went).
const setup = (page) => page.addInitScript(() => {
  localStorage.setItem("kyphira.flag.motion", "1");
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  window.__sig = [];
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && n.hasAttribute("data-mo-signature")) window.__sig.push({ label: n.textContent, at: performance.now(), hidden: n.getAttribute("aria-hidden"), events: getComputedStyle(n).pointerEvents });
    }
  }).observe(document, { childList: true, subtree: true }); // the document: its element may not exist yet
});
const sigs = (page) => page.evaluate(() => window.__sig);

async function logOnTheBench(page, m = en) {
  await page.goto("/bench?size=50&unit=ml&conc=25&family=woody&name=Oud%20Nights");
  const log = page.getByRole("button", { name: m.calc.log, exact: true });
  await log.scrollIntoViewIfNeeded();
  await log.click();
}

test("a logged batch is filed into the Journal: capped, labelled, carried, taken, in under a second", async ({ page }) => {
  await setup(page);
  await signIn(page);
  const logs = await fakeApi(page);
  await logOnTheBench(page);
  // The words of record arrive at once, whatever the motion does.
  await expect(page.getByText(en.calc.loggedNo.replace("{no}", "072"))).toBeVisible();
  expect(logs).toHaveLength(1);
  await expect.poll(async () => (await sigs(page)).length).toBe(1);
  const [s] = await sigs(page);
  expect(s.label).toBe("No. 072");
  expect(s.hidden).toBe("true");
  expect(s.events).toBe("none");
  // It is gone well within a second and a half (900 ms, plus a frame or two to start).
  await expect(page.locator("[data-mo-signature]")).toHaveCount(0, { timeout: 1500 });
  // The page never waited: the next action is there.
  await expect(page.locator("[data-journal-door]")).toBeVisible();
});

test("any tap skips it", async ({ page }) => {
  await setup(page);
  await signIn(page);
  await fakeApi(page);
  await logOnTheBench(page);
  await expect(page.locator("[data-mo-signature]")).toHaveCount(1);
  const t0 = await page.evaluate(() => performance.now());
  await page.mouse.click(5, 300);
  await expect(page.locator("[data-mo-signature]")).toHaveCount(0);
  const gone = await page.evaluate(() => performance.now());
  expect(gone - t0).toBeLessThan(400);
});

test("reduced motion: the words alone, no signature", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  await signIn(page);
  await fakeApi(page);
  await logOnTheBench(page);
  await expect(page.getByText(en.calc.loggedNo.replace("{no}", "072"))).toBeVisible();
  await page.waitForTimeout(400);
  expect(await sigs(page)).toEqual([]);
});

test("in Arabic it plays the same, toward the Journal wherever it sits", async ({ page }) => {
  await setup(page);
  await signIn(page);
  await fakeApi(page, { locale: "ar" });
  await logOnTheBench(page, ar);
  await expect.poll(async () => (await sigs(page)).length).toBe(1);
  expect((await sigs(page))[0].label).toBe(ar.journal.page.no.replace("{no}", "072"));
});

test("Ready day: the first time a rested batch is opened it turns to ready, once", async ({ page }) => {
  await setup(page);
  await signIn(page);
  await fakeApi(page, { batches: [batch(1, 95), batch(2, 10)] });
  await page.goto(`/journal?batch=${bid(1)}`);
  const moment = page.locator("[data-ready-moment]");
  await expect(moment).toBeVisible();
  await expect(moment).toHaveText(en.journal.page.ready);
  await expect(page.locator("[data-ready-fill]")).toHaveClass(/kx-ready-fill/);
  // A batch still resting has no moment.
  await page.goto(`/journal?batch=${bid(2)}`);
  await expect(page.getByRole("heading", { level: 2, name: "Batch 2" })).toBeVisible();
  await expect(page.locator("[data-ready-fill]")).toHaveCount(0);
  // Seen once: the next visit shows it ready, without the moment.
  await page.goto(`/journal?batch=${bid(1)}`);
  await expect(page.getByRole("heading", { level: 2, name: "Batch 1" })).toBeVisible();
  await expect(page.locator("[data-ready-fill]")).toHaveCount(1);
  await expect(page.locator("[data-ready-moment]")).toHaveCount(0);
});

test("Search: the result you open grows from its row into the detail", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "on a phone the detail opens below the list, off screen: a plain swap there");
  await setup(page);
  await page.addInitScript(() => {
    window.__vt = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    const named = () => [...document.querySelectorAll("[data-mo-share], [data-mo-share-to]")].filter((el) => el.style.viewTransitionName === "mo-share")
      .map((el) => (el.hasAttribute("data-mo-share-to") ? "to" : "from"));
    document.startViewTransition = (cb) => { const rec = { before: named() }; window.__vt.push(rec); return start(async () => { await cb(); rec.after = named(); }); };
  });
  await signIn(page);
  await fakeApi(page);
  const row = { id: "33333333-3333-4333-8333-333333333333", name: "Maison Test Cedar Ink", brand: "Maison Test", tier: "woody", year: 2019, accords: ["Woody"], status: "approved" };
  await page.route(/\/api\/search\?/, (route) => json(route, { results: [row], hasMore: false }));
  await page.route(/\/api\/similar\?/, (route) => json(route, { similar: [], same_brand: [] }));
  await page.goto("/app/search");
  await page.locator("#search-input").fill("cedar");
  const result = page.locator(`[data-mo-share="search-${row.id}"]`);
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.locator(`[data-mo-share-to="search-${row.id}"]`)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__vt.at(-1)?.after ?? null)).toEqual(["to"]);
  expect(await page.evaluate(() => window.__vt.at(-1).before)).toEqual(["from"]);
});

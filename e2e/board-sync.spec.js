import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Board sync (docs/redesign/BOARD-SYNC.md): what each room's board changed,
// checked in the DOM. With BOARD_SHOTS=<dir> each room also saves its four
// variants (375 / 1440 × EN / AR) to <dir>/<room>/ for the side-by-side with
// the board frames. Run on the "desktop" project only (it sets the viewports).

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });

const SHOTS = process.env.BOARD_SHOTS;
const VIEWS = [["375", { width: 375, height: 812 }], ["1440", { width: 1440, height: 900 }]];

async function shoot(page, room, name) {
  if (!SHOTS) return;
  mkdirSync(`${SHOTS}/${room}`, { recursive: true });
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/${room}/${name}.png`, fullPage: true });
}

test.describe("Homepage (Compounding)", () => {
  // eslint-disable-next-line no-unused-vars -- Playwright needs a destructured first argument
  test.beforeEach(({ page }, testInfo) => { test.skip(testInfo.project.name !== "desktop", "viewport set per test"); });
  for (const [vname, size] of VIEWS) {
    for (const [lang, path, m] of [["en", "/", en], ["ar", "/ar", ar]]) {
      test(`home ${vname} ${lang}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.goto(path);
        const h1 = page.getByRole("heading", { level: 1 });
        for (const line of m.site.home.hero) await expect(h1).toContainText(line);
        // A way past the scene for anyone who does not want to scroll it.
        const skip = page.getByRole("link", { name: m.site.compounding.afternoon.skip });
        if (await skip.count()) {
          await expect(skip).toHaveAttribute("href", "#cmp-rooms");
          await expect(page.locator("#cmp-rooms li")).toHaveCount(6);
          await expect(page.locator("#cmp-rooms li").first()).toContainText("I");
        }
        await shoot(page, "homepage", `${vname}-${lang}`);
      });
    }
  }
});

// ---- signed-in rooms: a fake session and a fake API (nothing reaches a project) ----

const DAY = 86400000;
const dateOnly = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const resting = (daysAgo) => {
  const started = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: "11111111-1111-4111-8111-111111111111", user_id: USER.id, fragrance_name: "Kyphi No. 3", tier: "woody", concentration_pct: 25, basis: "volume",
    blend_date: dateOnly(started), created_at: started.toISOString(), oil_g: 23.75, oil_ml: 25, ethanol_g: 60.75, ethanol_ml: 75, total_g: 84.5, total_ml: 100,
    batch_checkins: [], shared_recipes: null,
  };
};

const idFor = (n) => `77777777-7777-4777-8777-${String(n).padStart(12, "0")}`;
const bottle = (n, extra) => ({ id: idFor(n), user_id: USER.id, status: "owned", kind: "bottle", clusters: [], projection: null, fill_pct: null, size_ml: null, price: null, currency: null, note: null, purchase_date: null, fragrance_id: null, family: null, ...extra });

async function fakeApp(page, { locale = "en", batches = [resting(18)], bottles = [], wear = [], rpc = {}, fragrances = null, ai = null, plan = "pro", batchCap = null } = {}) {
  await signIn(page);
  await page.addInitScript((l) => globalThis.localStorage.setItem("sh-locale", l), locale);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    const fn = Object.keys(rpc).find((k) => url.includes(`/rpc/${k}`));
    if (fn) return json(route, rpc[fn](route.request().postDataJSON?.() ?? {}));
    if (url.includes("/rest/v1/atlas_terms")) return json(route, []);
    if (url.includes("/rest/v1/fragrances")) { const id = new URL(url).searchParams.get("id")?.replace("eq.", ""); return json(route, (fragrances || []).filter((f) => !id || f.id === id)); }
    if (url.includes("/rest/v1/wardrobe_bottles")) return json(route, bottles);
    if (url.includes("/rest/v1/wear_log")) return json(route, wear);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/me") return json(route, { plan, name: plan === "pro" ? "Pro" : "Free", features: plan === "pro" ? FEATURES : FEATURES.slice(0, 1), batchCap, batchesUsed: batches.length });
    if (pathname === "/api/ai" && ai) return json(route, ai);
    if (pathname === "/api/batches") return json(route, { batches });
    if (pathname === "/api/checkins") return json(route, { patterns: {}, locked: false });
    return json(route, {});
  });
}

test.describe("The Bench", () => {
  // eslint-disable-next-line no-unused-vars -- Playwright needs a destructured first argument
  test.beforeEach(({ page }, testInfo) => { test.skip(testInfo.project.name !== "desktop", "viewport set per test"); });
  for (const [vname, size] of VIEWS) {
    for (const [lang, m] of [["en", en], ["ar", ar]]) {
      test(`bench ${vname} ${lang}`, async ({ page }) => {
        await page.setViewportSize(size);
        await fakeApp(page, { locale: lang });
        await page.goto("/bench?size=100&unit=ml&conc=25&family=woody");
        await expect(page.getByRole("heading", { level: 1, name: m.calc.heading })).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

        // Stepper: ±5 mL on the size (typing still works), ±1 on the strength.
        const sizeField = page.getByRole("spinbutton", { name: m.calc.batchSize });
        await expect(sizeField).toHaveValue("100");
        await page.getByRole("button", { name: m.calc.stepper.batchMore.replace("{step}", "5").replace("{unit}", "mL") }).click();
        await expect(sizeField).toHaveValue("105");
        await sizeField.fill("37");
        await expect(sizeField).toHaveValue("37");
        await page.getByRole("button", { name: m.calc.stepper.concMore }).click();
        await expect(page.getByRole("group", { name: m.calc.concentration.replace("{pct}", "26") })).toContainText("26");

        // The resting card: days left as a figure, dates, a link to the Journal.
        const card = page.getByRole("link", { name: /Kyphi No\. 3/ }).first();
        await expect(card).toHaveAttribute("href", "/bench/journal");
        await expect(card).toContainText(/\d/);
        await shoot(page, "bench", `${vname}-${lang}`);
      });
    }
  }
});

test.describe("The Wardrobe", () => {
  // eslint-disable-next-line no-unused-vars -- Playwright needs a destructured first argument
  test.beforeEach(({ page }, testInfo) => { test.skip(testInfo.project.name !== "desktop", "viewport set per test"); });
  const bottles = [
    bottle(1, { name: "Santal 33", family: "woody", size_ml: 50, fill_pct: 60, currency: "EGP", price: 120 }),
    bottle(2, { name: "Oud Wood", family: "oud", size_ml: 50, fill_pct: 75 }),
    bottle(3, { name: "Neroli Portofino", family: "citrus", size_ml: 100 }),
  ];
  const wear = [{ id: idFor(50), bottle_id: idFor(1), worn_on: "2026-10-12", occasion: "date", temp_c: 21, sprays: 4 }];
  for (const [vname, size] of VIEWS) {
    for (const [lang, m] of [["en", en], ["ar", ar]]) {
      test(`wardrobe ${vname} ${lang}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.addInitScript(() => localStorage.setItem("kyphira.flag.wardrobe", "1"));
        await fakeApp(page, { locale: lang, bottles, wear });
        await page.goto("/wardrobe?section=collection");
        // The room's count is the headline; the room's name is still the h1.
        await expect(page.getByRole("heading", { level: 1, name: m.wardrobe.title })).toBeVisible();
        await expect(page.getByText(lang === "en" ? "3 bottles." : "3 زجاجات.")).toBeVisible();
        // A plate: its numeral and what is left in the bottle.
        await expect(page.getByText(m.wardrobe.leftOf.replace("{left}", "30").replace("{size}", "50"))).toBeVisible();
        await shoot(page, "wardrobe", `${vname}-${lang}-collection`);

        await page.goto("/wardrobe");
        await expect(page.getByRole("button", { name: m.wardrobe.tabs.today })).toBeVisible();
        const temp = page.getByLabel(m.wardrobe.today.temp);
        await page.getByRole("button", { name: m.wardrobe.today.tempMore }).click();
        await expect(temp).toHaveValue("23");
        await page.getByRole("button", { name: m.wardrobe.today.tempLess }).click();
        await expect(temp).toHaveValue("22");
        await page.getByRole("button", { name: m.wardrobe.occasions.date }).click();
        await expect(page.getByRole("button", { name: m.wardrobe.occasions.date })).toHaveAttribute("aria-pressed", "true");
        await shoot(page, "wardrobe", `${vname}-${lang}-tonight`);
      });
    }
  }
});

test.describe("The Library", () => {
  // eslint-disable-next-line no-unused-vars -- Playwright needs a destructured first argument
  test.beforeEach(({ page }, testInfo) => { test.skip(testInfo.project.name !== "desktop", "viewport set per test"); });
  for (const [vname, size] of VIEWS) {
    for (const [lang, path, m] of [["en", "/library", en], ["ar", "/ar/library", ar]]) {
      test(`library ${vname} ${lang}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.site.guides.title);
        // Category chips carry their counts; the glossary is its own tab, quoting the handbook.
        const all = page.getByRole("button", { name: new RegExp(`^${m.site.guides.sections.all}\\s*\\d+$`) });
        await expect(all).toHaveAttribute("aria-pressed", "true");
        await shoot(page, "library", `${vname}-${lang}-index`);
        await page.getByRole("button", { name: m.site.guides.tabs.glossary }).click();
        await expect(page.getByRole("heading", { level: 2, name: m.site.guides.tabs.glossary })).toBeAttached();
        await expect(page.locator("dl dt").first()).toBeVisible();
        await shoot(page, "library", `${vname}-${lang}-glossary`);
      });
    }
  }
});

test.describe("The Atlas", () => {
  // eslint-disable-next-line no-unused-vars -- Playwright needs a destructured first argument
  test.beforeEach(({ page }, testInfo) => { test.skip(testInfo.project.name !== "desktop", "viewport set per test"); });
  const F = (id, name, tier, year) => ({
    id, name, brand: "Maison Test", year, tier, olfactory_family: "Fresh", gender: "unisex", rating: 4.1, country: "France",
    accords: ["Citrus", "Woody"], top_notes: ["Lemon", "Bergamot"], middle_notes: ["Neroli"], base_notes: ["Cedar", "Musk"], perfumers: [],
    source: "Perfume dataset", image_url: null, status: "approved", total: 2,
  });
  const rows = [F("88888888-8888-4888-8888-000000000001", "Citrus Dawn", "fresh", 1996), F("88888888-8888-4888-8888-000000000002", "Amber Dusk", "oriental", 2014)];
  for (const [vname, size] of VIEWS) {
    for (const [lang, m] of [["en", en], ["ar", ar]]) {
      test(`atlas ${vname} ${lang}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.addInitScript(() => localStorage.setItem("kyphira.flag.atlas", "1"));
        const seen = [];
        await fakeApp(page, { locale: lang, fragrances: rows, rpc: { atlas_search: (a) => { seen.push(a); return rows; }, is_admin: () => false, similar_fragrances: () => ({ basis: "accords", similar: [], same_brand: [] }), atlas_wear_stats: () => ({ shown: false }) } });
        await page.goto("/atlas");
        await expect(page.getByRole("heading", { level: 1, name: m.atlas.title })).toBeVisible();
        // Family and era are chips that apply at once; the URL keeps them.
        await page.getByRole("button", { name: m.families.fresh.label, exact: true }).click();
        await expect(page).toHaveURL(/family=fresh/);
        await page.getByRole("button", { name: m.atlas.search.eras.y10 }).click();
        await expect(page).toHaveURL(/from=2010/);
        await expect.poll(() => seen.at(-1)).toMatchObject({ p_family: "fresh", p_year_from: 2010 });
        await expect(page.getByRole("button", { name: m.atlas.search.eras.y10 })).toHaveAttribute("aria-pressed", "true");
        await shoot(page, "atlas", `${vname}-${lang}-index`);
        await page.getByRole("link", { name: /Citrus Dawn/ }).first().click();
        await expect(page.getByRole("heading", { level: 2, name: "Citrus Dawn" })).toBeVisible();
        await shoot(page, "atlas", `${vname}-${lang}-detail`);
      });
    }
  }
});

test.describe("The Salon", () => {
  // eslint-disable-next-line no-unused-vars -- Playwright needs a destructured first argument
  test.beforeEach(({ page }, testInfo) => { test.skip(testInfo.project.name !== "desktop", "viewport set per test"); });
  const POSTS = [
    { id: "99999999-9999-4999-8999-000000000001", kind: "recipe", title: "Oud Nights", body: "My weekend blend.", family: "woody", snapshot: { amount: 100, unit: "ml", concentration_pct: 25, oil_density: 0.95 }, fragrance_id: null, fragrance_name: null, rating: null, status: "published", created_at: "2026-10-12T10:00:00Z", handle: "ada_p", display_name: "Ada", likes: 2, liked: false, mine: false },
  ];
  const info = { handle: "ada_p", display_name: "Ada Perfumer", bio: "Blender in Cairo.", mine: false, is_public: true, suspended: false, posts: 12, followers: 340, following: 18, i_follow: false, user_id: "99999999-9999-4999-8999-0000000000aa" };
  for (const [vname, size] of VIEWS) {
    for (const [lang, m] of [["en", en], ["ar", ar]]) {
      test(`salon ${vname} ${lang}`, async ({ page, context }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
        await page.setViewportSize(size);
        await page.addInitScript(() => localStorage.setItem("kyphira.flag.salon", "1"));
        await fakeApp(page, { locale: lang, rpc: { is_admin: () => false, salon_feed: () => POSTS, salon_profile: () => info } });
        await page.goto("/salon");
        await expect(page.getByRole("heading", { level: 1, name: m.salon.title })).toBeVisible();
        await shoot(page, "salon", `${vname}-${lang}-feed`);
        await page.goto("/salon/u/ada_p");
        // The header: initials, the name large, the three counts as figures, Follow and Share.
        await expect(page.getByRole("heading", { level: 2, name: "Ada Perfumer" })).toBeVisible();
        await expect(page.getByText("340", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: m.salon.profile.share })).toBeVisible();
        await shoot(page, "salon", `${vname}-${lang}-profile`);
      });
    }
  }
});

test.describe("The Nose", () => {
  // eslint-disable-next-line no-unused-vars -- Playwright needs a destructured first argument
  test.beforeEach(({ page }, testInfo) => { test.skip(testInfo.project.name !== "desktop", "viewport set per test"); });
  const PICKS = {
    kind: "picks", intro: "Warm woods with a soft base.",
    picks: [{ id: "88888888-8888-4888-8888-000000000001", name: "Amber Wood", brand: "Maison Test", year: 2019, family: "Woody", matched: ["Woody", "Amber"], reason: "Amber over a dry wood heart." }],
    shelf: [{ id: "77777777-7777-4777-8777-000000000001", name: "Santal 33", matched: ["Woody"] }],
  };
  for (const [vname, size] of VIEWS) {
    for (const [lang, m] of [["en", en], ["ar", ar]]) {
      test(`nose ${vname} ${lang}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.addInitScript(() => localStorage.setItem("kyphira.flag.nose", "1"));
        await fakeApp(page, { locale: lang, ai: PICKS });
        await page.goto("/nose");
        await expect(page.getByRole("heading", { level: 1, name: m.nose.title })).toBeVisible();
        await expect(page.getByText(m.nose.headline)).toBeVisible();
        await shoot(page, "nose", `${vname}-${lang}-ask`);
        await page.getByRole("button", { name: m.nose.starters.warm }).click();
        // The picks and the owner's shelf (matched on the server) side by side on wide screens.
        await expect(page.getByRole("heading", { level: 2, name: m.nose.shelf.title })).toBeVisible();
        await expect(page.getByText("Santal 33")).toBeVisible();
        await shoot(page, "nose", `${vname}-${lang}-answer`);
      });
    }
  }
});

test.describe("Account and sign-in", () => {
  // eslint-disable-next-line no-unused-vars -- Playwright needs a destructured first argument
  test.beforeEach(({ page }, testInfo) => { test.skip(testInfo.project.name !== "desktop", "viewport set per test"); });
  for (const [vname, size] of VIEWS) {
    for (const [lang, m] of [["en", en], ["ar", ar]]) {
      test(`signin ${vname} ${lang}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.addInitScript((l) => globalThis.localStorage.setItem("sh-locale", l), lang);
        await page.goto("/app");
        await expect(page.getByRole("heading", { level: 1, name: m.auth.heading })).toBeVisible();
        await shoot(page, "account", `${vname}-${lang}-signin`);
      });
      test(`account ${vname} ${lang}`, async ({ page }) => {
        await page.setViewportSize(size);
        await fakeApp(page, { locale: lang, plan: "free", batchCap: 25, batches: [resting(3)] });
        await page.goto("/app/account");
        await expect(page.getByRole("heading", { level: 1, name: m.account.title })).toBeVisible();
        // Real usage, drawn as the weight-scale line: batches used of the plan's cap.
        await expect(page.getByRole("meter", { name: m.account.plan.title })).toHaveAttribute("aria-valuemax", "25");
        await shoot(page, "account", `${vname}-${lang}-settings`);
      });
    }
  }
});

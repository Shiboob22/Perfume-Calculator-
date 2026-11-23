import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// UI/UX audit, the last polish batch (owner's go-ahead 2026-11-23): M10, M11,
// L1–L3, L5, L6, L8–L10. M13 is in order-queue.spec.js.
test.use({ serviceWorkers: "block" });

const AXE = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 1 };
const msgs = { en, ar };
const fill = (s, vars) => Object.entries(vars).reduce((x, [k, v]) => x.replaceAll(`{${k}}`, String(v)), s);
const OILS = [
  { fragrance_id: "f1", name: "Oud Nights", tier: "woody", stock_g: 40, low_threshold_g: 10 },
  { fragrance_id: "f2", name: "Neroli Bay", tier: "fresh", stock_g: 5, low_threshold_g: 10 },
];

const at = new Date(Date.now() - 8 * 86400000);
const BATCH = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001", user_id: USER.id, batch_no: 1, fragrance_name: "Oud Nights", tier: "woody", concentration_pct: 25, amount: 100, unit: "ml",
  blend_date: at.toISOString().slice(0, 10), created_at: at.toISOString(), remind: false, total_ml: 100, basis: "volume",
  oil_g: 23.75, ethanol_g: 60.75, total_g: 84.5, batch_checkins: [], shared_recipes: null,
};

async function app(page, { locale = "en", api = {} } = {}) {
  await page.addInitScript(() => localStorage.setItem("kyphira.renameNoticeDismissed", "1"));
  await signIn(page);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") return json(route, PRO);
    if (url.pathname === "/api/batches") return json(route, { batches: [BATCH] });
    if (url.pathname === "/api/checkins") return json(route, { patterns: {}, locked: false });
    if (url.pathname === "/api/inventory") return json(route, { items: OILS });
    if (url.pathname === "/api/account" && req.method() === "POST" && req.postDataJSON()?.action === "invite") return json(route, api.invite ?? {});
    return json(route, {});
  });
}

for (const locale of ["en", "ar"]) {
  const m = msgs[locale];
  const base = locale === "ar" ? "/ar" : "";

  test(`M10 ${locale}: the public menu ends with Sign in, Open the Bench once signed in here`, async ({ page }) => {
    await page.goto(`${base}/pricing`);
    const menu = page.getByRole("navigation", { name: m.site.nav.main });
    const link = menu.getByRole("link", { name: m.site.nav.signIn, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", `${base}/bench`);

    await page.addInitScript(() => localStorage.setItem("sb-ci-auth-token", "{}"));
    await page.reload();
    await expect(menu.getByRole("link", { name: m.site.nav.openBench, exact: true })).toBeVisible();
    await expect(menu.getByRole("link", { name: m.site.nav.signIn, exact: true })).toHaveCount(0);
  });

  test(`L1 ${locale}: Pricing's Free card shows a price, not a bare 0`, async ({ page }) => {
    await page.goto(`${base}/pricing`);
    const free = page.locator("[data-free-price]");
    await expect(free).not.toHaveText("0");
    await expect(free).toContainText("0");
  });

  test(`M11 ${locale}: every Inventory box has a visible label, and there is a way to add an oil`, async ({ page }) => {
    await app(page, { locale });
    await page.goto("/app/inventory"); // the app follows the profile's language
    await expect(page.getByText("Oud Nights").first()).toBeVisible();
    for (const name of ["Oud Nights", "Neroli Bay"]) {
      await expect(page.getByRole("spinbutton", { name: `${m.inventory.stockField} ${name}` })).toBeVisible();
      await expect(page.getByRole("spinbutton", { name: `${m.inventory.warnField} ${name}` })).toBeVisible();
    }
    await expect(page.getByText(m.inventory.warnField, { exact: true })).toHaveCount(2);
    const add = page.locator("[data-add-oil]");
    await expect(add).toHaveText(m.inventory.addOil);
    const { violations } = await new AxeBuilder({ page }).include("main").withTags(AXE).analyze();
    expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
    await add.click();
    await expect(page).toHaveURL(/\/app\/search/);
  });

  test(`L6 ${locale}: Pour along opened with nothing to pour sits in the app's header and menu`, async ({ page, isMobile }) => {
    await app(page, { locale });
    await page.goto("/app/bench");
    await expect(page.getByRole("heading", { level: 1, name: m.bench.title })).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: isMobile ? m.app.barLabel : m.app.tabsLabel })).toBeVisible();
    await page.locator("[data-bench-empty]").getByRole("button", { name: m.app.tabs.calculator }).click();
    await expect(page).toHaveURL(/\/bench$/);
  });
}

test("L2, L3: sign-in names batches, formulas and notes, and Back returns to the page you came from", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("navigation", { name: en.site.nav.main }).getByRole("link", { name: en.site.nav.signIn, exact: true }).click();
  await expect(page.getByText(en.auth.lead)).toBeVisible();
  const back = page.locator("[data-auth-back]");
  await expect(back).toHaveText(en.auth.back);
  await back.click();
  await expect(page).toHaveURL(/\/pricing$/);
});

test("L3: opened directly, sign-in offers Home", async ({ page }) => {
  await page.goto("/bench");
  const back = page.locator("[data-auth-back]");
  await expect(back).toHaveText(en.auth.home);
  await expect(back).toHaveAttribute("href", "/");
});

test("L8: an invite answer without numbers never shows raw placeholders", async ({ page }) => {
  await app(page, { api: { invite: {} } });
  await page.goto("/app/account");
  await expect(page.getByText(en.account.invite.failed)).toBeVisible();
  await expect(page.locator("main")).not.toContainText("{earned}");
});

test("L8: with numbers, months earned shows them", async ({ page }) => {
  await app(page, { api: { invite: { code: "abcd2345", earned: 2, cap: 6, gift_ends_at: null } } });
  await page.goto("/app/account");
  await expect(page.locator("[data-invite-earned]")).toHaveText(fill(en.account.invite.earned, { earned: 2, cap: 6 }));
});

test.describe("an Arabic buyer page", () => {
  test.use({ locale: "ar-EG" });
  test("L9: a Latin scent name in the heading sits at the page's start (right) edge", async ({ page }) => {
    const CODE = "0123456789abcdef0123456789abcdef";
    await page.route("**/api/batches?**", (route) => json(route, { order: { shop: "Hisham Blends", scent: "Oud Nights", family: "woody", size_ml: 50, strength_pct: 25, bottled_on: "2026-11-01", feedback: null, can_edit: true } }));
    await page.goto(`/ar/o/${CODE}`);
    const h1 = page.locator("[data-buyer-scent]");
    await expect(h1).toHaveText("Oud Nights");
    const [box, name] = await Promise.all([h1.boundingBox(), h1.locator("bdi").boundingBox()]);
    expect(Math.abs((box.x + box.width) - (name.x + name.width))).toBeLessThan(2);
  });
});

test("L10: on a wide screen the Journal list's batch line wraps, nothing is cut off", async ({ page, isMobile }) => {
  test.skip(isMobile, "the list and the record sit side by side only on wide screens");
  await app(page);
  await page.goto("/journal");
  const line = page.locator("[data-row-line]").first();
  await expect(line).toContainText("No. 001");
  expect(await line.evaluate((el) => el.scrollWidth <= el.clientWidth && getComputedStyle(el).textOverflow !== "ellipsis")).toBe(true);
});

// Owner, 2026-11-23: "Align the batch history stars and tour button too".
test("Batch history's check-in uses the shared 1–5 row with its ends named", async ({ page }) => {
  await app(page);
  await page.goto("/bench/journal");
  await page.getByRole("button", { name: en.journal.add }).first().click();
  const group = page.getByRole("group", { name: en.journal.rating });
  await expect(group.locator("[data-rating-ends]")).toContainText(en.rating.low);
  await expect(group.locator("[data-rating-ends]")).toContainText(en.rating.high);
  await expect(page.getByText("★")).toHaveCount(0);
  const four = group.getByRole("button", { name: fill(en.journal.ratingValue, { n: 4 }) });
  await four.click();
  await expect(four).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: en.journal.save, exact: true })).toBeEnabled();
});

test("the tour card's Next is the amber main button", async ({ page }) => {
  await app(page);
  await page.goto("/bench?tour=1");
  const next = page.locator("[data-tour-next]");
  await expect(next).toBeVisible();
  const [bg, amber] = await next.evaluate((el) => {
    const probe = document.createElement("span");
    probe.style.background = "var(--c-amber)";
    document.body.append(probe);
    const want = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return [getComputedStyle(el).backgroundColor, want];
  });
  expect(bg).toBe(amber);
});

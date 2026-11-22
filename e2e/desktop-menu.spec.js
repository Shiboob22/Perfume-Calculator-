import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// One menu on wide screens (audit H3, owner's go-ahead 2026-11-22): a single
// row of rooms with More at its end, and one account menu in the header,
// instead of the site menu above a second grid of tabs.
test.use({ serviceWorkers: "block" });

const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };
const msgs = { en, ar };

async function open(page, { locale = "en", path = "/bench", sells = true, theme = "light" } = {}) {
  await page.addInitScript((th) => {
    ["wardrobe", "atlas", "salon", "nose", "orders"].forEach((n) => localStorage.setItem(`kyphira.flag.${n}`, "1"));
    localStorage.setItem("kyphira.renameNoticeDismissed", "1");
    localStorage.setItem("theme", th);
  }, theme);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await signIn(page);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", sells, currency: "EGP", bench_tour_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/me") return json(route, PRO);
    if (url.searchParams.get("resource") === "orders") return json(route, { orders: [] });
    if (url.pathname === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
  await page.goto(locale === "ar" ? `/ar${path}` : path);
}

const row = (page, m) => page.getByRole("navigation", { name: m.app.tabsLabel });

test.skip(({ isMobile }) => isMobile, "wide screens; phones keep the bottom bar");

for (const path of ["/bench", "/journal", "/bench/orders"]) {
  test(`${path}: one menu, one "you are here"`, async ({ page }) => {
    await open(page, { path });
    await expect(row(page, en)).toBeVisible();
    await expect(page.getByRole("navigation", { name: en.site.nav.main })).toHaveCount(0);
    // The current room is marked once on the page (it was marked in both menus).
    await expect(page.locator("header [aria-current=page]:visible, nav [aria-current=page]:visible")).toHaveCount(1);
  });
}

test("the row: the four, the rooms from 1024 px, More with the rest; Esc and a tap outside close it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  const nav = row(page, en);
  for (const name of [en.app.tabs.search, en.app.tabs.calculator, en.orders.title, en.app.tabs.journal, en.site.nav.atlas, en.site.nav.salon, en.site.nav.wardrobe]) {
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  }
  const more = nav.getByRole("button", { name: en.app.more });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  for (const name of [en.app.tabs.batches, en.app.tabs.selector, en.app.tabs.inventory, en.app.tabs.ask, en.site.nav.guides, en.site.nav.pricing, en.site.nav.nose]) {
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();
  await more.click();
  await page.mouse.click(5, 500);
  await expect(more).toHaveAttribute("aria-expanded", "false");
  // A room picked from More is marked on More.
  await more.click();
  await nav.getByRole("link", { name: en.app.tabs.inventory, exact: true }).click();
  await expect(page).toHaveURL(/\/app\/inventory/);
  await expect(more).toHaveAttribute("aria-current", "page");
});

test("below 1024 px the rooms move into More", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await open(page);
  const nav = row(page, en);
  await expect(nav.getByRole("link", { name: en.site.nav.atlas, exact: true })).toBeHidden();
  await nav.getByRole("button", { name: en.app.more }).click();
  await expect(nav.getByRole("link", { name: en.site.nav.atlas, exact: true })).toBeVisible();
});

test("the account menu: Account, language, theme, motion and Sign out", async ({ page }) => {
  await open(page);
  const btn = page.getByRole("button", { name: en.app.accountMenu });
  await btn.click();
  const menu = page.locator("[data-account-menu]");
  await expect(menu.getByRole("link", { name: en.account.link, exact: true })).toBeVisible();
  await expect(menu.getByRole("button", { name: en.app.signOut })).toBeVisible();
  await menu.getByRole("link", { name: en.account.link, exact: true }).click();
  await expect(page).toHaveURL(/\/app\/account/);
  await expect(btn).toHaveAttribute("aria-current", "page");
  await expect(btn).toHaveAttribute("aria-expanded", "false");
});

for (const locale of ["en", "ar"]) {
  for (const theme of ["light", "dark"]) {
    test(`${locale} ${theme}: axe on the header and the row with both menus open`, async ({ page }) => {
      const m = msgs[locale];
      await open(page, { locale, theme });
      const nav = row(page, m);
      const items = nav.locator(":scope > ul > li");
      // Arabic mirrors the row: the first room sits at the right.
      const [a, b] = [await items.first().boundingBox(), await items.last().boundingBox()];
      expect(locale === "ar" ? a.x > b.x : a.x < b.x).toBe(true);
      await nav.getByRole("button", { name: m.app.more }).click();
      for (const include of ["header", `nav[aria-label="${m.app.tabsLabel}"]`]) {
        const { violations } = await new AxeBuilder({ page }).include(include).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(violations.map((v) => `${include}: ${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
      }
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: m.app.accountMenu }).click();
      const { violations } = await new AxeBuilder({ page }).include("header").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(violations.map((v) => `account: ${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }
}

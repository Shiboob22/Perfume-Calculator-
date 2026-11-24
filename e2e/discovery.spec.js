import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The More menus in groups with each page's own title (audit M12), and the
// fragrance finders pointing at each other (audit H4: Search to the Atlas,
// the Nose to the Selector and back). "Library" now means only the guides.
test.use({ serviceWorkers: "block" });

const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };
const msgs = { en, ar };

async function open(page, { locale = "en", path = "/bench", theme = "light" } = {}) {
  await page.addInitScript((th) => {
    ["wardrobe", "atlas", "salon", "nose"].forEach((n) => localStorage.setItem(`kyphira.flag.${n}`, "1"));
    localStorage.setItem("kyphira.renameNoticeDismissed", "1");
    localStorage.setItem("theme", th);
  }, theme);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await signIn(page);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", sells: false, bench_tour_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/me") return json(route, PRO);
    if (url.pathname === "/api/batches") return json(route, { batches: [] });
    if (url.pathname === "/api/search") return json(route, { results: [] });
    return json(route, {});
  });
  await page.goto(locale === "ar" ? `/ar${path}` : path);
}

async function more(page, m, isMobile) {
  if (isMobile) {
    await page.getByRole("navigation", { name: m.app.barLabel }).getByRole("button", { name: m.app.more }).click();
    return page.getByRole("dialog", { name: m.app.more });
  }
  const nav = page.getByRole("navigation", { name: m.app.tabsLabel });
  await nav.getByRole("button", { name: m.app.more }).click();
  return nav;
}

for (const locale of ["en", "ar"]) {
  test(`${locale}: More is grouped into rooms, tools, and plan and help, with page titles`, async ({ page, isMobile }) => {
    const m = msgs[locale];
    await open(page, { locale });
    const box = await more(page, m, isMobile);
    for (const g of ["rooms", "tools", "help"]) await expect(box.getByRole("heading", { name: m.app.groups[g], exact: true })).toBeVisible();
    const rooms = box.getByRole("region", { name: m.app.groups.rooms });
    const tools = box.getByRole("region", { name: m.app.groups.tools });
    await expect(rooms.getByRole("link", { name: m.site.compounding.rooms.library.name, exact: true })).toBeVisible();
    for (const name of [m.batches.title, m.selector.title, m.inventory.title, m.chat.title]) {
      await expect(tools.getByRole("link", { name, exact: true })).toBeVisible();
    }
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/more__${locale}__${isMobile ? "phone" : "desktop"}.png` });
    const { violations } = await new AxeBuilder({ page }).include(isMobile ? "[role=dialog]" : `nav[aria-label="${m.app.tabsLabel}"]`)
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test("Search speaks of the catalog and points to the Atlas", async ({ page }) => {
  await open(page, { path: "/app/search" });
  await expect(page.getByLabel(en.search.label)).toBeVisible();
  expect(en.search.label).toMatch(/catalog/);
  await page.getByRole("link", { name: en.search.atlasLink }).click();
  await expect(page).toHaveURL(/\/atlas/);
});

test("the Nose offers the Selector, and the Selector offers the Nose", async ({ page }) => {
  await open(page, { path: "/nose" });
  await page.getByRole("link", { name: en.nose.quizLink }).click();
  await expect(page).toHaveURL(/\/app\/selector/);
  await page.getByRole("link", { name: en.selector.intro.noseLink }).click();
  await expect(page).toHaveURL(/\/nose/);
});

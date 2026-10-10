import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The fake API answers through page.route, which a controlling service worker
// bypasses (WebKit); the shell's offline behaviour is covered in app.spec.js.
test.use({ serviceWorkers: "block" });

// The Scent Selector against the production build with a fake session and a
// fake catalog: the full quiz, known fragrances, ranked and explained
// matches, back navigation, a draft that survives a reload, Arabic, and the
// fallback when the candidate function is missing. (The staging journey is
// in signed-in.spec.js.)

const row = (id, name, accords, popularity) => ({ id, name, brand: "House", accords, year: 2000, rating: 4, popularity, olfactory_family: null, tier: "woody" });
const CATALOG = [
  row("a", "Amber Hour", ["Amber", "Woody", "Vanilla", "Warm Spicy", "Balsamic"], 900),
  row("b", "Citrus Air", ["Citrus", "Fresh", "Aquatic", "Aromatic", "Green"], 800),
  row("c", "Sugar Room", ["Sweet", "Vanilla", "Caramel", "Gourmand"], 700),
  row("d", "Rose Garden", ["Rose", "Floral", "White Floral", "Powdery"], 600),
  row("e", "Dry Cedar", ["Woody", "Aromatic", "Earthy", "Musky"], 500),
  row("f", "Tier Only", [], 400),
];

async function fakeApi(page, { rpc = true } = {}) {
  const seen = { rpc: 0, direct: 0 };
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) {
      const one = (route.request().headers().accept || "").includes("pgrst.object");
      const p = { locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" };
      return json(route, one ? p : [p]);
    }
    if (url.includes("/rest/v1/rpc/selector_candidates")) {
      seen.rpc++;
      return rpc ? json(route, CATALOG) : json(route, { code: "PGRST202", message: "Could not find the function" }, 404);
    }
    if (url.includes("/rest/v1/fragrances")) { seen.direct++; return json(route, CATALOG); }
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/me") return json(route, { plan: "free", name: "Free", features: FEATURES.slice(0, 1), batchCap: 25, batchesUsed: 0 });
    if (url.pathname === "/api/search") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      return json(route, { results: CATALOG.filter((r) => r.name.toLowerCase().includes(q)) });
    }
    return json(route, {});
  });
  return seen;
}

const q = en.selector.q;
const pickOption = (page, label) => page.getByText(label, { exact: true }).click();
const next = (page) => page.getByRole("button", { name: new RegExp(`^(${en.selector.next}|${en.selector.skip}|${en.selector.seeResults})$`) }).click();

async function answerQuiz(page) {
  await page.goto("/app/selector");
  await page.getByRole("button", { name: en.selector.intro.begin }).click();
  await pickOption(page, q.atmosphere.options.woodRoom); await next(page);
  await pickOption(page, q.material.options.leather); await next(page);
  await pickOption(page, q.families.options.amber); await pickOption(page, q.families.options.woody); await next(page);
  await pickOption(page, q.pleasures.options.vanillaBean); await next(page);
  await pickOption(page, q.sweetness.levels[3]); await next(page);
  await pickOption(page, q.warmth.levels[3]); await next(page);
  await pickOption(page, q.darkness.levels[3]); await next(page);
  await pickOption(page, q.avoid.options.aquatic); await next(page);
  await pickOption(page, q.intent.options.sensual); await next(page);
  await pickOption(page, q.presence.levels[3]); await next(page);
  await pickOption(page, q.novelty.levels[2]); await next(page);
  await pickOption(page, q.use.options.evening); await next(page);
  await pickOption(page, q.climate.options.cool); await next(page);
  await pickOption(page, q.social.options.event); await next(page);
  await pickOption(page, q.projection.options.strong); await next(page);
}

test("the quiz ranks the catalog with reasons, using the candidate function", async ({ page }) => {
  await signIn(page);
  const seen = await fakeApi(page);
  await answerQuiz(page);

  // Known fragrances: love one, dislike another.
  await page.getByLabel(en.selector.known.search).fill("sugar");
  await page.getByRole("group", { name: "Sugar Room" }).getByRole("button", { name: en.selector.known.disliked }).click();
  await expect(page.getByRole("heading", { name: en.selector.known.groupDisliked })).toBeVisible();
  await page.getByLabel(en.selector.known.search).fill("tier");
  await expect(page.getByText(en.selector.known.noProfile)).toBeVisible();
  await next(page);

  await expect(page.getByRole("heading", { name: en.selector.results.title })).toBeVisible();
  const matches = page.getByRole("listitem").filter({ has: page.getByText(/% match$/) });
  await expect(matches.first()).toContainText("Amber Hour");
  await expect(matches.first().getByText(en.selector.results.why)).toBeVisible();
  const names = await matches.locator("h3").allInnerTexts();
  expect(names.join(" ")).not.toContain("Sugar Room"); // disliked: left out
  expect(names.join(" ")).not.toContain("Tier Only"); // no accords: never ranked
  expect(seen.rpc).toBe(1);

  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => v.id)).toEqual([]);
});

test("back keeps answers, and the draft survives a reload", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/app/selector");
  await page.getByRole("button", { name: en.selector.intro.begin }).click();
  await pickOption(page, q.atmosphere.options.citrus); await next(page);
  await expect(page.getByText(en.selector.stepOf.replace("{current}", "2").replace("{total}", "16"))).toBeVisible();
  await page.getByRole("button", { name: en.selector.back }).click();
  await expect(page.getByRole("radio", { name: q.atmosphere.options.citrus })).toBeChecked();
  await next(page);
  await pickOption(page, q.material.options.linen); await next(page);

  await page.reload();
  await page.getByRole("button", { name: en.selector.intro.resume }).click();
  await expect(page.getByRole("heading", { name: q.families.title })).toBeVisible();
  await page.getByRole("button", { name: en.selector.back }).click();
  await expect(page.getByRole("radio", { name: q.material.options.linen })).toBeChecked();

  // Start over clears it.
  await page.getByRole("button", { name: en.selector.restart }).first().click();
  await page.reload();
  await expect(page.getByRole("button", { name: en.selector.intro.begin })).toBeVisible();
});

test("without answers there is nothing to rank, and a missing function falls back", async ({ page }) => {
  await signIn(page);
  const seen = await fakeApi(page, { rpc: false });
  await page.goto("/app/selector");
  await page.getByRole("button", { name: en.selector.intro.begin }).click();
  for (let i = 0; i < 15; i++) await next(page);
  await page.getByRole("button", { name: en.selector.seeResults }).click();
  await expect(page.getByText(en.selector.noSignal.title)).toBeVisible();

  await page.getByRole("button", { name: en.selector.noSignal.action }).click();
  await pickOption(page, q.atmosphere.options.coldAir);
  for (let i = 0; i < 15; i++) await next(page);
  await page.getByRole("button", { name: en.selector.seeResults }).click();
  await expect(page.getByText("Citrus Air").first()).toBeVisible();
  expect(seen.rpc).toBe(1);
  expect(seen.direct).toBe(1);
});

test("the assessment reads right to left in Arabic", async ({ page }) => {
  await signIn(page);
  await page.addInitScript(() => localStorage.setItem("sh-locale", "ar"));
  await fakeApi(page);
  await page.goto("/app/selector");
  await expect(page.getByRole("heading", { name: ar.selector.title })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: ar.selector.intro.begin }).click();
  await expect(page.getByRole("heading", { name: ar.selector.q.atmosphere.title })).toBeVisible();
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The fake API answers through page.route, which a controlling service
// worker bypasses (WebKit).
test.use({ serviceWorkers: "block" });

// Saved recipes with versions (Phase 3, migration 0023), against the
// production build with a fake session and a fake API: save a recipe, see
// which version a batch will carry, lose the link when the settings change,
// save a new version, reopen one from "Make again".

const FRAG_ID = "22222222-2222-4222-8222-222222222222";
const RECIPE_ID = "55555555-5555-4555-8555-555555555555";
const V1 = "66666666-6666-4666-8666-666666666661";
const V2 = "66666666-6666-4666-8666-666666666662";

async function fakeApi(page, { recipes = [], batches = [], locale = "en" } = {}) {
  const sent = { logs: [], recipes: [], versions: [] };
  const state = { recipes };
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = req.url();
    const one = (req.headers().accept || "").includes("pgrst.object");
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) {
      return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    }
    if (url.includes("/rest/v1/recipe_versions") && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.versions.push(body);
      const r = state.recipes.find((x) => x.id === body.recipe_id);
      r.recipe_versions.push({ id: r.recipe_versions.length ? V2 : V1, version: r.recipe_versions.length + 1, created_at: "2026-10-14T00:00:00Z", ...body });
      return json(route, [], 201);
    }
    if (url.includes("/rest/v1/recipes") && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.recipes.push(body);
      state.recipes.push({ id: RECIPE_ID, ...body, created_at: "2026-10-14T00:00:00Z", updated_at: "2026-10-14T00:00:00Z", recipe_versions: [] });
      return json(route, one ? { id: RECIPE_ID } : [{ id: RECIPE_ID }], 201);
    }
    if (url.includes("/rest/v1/recipes") && req.method() === "GET") return json(route, state.recipes);
    if (url.includes("/rest/v1/fragrances") && req.method() === "GET" && /Oud/.test(decodeURIComponent(url))) {
      const row = { id: FRAG_ID, name: "Oud Nights", tier: "woody" };
      return json(route, one ? row : [row]);
    }
    if (url.includes("/rest/v1/rpc/ensure_fragrance")) return json(route, [{ id: FRAG_ID, name: "Oud Nights", tier: "woody" }]);
    return json(route, []);
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") return json(route, { plan: "free", name: "Free", features: FEATURES.slice(0, 1), batchCap: 25, batchesUsed: 1 });
    if (url.pathname === "/api/batches" && req.method() === "GET") return json(route, { batches });
    if (url.pathname === "/api/batches" && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.logs.push(body);
      return json(route, { success: true, batch: { ...body, user_id: USER.id } }, 201);
    }
    return json(route, {});
  });
  return sent;
}

const savedRecipe = (extra = {}) => ({
  id: RECIPE_ID, name: "Oud Nights", family: "woody", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
  recipe_versions: [{ id: V1, version: 1, amount: 50, unit: "ml", concentration_pct: 25, oil_density: null, ethanol_density: null, note: null, created_at: "2026-10-01T00:00:00Z" }],
  ...extra,
});

test("save a recipe, log with its version, lose the link on a change, save v2", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page);
  await page.goto("/bench?name=Oud%20Nights&family=woody&size=50&unit=ml&conc=25");

  await page.getByRole("button", { name: en.calc.recipes.add }).click();
  await page.getByLabel(en.calc.recipes.name).fill("Oud Nights");
  await page.getByRole("button", { name: en.calc.recipes.save, exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Oud Nights v1" })).toBeVisible();
  expect(sent.recipes[0]).toMatchObject({ name: "Oud Nights", family: "woody" });
  expect(sent.versions[0]).toMatchObject({ amount: 50, unit: "ml", concentration_pct: 25 });

  // The settings still match: the batch carries the version.
  await expect(page.getByText(en.calc.recipes.linked.replace("{label}", "Oud Nights v1"))).toBeVisible();
  await page.getByRole("button", { name: en.calc.log }).click();
  await expect(page.getByRole("status").filter({ hasText: en.calc.saved.split("{")[0].trim().slice(0, 12) })).toBeVisible();
  expect(sent.logs[0].recipe_version_id).toBe(V1);

  // A change unlinks it, and says so.
  await page.getByRole("spinbutton", { name: en.calc.batchSize }).fill("60");
  await expect(page.getByText(en.calc.recipes.changed.replace("{label}", "Oud Nights v1"))).toBeVisible();
  await page.getByRole("button", { name: en.calc.log }).click();
  await expect.poll(() => sent.logs.length).toBe(2);
  expect(sent.logs[1]).not.toHaveProperty("recipe_version_id");

  // Saving the change as the next version links again.
  await page.getByRole("button", { name: en.calc.recipes.addVersion.replace("{name}", "Oud Nights") }).click();
  await page.getByLabel(en.calc.recipes.note).fill("bigger bottle");
  await page.getByRole("button", { name: en.calc.recipes.save, exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Oud Nights v2" })).toBeVisible();
  expect(sent.versions[1]).toMatchObject({ amount: 60, note: "bigger bottle", recipe_id: RECIPE_ID });
});

test("opening a saved recipe fills the calculator", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { recipes: [savedRecipe()] });
  await page.goto("/bench");
  await page.getByRole("button", { name: en.calc.recipes.open.replace("{label}", "Oud Nights v1") }).click();
  await expect(page.getByRole("spinbutton", { name: en.calc.batchSize })).toHaveValue("50");
  await expect(page.getByLabel(en.calc.family)).toHaveValue("woody");
  await expect(page.getByText(en.calc.recipes.linked.replace("{label}", "Oud Nights v1"))).toBeVisible();
});

test("Make again from a batch made from a recipe reopens that version", async ({ page }) => {
  await signIn(page);
  const batch = {
    id: "11111111-1111-4111-8111-111111111111", user_id: USER.id, fragrance_id: FRAG_ID, fragrance_name: "Oud Nights", tier: "woody", concentration_pct: 25,
    blend_date: "2026-09-01", created_at: "2026-09-01T10:00:00Z", amount: 50, unit: "ml", recipe_version_id: V1,
    oil_g: 11.875, oil_ml: 12.5, ethanol_g: 30.375, ethanol_ml: 37.5, total_g: 42.25, total_ml: 50, basis: "volume", batch_checkins: [], shared_recipes: null,
  };
  await fakeApi(page, { recipes: [savedRecipe()], batches: [batch] });
  await page.goto("/bench/journal");
  await expect(page.getByText(en.batches.recipe.replace("{label}", "Oud Nights v1"))).toBeVisible();
  await page.getByRole("button", { name: en.batches.again }).first().click();
  await expect(page).toHaveURL(new RegExp(`recipe=${V1}`));
  await expect(page.getByText(en.calc.recipes.linked.replace("{label}", "Oud Nights v1"))).toBeVisible();
});

test("the recipe picker has no accessibility violations, and works in Arabic at 320 px", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { recipes: [savedRecipe()], locale: "ar" });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/bench");
  await page.getByRole("group", { name: ar.calc.recipes.label }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  const results = await new AxeBuilder({ page }).include('[role="group"]').analyze();
  expect(results.violations).toEqual([]);
});

import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { USER, json, signIn } from "./helpers.js";

// The Bench SaaS round, Phase 3, against the production build with a fake
// session and a fake API: load a saved formula, switch to a blend, add
// materials until Free's limit opens the upgrade sheet, start the trial, and
// see the cost card unlock. In English and Arabic; the phone and desktop
// projects run it at both widths.
test.use({ serviceWorkers: "block" });

const RECIPE_ID = "55555555-5555-4555-8555-555555555555";
const V1 = "66666666-6666-4666-8666-666666666661";
const FREE = { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, formulaCap: 5, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 2 };
const PRO = { plan: "pro", name: "Pro", features: ["batches.unlimited", "inventory", "ai.ask", "export.labels", "calculator.advanced", "cards.download", "journal.insights", "journal.checkins", "journal.reminders"], batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: { active: true, used: true, daysLeft: 14 }, batchesUsed: 2 };

const savedFormula = {
  id: RECIPE_ID, user_id: USER.id, name: "Neroli Eau", family: "fresh", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
  recipe_versions: [{ id: V1, recipe_id: RECIPE_ID, user_id: USER.id, version: 1, amount: 100, unit: "ml", concentration_pct: 20, oil_density: null, ethanol_density: null, note: null, created_at: "2026-10-01T00:00:00Z", recipe_ingredients: [] }],
};

async function fakeApi(page, locale) {
  const sent = { trial: 0, logs: [] };
  let plan = FREE;
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = req.url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) {
      return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    }
    if (url.includes("/rest/v1/recipes") && req.method() === "GET") return json(route, [savedFormula]);
    if (url.includes("/rest/v1/rpc/ensure_fragrance")) return json(route, [{ id: "22222222-2222-4222-8222-222222222222", name: "Neroli Eau", tier: "fresh" }]);
    return json(route, []);
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") return json(route, plan);
    if (url.pathname === "/api/account" && req.method() === "POST") {
      sent.trial += 1;
      expect(req.postDataJSON()).toEqual({ action: "start_trial" });
      plan = PRO;
      return json(route, { status: "started", trial_ends_at: "2026-11-19T12:00:00Z", days: 14 }, 201);
    }
    if (url.pathname === "/api/batches" && req.method() === "GET") return json(route, { batches: [] });
    if (url.pathname === "/api/batches" && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.logs.push(body);
      return json(route, { success: true, batch: { ...body, user_id: USER.id, batch_no: 42 } }, 201);
    }
    return json(route, {});
  });
  return sent;
}

for (const [locale, m] of [["en", en], ["ar", ar]]) {
  test(`${locale}: load a formula, blend to the Free limit, start the trial, unlock the cost card`, async ({ page }, info) => {
    await signIn(page);
    const sent = await fakeApi(page, locale);
    await page.goto("/bench");
    const phone = info.project.name === "phone";
    const f = m.calc.formulas;

    // The plan badge, and the cost card locked behind its panel on Free.
    await expect(page.getByRole("button", { name: m.upgrade.badgeFree })).toBeVisible();
    const cost = page.getByRole("region", { name: m.calc.costCard.title });
    await expect(cost.getByRole("button", { name: m.calc.costCard.unlock })).toBeVisible();
    await expect(cost.locator("[data-cost-body]")).toHaveAttribute("aria-hidden", "true");

    // Load the saved formula: the rail on desktop, a bottom sheet on phones.
    if (phone) {
      await page.getByRole("button", { name: new RegExp(f.open) }).click();
      const sheet = page.getByRole("dialog", { name: f.title });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByText(f.count.replace("{n}", "1").replace("{max}", "5"))).toBeVisible();
      await sheet.getByRole("button", { name: f.loadName.replace("{name}", "Neroli Eau") }).click();
      await expect(sheet).toBeHidden();
    } else {
      const rail = page.getByRole("region", { name: f.title });
      await expect(rail.getByText(f.count.replace("{n}", "1").replace("{max}", "5"))).toBeVisible();
      await rail.getByRole("button", { name: f.loadName.replace("{name}", "Neroli Eau") }).click();
      await expect(rail.getByRole("button", { name: f.loadedName.replace("{name}", "Neroli Eau") })).toHaveAttribute("aria-pressed", "true");
    }
    await expect(page.getByRole("spinbutton", { name: m.calc.batchSize })).toHaveValue("100");
    // 20% sits in the EDP tier (over 15 up to 20).
    const tiers = page.getByRole("group", { name: m.calc.tiers.label });
    await expect(tiers.getByRole("button", { pressed: true })).toHaveAccessibleName(/^EDP[,،] /);
    await tiers.getByRole("button", { name: /^Extrait/ }).click();
    await expect(tiers.getByRole("button", { name: /^Extrait/ })).toHaveAttribute("aria-pressed", "true");

    // Blend: one material from the oil, then two more, then Free's limit.
    await page.getByRole("button", { name: m.calc.blend.blend, exact: true }).click();
    await expect(page.getByRole("textbox", { name: m.calc.blend.nameN.replace("{n}", "1") })).toHaveValue("Neroli Eau");
    await expect(page.locator("[data-density-line]")).toContainText(m.calc.blend.density.split("{d}")[0].trim());
    const add = page.getByRole("button", { name: new RegExp(m.calc.blend.add) });
    await add.click();
    await page.getByRole("textbox", { name: m.calc.blend.nameN.replace("{n}", "2") }).fill("Hedione");
    await page.getByRole("spinbutton", { name: m.calc.blend.shareN.replace("{n}", "2") }).fill("30");
    // 100 + 30: off 100, so the total turns amber and offers to balance.
    await expect(page.locator("[data-off]")).toHaveAttribute("data-off", "true");
    await page.getByRole("button", { name: m.calc.blend.balance }).click();
    await expect(page.locator("[data-off]")).toHaveAttribute("data-off", "false");
    await add.click();
    await expect(page.getByRole("textbox", { name: m.calc.blend.nameN.replace("{n}", "3") })).toBeVisible();
    // The readout calls the oil the concentrate and breaks it down.
    await expect(page.getByText(m.calc.blend.breakdown)).toBeVisible();
    await add.click();
    const upgrade = page.getByRole("dialog", { name: m.upgrade.title });
    await expect(upgrade).toBeVisible();
    await expect(upgrade.getByText(m.upgrade.why.blend)).toBeVisible();
    await expect(page.getByRole("textbox", { name: m.calc.blend.nameN.replace("{n}", "4") })).toHaveCount(0);
    // Every comparison row, label PNG and share links ticked on Free too.
    await expect(upgrade.getByRole("row")).toHaveCount(1 + 9);
    await expect(upgrade.getByRole("row", { name: new RegExp(m.upgrade.rows.label) }).getByRole("cell").first()).toHaveText("✓");
    await expect(upgrade.getByRole("row", { name: new RegExp(m.upgrade.rows.share) }).getByRole("cell").first()).toHaveText("✓");
    // Monthly / yearly.
    await upgrade.getByRole("button", { name: m.upgrade.monthly, exact: true }).click();
    await expect(upgrade.getByText(m.upgrade.perMonth)).toBeVisible();
    await upgrade.getByRole("button", { name: new RegExp(m.upgrade.saveYear) }).click();
    await expect(upgrade.getByText(m.upgrade.billedYearly.split("{price}")[1].trim())).toBeVisible();
    await expect(upgrade.getByText(m.upgrade.fine)).toBeVisible();

    // The trial: Pro now, the sheet closes and the cost card opens.
    await upgrade.getByRole("button", { name: m.plan.trial.start }).click();
    await expect(upgrade).toBeHidden();
    expect(sent.trial).toBe(1);
    await expect(page.getByRole("button", { name: m.upgrade.badgePro, exact: true })).toBeVisible();
    await expect(cost.getByRole("button", { name: m.calc.costCard.unlock })).toHaveCount(0);
    await expect(cost.locator("[data-cost-body]")).not.toHaveAttribute("aria-hidden", "true");
    // In a blend the oil price is the blend's and can't be typed.
    await expect(cost.getByRole("spinbutton", { name: m.calc.costCard.blendPrice })).toHaveAttribute("readonly", "");
    await cost.getByRole("spinbutton", { name: m.calc.costCard.ethPrice }).fill("150");
    await cost.getByRole("spinbutton", { name: m.calc.costCard.pack }).fill("45");
    await cost.getByRole("button", { name: "30 mL" }).click();
    await expect(cost.locator('[data-cost="retail"]')).not.toContainText(/^0\.00/);
    // And a fourth material is allowed on Pro.
    await add.click();
    await expect(page.getByRole("textbox", { name: m.calc.blend.nameN.replace("{n}", "4") })).toBeVisible();

    // Log this batch: numbered by the server.
    await page.getByRole("button", { name: m.calc.log }).click();
    await expect(page.getByText(m.calc.loggedNo.replace("{no}", "042"))).toBeVisible();
    expect(sent.logs[0]).toMatchObject({ fragrance_name: "Neroli Eau", concentration_pct: 30 });
  });
}

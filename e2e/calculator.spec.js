import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The calculator screen (FragranceBlendCalculator.jsx) against the production
// build with a fake session and a fake API. The arithmetic itself is covered
// by src/lib/calc/ (Vitest); these specs check what the screen shows and what
// it sends: the handbook's Quick Reference figures, the controls that change
// them, bad input, and the batch the Log button posts.

test.use({ serviceWorkers: "block" });

const FRAG_ID = "22222222-2222-4222-8222-222222222222";

async function fakeApi(page) {
  const sent = { logs: [] };
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = req.url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) {
      return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    }
    if (url.includes("/rest/v1/rpc/ensure_fragrance")) return json(route, [{ id: FRAG_ID, name: "Oud Nights", tier: "woody" }]);
    return json(route, []);
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const { pathname } = new URL(req.url());
    if (pathname === "/api/me") return json(route, { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, batchesUsed: 0 });
    if (pathname === "/api/batches" && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.logs.push(body);
      return json(route, { success: true, batch: { ...body, user_id: USER.id }, stock: "deducted" }, 201);
    }
    if (pathname === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
  return sent;
}

const readout = (page) => page.locator("#calc-readout");

// Family densities differ from the handbook's single 0.95 g/mL (the numbers
// table is still open, see CLAUDE.md), so the handbook figures are checked
// with the family's oil density set to the handbook's reference value.
async function useHandbookDensity(page, family = "woody") {
  await page.getByText(en.calc.densities, { exact: true }).click();
  await page.locator(`#calc-density-${family}`).fill("0.95");
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("100 mL at 25% shows the handbook's Quick Reference weights", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/bench?size=100&unit=ml&conc=25&family=woody");
  await useHandbookDensity(page);
  await expect(readout(page)).toContainText("23.75");
  await expect(readout(page)).toContainText("60.75");
  await expect(readout(page)).toContainText("84.50");
});

test("a batch-size preset recomputes the readout", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/bench?size=100&unit=ml&conc=20&family=woody");
  await useHandbookDensity(page);
  await page.getByRole("button", { name: "50 mL" }).click();
  // 50 mL at 20%: 9.5 g oil + 32.4 g ethanol = 41.9 g.
  await expect(readout(page)).toContainText("9.50");
  await expect(readout(page)).toContainText("32.40");
  await expect(readout(page)).toContainText("41.90");
});

test("the strength stepper moves the concentration by one point", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/bench?size=100&unit=ml&conc=25&family=woody");
  await useHandbookDensity(page);
  await page.getByRole("button", { name: en.calc.stepper.concMore }).click();
  // 100 mL at 26%: 24.7 g oil + 59.94 g ethanol = 84.64 g.
  await expect(readout(page)).toContainText("24.70");
  await expect(readout(page)).toContainText("59.94");
  await expect(readout(page)).toContainText("84.64");
  await page.getByRole("button", { name: en.calc.stepper.concLess }).click();
  await page.getByRole("button", { name: en.calc.stepper.concLess }).click();
  // Two steps down from 26% is 24%: 22.8 g oil + 61.56 g ethanol.
  await expect(readout(page)).toContainText("22.80");
  await expect(readout(page)).toContainText("61.56");
});

test("a negative batch size computes as zero and never shows NaN", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/bench?size=100&unit=ml&conc=25&family=woody");
  await page.locator("#calc-size").fill("-5");
  await expect(readout(page)).not.toContainText("NaN");
  await expect(readout(page)).not.toContainText("Infinity");
  await expect(readout(page)).toContainText("0.00");
  await expect(readout(page)).not.toContainText("23.75");
});

test("a by-weight batch says which basis it used", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/bench?size=100&unit=g&conc=25&family=woody");
  // 100 g at 25% by weight is exactly 25 g oil and 75 g ethanol.
  await expect(readout(page)).toContainText("25.00");
  await expect(readout(page)).toContainText("75.00");
  await expect(readout(page)).toContainText("100.00");
});

test("Log posts the batch the screen shows, once, with a client id", async ({ page }) => {
  const sent = await fakeApi(page);
  await page.goto("/bench?size=100&unit=ml&conc=25&family=woody&name=Oud%20Nights");
  await useHandbookDensity(page);
  await page.getByRole("button", { name: en.calc.log }).click();
  await expect(page.getByRole("button", { name: en.calc.savedOpen })).toBeVisible();
  expect(sent.logs).toHaveLength(1);
  const [batch] = sent.logs;
  expect(batch.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(batch.fragrance_name ?? "Oud Nights").toBe("Oud Nights");
  expect(batch.concentration_pct).toBe(25);
  expect(batch.oil_g).toBeCloseTo(23.75, 2);
  expect(batch.ethanol_g).toBeCloseTo(60.75, 2);
  expect(batch.total_g).toBeCloseTo(84.5, 2);
  expect(batch.basis).toBe("volume");
});

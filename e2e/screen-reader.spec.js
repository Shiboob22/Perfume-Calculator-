import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// A screen-reader proxy: no screen reader runs here, so these tests check
// what one would read, the accessibility tree. Every control has a name,
// every form field a label, live regions announce the changes that matter,
// and the headings make an outline a listener can jump through.

const CONTROLS = "a[href], button, summary, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch]";

async function fakeApi(page) {
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/me") return json(route, { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, batchesUsed: 0 });
    if (url.pathname === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
}

async function openCalculator(page, query = "") {
  await signIn(page);
  await fakeApi(page);
  await page.goto(`/bench${query}`);
  await expect(page.getByRole("heading", { name: en.calc.readout })).toBeVisible();
}

const PAGES = [
  ["home", (page) => page.goto("/")],
  ["pricing", (page) => page.goto("/pricing")],
  ["a guide", (page) => page.goto("/library/the-calculation")],
  ["the Arabic home", (page) => page.goto("/ar/")],
  ["the calculator", (page) => openCalculator(page)],
];

for (const [label, open] of PAGES) {
  test(`${label}: every visible control has a name, and every field a label`, async ({ page }) => {
    await open(page);
    await page.waitForLoadState("load");
    let checked = 0;
    for (const el of await page.locator(CONTROLS).all()) {
      if (!(await el.isVisible())) continue;
      checked++;
      const html = await el.evaluate((e) => e.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>").replace(/ (class|style)="[^"]*"/g, "").slice(0, 200));
      await expect.soft(el, `no accessible name: ${html}`).toHaveAccessibleName(/\S/, { timeout: 1000 });
      // A label the field is tied to, not a placeholder or a title standing in for one.
      const labelled = await el.evaluate((e) => !["INPUT", "SELECT", "TEXTAREA"].includes(e.tagName)
        || e.labels?.length > 0 || !!e.getAttribute("aria-label")?.trim() || !!e.getAttribute("aria-labelledby"));
      expect.soft(labelled, `no associated label: ${html}`).toBe(true);
    }
    expect(checked).toBeGreaterThan(0);
  });

  test(`${label}: one h1, and no heading skips a level on the way down`, async ({ page }) => {
    await open(page);
    await page.waitForLoadState("load");
    const outline = [];
    for (const h of await page.getByRole("heading").all()) {
      outline.push(await h.evaluate((e) => ({ level: Number(e.getAttribute("aria-level")) || Number(e.tagName.slice(1)), text: e.textContent.trim().slice(0, 60) })));
    }
    const shown = outline.map((h) => `${"  ".repeat(h.level - 1)}h${h.level} ${h.text}`).join("\n");
    await expect.soft(page.getByRole("heading", { level: 1 }), shown).toHaveCount(1);
    const skips = outline.slice(1)
      .map((h, i) => [outline[i], h])
      .filter(([prev, h]) => h.level > prev.level + 1)
      .map(([prev, h]) => `h${prev.level} "${prev.text}" → h${h.level} "${h.text}"`);
    expect(skips, shown).toEqual([]);
  });
}

// The node a live region is announced from must stay mounted across the
// change; a remounted region is read by nobody.
const mark = (region) => region.evaluate((el) => { el.__srProbe = true; });
const stillMarked = async (region) => expect(await region.evaluate((el) => el.__srProbe === true)).toBe(true);

test("home: choosing a bottle and a strength is announced by the bench's live region", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("load");
  const live = page.getByRole("status").filter({ has: page.locator(".readout") });
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toContainText("23.75 g");
  await mark(live);

  const size = page.getByRole("group", { name: en.site.home.bench.size }).getByRole("button", { name: "50 mL" });
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  await expect(live).toContainText("11.88 g");

  await page.getByRole("button", { name: "30 Extrait" }).click();
  await expect(live).toContainText(`${en.site.home.exampleOil}14.25 g`);
  await expect(live).toContainText(`${en.site.home.exampleAlcohol}28.35 g`);
  await expect(live).toContainText(`${en.site.home.exampleTotal}42.60 g`);
  await expect(live).not.toContainText("23.75 g");
  await stillMarked(live);
});

test("calculator: a new size or strength updates the readout, and a size of zero is announced as a warning", async ({ page }) => {
  await openCalculator(page, "?size=100&unit=ml&conc=25&family=woody");
  const readout = page.locator("div").filter({ has: page.getByRole("heading", { name: en.calc.readout }) }).last();
  await expect(readout).toContainText(/25\.00\s*mL/);
  await expect(readout).toContainText(/100\.00\s*mL/);

  const size = page.getByRole("spinbutton", { name: en.calc.batchSize });
  await size.fill("50");
  await expect(readout).toContainText(/12\.50\s*mL/);
  await expect(readout).toContainText(/50\.00\s*mL/);

  await page.getByRole("button", { name: "30% Extrait" }).click();
  await expect(page.getByRole("slider", { name: en.calc.concentration.replace("{pct}", "30") })).toHaveValue("30");
  await expect(readout).toContainText(/15\.00\s*mL/);
  await expect(readout).toContainText(/35\.00\s*mL/);

  // Always mounted, empty until something is wrong.
  const warnings = page.locator('ul[role="status"]');
  await expect(warnings).not.toContainText(en.calc.warnings.amount_not_positive);
  await mark(warnings);
  for (const bad of ["0", "-5"]) {
    await size.fill(bad);
    await expect(warnings).toContainText(en.calc.warnings.amount_not_positive);
  }
  await stillMarked(warnings);
  await size.fill("50");
  await expect(warnings).not.toContainText(en.calc.warnings.amount_not_positive);
  await stillMarked(warnings);
});

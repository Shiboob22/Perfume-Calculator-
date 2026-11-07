import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { USER, json, signIn } from "./helpers.js";

// Bench SaaS Phase 7: the guided tour. Six stops (bench sheet, blend editor,
// scale, Pour along on its tare step, the cost card's Pro preview, the
// upgrade sheet), a spotlight and a card. Finishing or skipping puts the page
// back exactly as it was, and the plan is never changed: the fake database
// below records every write, and the plan row must come out as it went in.
// Placement and keys are unit-tested in src/lib/tour.test.js.
test.use({ serviceWorkers: "block", storageState: { cookies: [], origins: [] } });

const DRAFT = "sh-calc-draft-v1";

async function fakeApi(page, locale, { seen = null } = {}) {
  const db = { plan: "free", planWrites: [], profileWrites: [], profile: { locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: seen } };
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = req.url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/user_plans") && req.method() !== "GET") { db.planWrites.push(req.method()); return json(route, []); }
    if (url.includes("/rest/v1/profiles")) {
      if (req.method() !== "GET") {
        const body = req.postDataJSON();
        db.profileWrites.push(body);
        db.profile = { ...db.profile, ...body };
        return json(route, db.profile); // .single(): one object
      }
      return json(route, [db.profile]);
    }
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    if (p === "/api/account" && req.method() !== "GET") { db.planWrites.push(`${req.method()} ${p}`); return json(route, {}, 500); }
    if (p === "/api/me") return json(route, { plan: db.plan, name: "Free", features: [], batchCap: 25, batchesUsed: 0 });
    if (p === "/api/batches" && req.method() !== "GET") { db.planWrites.push(`${req.method()} ${p}`); return json(route, {}, 500); }
    if (p === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
  return db;
}

const card = (page) => page.locator("[data-tour-card]");
const draft = (page) => page.evaluate((k) => sessionStorage.getItem(k), DRAFT);

// The draft is the whole calculator state (strength, mode, simple/blend, the blend's rows, measured density).
async function settledDraft(page) {
  let last = null;
  await expect.poll(async () => { const d = await draft(page); const same = d === last; last = d; return same && d !== null; }).toBe(true);
  return JSON.parse(last);
}

async function walk(page, m, phone) {
  const c = card(page);
  const stops = ["sheet", "blend", "scale", "pour", "cost", "upgrade"];
  for (let i = 0; i < stops.length; i += 1) {
    await expect(c).toHaveAttribute("data-tour-card", stops[i]);
    await expect(c.locator("[data-tour-count]")).toHaveText(`${i + 1} / 6`);
    await expect(c.locator("[data-pip='on']")).toHaveCount(i + 1);
    await expect(c).toContainText(m.tour.steps[i][0]);
    // The ring sits on the stop's target.
    const spot = page.locator(`[data-tour-spot="${stops[i]}"]`);
    await expect(spot).toBeVisible();
    const target = page.locator(`[data-tour="${stops[i]}"]:visible`).first();
    await expect.poll(async () => {
      const [a, b] = await Promise.all([spot.boundingBox(), target.boundingBox()]);
      return a && b ? Math.round(Math.abs(a.x + 8 - b.x) + Math.abs(a.y + 8 - b.y)) : 999;
    }).toBeLessThan(3);
    // Phones: the card sits at the bottom of the screen.
    if (phone) {
      const box = await c.boundingBox();
      const vh = page.viewportSize().height;
      expect(Math.abs(box.y + box.height - (vh - 16))).toBeLessThan(4);
    }
    if (stops[i] === "pour") {
      // Pour along opened on its tare step, inside the Bench page.
      const demo = page.locator("[data-bench-demo]");
      await expect(demo.getByRole("heading", { level: 2, name: m.bench.tare.title })).toBeVisible();
      await expect(demo.locator("[aria-current='step']")).toContainText("02");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    }
    if (stops[i] === "cost") {
      // Pro preview: no blur, the prices count up to their sample values.
      const cost = page.locator("[data-tour='cost'] section");
      await expect(cost).toHaveAttribute("data-preview", "");
      await expect(cost.locator("[data-cost-body]")).not.toHaveAttribute("inert", "");
      await expect.poll(async () => Number((await cost.locator("[data-cost='retail'] dd span").first().textContent()).replace(/[^\d.]/g, ""))).toBeGreaterThan(0);
      await expect(cost.getByRole("button", { name: m.calc.costCard.unlock })).toHaveCount(0);
    }
    if (stops[i] === "upgrade") {
      // The sheet is modal: the card is drawn inside it, so it can still be used.
      await expect(page.locator("dialog[data-tour='upgrade'][open] [data-tour-card]")).toBeVisible();
      await expect(c.getByRole("link", { name: m.tour.journal })).toBeVisible();
      await expect(c.getByRole("button", { name: m.tour.done })).toBeVisible();
      await c.getByRole("button", { name: m.tour.done }).click();
    } else {
      await c.getByRole("button", { name: m.tour.next }).click();
    }
  }
  await expect(c).toHaveCount(0);
}

for (const [locale, m] of [["en", en], ["ar", ar]]) {
  test(`${locale}: starts by itself on a first visit, runs all six stops and puts everything back`, async ({ page }, info) => {
    const phone = info.project.name === "phone";
    await signIn(page);
    const db = await fakeApi(page, locale);
    await page.goto("/bench?size=50&unit=ml&conc=30&family=woody");
    // Before the tour starts by itself (700 ms), the page's own state.
    await expect.poll(() => draft(page), { intervals: [20] }).not.toBeNull();
    const before = JSON.parse(await draft(page));
    expect(before.concPct).toBe(30);
    expect(before.formulaType).toBe("simple");
    await expect(card(page)).toBeVisible();
    await walk(page, m, phone);

    // Put back exactly: strength, simple/blend, mode, no open panels, plan as before.
    expect(await settledDraft(page)).toEqual(before);
    await expect(page.locator("button[aria-pressed='true']", { hasText: "Extrait" })).toBeVisible();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(page.locator("[data-bench-demo]")).toHaveCount(0);
    await expect(page.getByRole("region", { name: m.calc.costCard.title }).getByRole("button", { name: m.calc.costCard.unlock })).toBeVisible();
    await expect(page.getByRole("button", { name: m.upgrade.badgeFree })).toBeVisible();
    expect(db.plan).toBe("free");
    expect(db.planWrites).toEqual([]);

    // Seen: kept on the server and in this browser; a reload doesn't start it again.
    await expect.poll(() => db.profileWrites.length).toBe(1);
    expect(Object.keys(db.profileWrites[0]).sort()).toEqual(["bench_tour_at", "updated_at", "user_id"]);
    expect(await page.evaluate(() => localStorage.getItem("kyphira.benchTourSeen"))).toBe("1");
    await page.evaluate(() => localStorage.removeItem("kyphira.benchTourSeen"));
    await page.reload();
    await expect(page.getByRole("button", { name: m.tour.take })).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(card(page)).toHaveCount(0); // the server says seen
  });
}

test("from the link, in Blend and another mode: Escape skips and puts the blend, mode and strength back", async ({ page }) => {
  await signIn(page);
  const db = await fakeApi(page, "en", { seen: "2026-11-01T00:00:00Z" });
  await page.goto("/bench?size=100&unit=ml&conc=20&family=woody");
  await page.getByRole("button", { name: en.calc.blend.blend, exact: true }).click();
  await page.getByRole("button", { name: en.calc.blend.add }).click();
  await page.getByRole("button", { name: en.calc.modes.tabs.fromOil }).click();
  const before = await settledDraft(page);
  expect(before.mode).toBe("fromOil");
  expect(before.blend).toHaveLength(2);
  await page.waitForTimeout(1000);
  await expect(card(page)).toHaveCount(0); // seen: no start by itself

  await page.getByRole("button", { name: en.tour.take }).click();
  await expect(card(page)).toHaveAttribute("data-tour-card", "sheet");
  // The arrows step (focus is not in a field).
  await page.keyboard.press("ArrowRight");
  await expect(card(page)).toHaveAttribute("data-tour-card", "blend");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(card(page)).toHaveAttribute("data-tour-card", "pour");
  await page.keyboard.press("ArrowLeft");
  await expect(card(page)).toHaveAttribute("data-tour-card", "scale");
  await page.keyboard.press("Escape");
  await expect(card(page)).toHaveCount(0);
  expect(await settledDraft(page)).toEqual(before);
  await expect(page.getByRole("button", { name: en.calc.modes.tabs.fromOil })).toHaveAttribute("aria-pressed", "true");
  expect(db.planWrites).toEqual([]);
  expect(db.profileWrites).toEqual([]); // already seen on the server
});

test("ar: the arrows are mirrored, and the upgrade stop's Journal link ends the tour first", async ({ page }) => {
  await signIn(page);
  const db = await fakeApi(page, "ar", { seen: "2026-11-01T00:00:00Z" });
  await page.goto("/bench?size=100&unit=ml&conc=20&family=woody&tour=1");
  await expect(card(page)).toHaveAttribute("data-tour-card", "sheet");
  await expect(page).not.toHaveURL(/tour=1/);
  const before = { conc: "20" };
  await page.keyboard.press("ArrowLeft");
  await expect(card(page)).toHaveAttribute("data-tour-card", "blend");
  await page.keyboard.press("ArrowRight");
  await expect(card(page)).toHaveAttribute("data-tour-card", "sheet");
  for (let i = 0; i < 5; i += 1) await page.keyboard.press("ArrowLeft");
  await expect(card(page)).toHaveAttribute("data-tour-card", "upgrade");
  await card(page).getByRole("link", { name: ar.tour.journal }).click();
  await expect(page).toHaveURL(/journal/);
  const d = JSON.parse(await draft(page));
  expect(String(d.concPct)).toBe(before.conc);
  expect(d.formulaType).toBe("simple");
  expect(db.planWrites).toEqual([]);
});

test("?tour=1 starts it on demand; the card passes axe", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, "en", { seen: "2026-11-01T00:00:00Z" });
  await page.goto("/bench?tour=1");
  await expect(card(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).include("[data-tour-card]").analyze();
  expect(results.violations).toEqual([]);
});

test("reduced motion: the cost preview shows its final prices at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page);
  await fakeApi(page, "en", { seen: "2026-11-01T00:00:00Z" });
  await page.goto("/bench?size=100&unit=ml&conc=25&family=woody&tour=1");
  for (let i = 0; i < 4; i += 1) await card(page).getByRole("button", { name: en.tour.next }).click();
  await expect(card(page)).toHaveAttribute("data-tour-card", "cost");
  const retail = page.locator("[data-tour='cost'] [data-cost='retail'] dd span").first();
  await expect(page.locator("[data-tour='cost'] section")).toHaveAttribute("data-preview", "");
  const first = await retail.textContent();
  expect(Number(first.replace(/[^\d.]/g, ""))).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await retail.textContent()).toBe(first);
  const spot = page.locator("[data-tour-spot]");
  expect(await spot.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
});

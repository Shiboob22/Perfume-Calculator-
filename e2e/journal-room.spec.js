import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The Journal room (Bench SaaS Phase 5), against the production build with a
// fake session and a fake API: a batch logged on the bench shows up resting
// in the Journal; a note is added at a milestone; two notes are compared;
// Free sees its newest 3 batches and a locked card, and the trial opens the
// rest. Run at phone and desktop widths by the two projects.
test.use({ serviceWorkers: "block" });

const DAY = 86400000;
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const id = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${n}`;

function batch(n, name, tier, daysAgo, notes = []) {
  const started = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: id(n), user_id: USER.id, batch_no: n, fragrance_name: name, tier, concentration_pct: 20, amount: 50, unit: "ml",
    blend_date: localDate(started), created_at: started.toISOString(), remind: false,
    oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: 50, basis: "volume",
    batch_checkins: notes.map(([k, day, note, rating, tags]) => ({ id: `${id(n)}-${k}`, day, scheduled_day: day, note, rating, tags, skipped: false, created_at: started.toISOString() })),
    shared_recipes: null,
  };
}

const fixtures = () => [
  batch(5, "Amber Room", "oriental", 3, [["d1", 0, "Alcohol bite on top, loud.", 2, ["harsh", "sharp"]]]),
  batch(4, "Neroli Eau", "fresh", 20, [["d1", 0, "Bright neroli, thin.", 2, ["sharp"]], ["w1", 7, "Petitgrain coming through.", 3, ["rounder"]]]),
  batch(3, "Santal Dry", "woody", 50),
  batch(2, "Tuberose Soir", "floral", 100),
  batch(1, "Tonka Praline", "gourmand", 120),
];

const FREE = { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, formulaCap: null, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 5 };
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 5 };

async function fakeApi(page, { plan = "pro", locale = "en", batches = fixtures() } = {}) {
  const sent = { checkins: [], reminds: [], trial: 0, logs: [] };
  let me = plan === "pro" ? PRO : FREE;
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") return json(route, me);
    if (url.pathname === "/api/batches" && req.method() === "GET") return json(route, { batches });
    if (url.pathname === "/api/batches" && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.logs.push(body);
      const row = { ...body, user_id: USER.id, batch_no: 6, remind: false, created_at: new Date().toISOString(), batch_checkins: [], shared_recipes: null };
      batches.unshift(row);
      return json(route, { success: true, batch: row }, 201);
    }
    if (url.pathname === "/api/batches" && req.method() === "PATCH") {
      const body = req.postDataJSON();
      sent.reminds.push(body);
      const b = batches.find((x) => x.id === body.id);
      b.remind = body.remind;
      return json(route, { batch: b });
    }
    if (url.pathname === "/api/checkins" && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.checkins.push(body);
      const row = { ...body };
      delete row.upsert;
      return json(route, { checkin: { ...row, skipped: false, created_at: new Date().toISOString() } }, 201);
    }
    if (url.pathname === "/api/checkins") return json(route, { patterns: {}, locked: false });
    if (url.pathname === "/api/account" && req.method() === "POST") {
      sent.trial += 1;
      me = { ...PRO, trial: { active: true, used: true, daysLeft: 14 } };
      return json(route, { status: "started", trial_ends_at: "2026-11-19T12:00:00Z", days: 14 }, 201);
    }
    return json(route, {});
  });
  return sent;
}

const settle = (page) => page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1500))]));

test("a batch logged on the bench shows up resting in the Journal", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page, { batches: [] });
  await page.goto("/bench?size=50&unit=ml&conc=25&family=woody&name=Oud%20Nights");
  await page.getByRole("button", { name: en.bench.start }).click();
  await page.getByRole("checkbox").check();
  const next = page.getByRole("button", { name: en.bench.next, exact: true });
  await next.click(); // → tare
  await next.click(); // → oil
  const target = (label) => page.getByText(label, { exact: true }).locator("xpath=following-sibling::p[1]");
  const num = async (loc) => Number((await loc.textContent()).replace(/[^\d.]/g, ""));
  await page.getByLabel(en.bench.oil.actual).fill(String(await num(target(en.bench.oil.target))));
  await next.click(); // → ethanol
  await page.getByLabel(en.bench.alcohol.actual).fill(String(await num(target(en.bench.alcohol.target))));
  await next.click(); await next.click(); await next.click(); // → mix → check → log
  await page.getByRole("button", { name: en.bench.label.log }).click();
  await expect(page.getByText(en.calc.loggedNo.replace("{no}", "006"))).toBeVisible();

  await page.getByRole("button", { name: en.bench.after.journal }).click();
  await expect(page).toHaveURL(new RegExp(`/journal\\?batch=${sent.logs[0].id}$`));
  await expect(page.getByRole("heading", { level: 1, name: en.journal.page.title })).toBeVisible();
  const row = page.locator(`[data-batch="${sent.logs[0].id}"]`);
  await expect(row).toContainText("Oud Nights");
  await expect(row).toContainText(en.journal.page.newBadge);
  await expect(row).toHaveAttribute("aria-pressed", "true");
  // The row carries the rest progress and, owing its Day 1 note, leads the list.
  await expect(row).toContainText(en.journal.page.readyIn.other.replace("{count}", "90"));
  await expect(row).toContainText(en.journal.page.progress.replace("{n}", "0"));
  await expect(row).toContainText(en.journal.page.noteDue.replace("{milestone}", en.journal.page.milestones.d1));
  await expect(page.locator("[data-batch]").first()).toHaveAttribute("data-batch", sent.logs[0].id);
  const detail = page.getByRole("region", { name: "Oud Nights" });
  await expect(detail).toContainText("No. 006");
  // Day 1 is today: its note is open; Week 1 is ahead.
  await expect(detail.locator('[data-node="d1"]')).toHaveAttribute("aria-pressed", "true");
  await detail.locator('[data-node="w1"]').click();
  await expect(detail.getByText(en.journal.page.future.split("{date}")[0].trim())).toBeVisible();
  await expect(detail.getByRole("button", { name: en.journal.page.save })).toHaveCount(0);
  // The journal is the nav's Journal tab.
  const nav = page.getByRole("navigation", { name: new RegExp(`^(${en.app.tabsLabel}|${en.app.barLabel})$`) });
  await expect(nav.getByRole("link", { name: new RegExp(en.app.tabs.journal) })).toHaveAttribute("aria-current", "page");
});

test("a note at a milestone, two notes compared, and the reminder (Pro)", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page);
  await page.goto("/journal");
  const p = en.journal.page;

  // "Ready soon" is folded into the list: no rail, rest progress on each row.
  await expect(page.getByRole("heading", { name: p.soon })).toHaveCount(0);
  await expect(page.locator(`[data-batch="${id(1)}"] [data-ready]`)).toHaveText(p.ready);
  await expect(page.locator(`[data-batch="${id(3)}"] [data-ready]`)).toHaveText(p.readyIn.other.replace("{count}", "40"));
  // The list's milestone dots: Neroli has notes at Day 1 and Week 1, reached Week 2.
  await expect(page.locator(`[data-batch="${id(4)}"]`)).toContainText("● ● ○ · ·");

  await page.locator(`[data-batch="${id(4)}"]`).click();
  const detail = page.getByRole("region", { name: "Neroli Eau" });
  await expect(detail).toContainText("No. 004");
  // Today (day 20) is between Week 2 and Month 1, so Week 2 opens first.
  await expect(detail.locator('[data-node="w2"]')).toHaveAttribute("aria-pressed", "true");
  await expect(detail.locator("[data-today]")).toBeVisible();

  // A note at Week 2: text, a rating, a tag.
  await detail.getByLabel(p.note, { exact: true }).fill("Creamier. Less sharp.");
  await detail.getByRole("button", { name: p.ratingN.other.replace("{count}", "4") }).click();
  await detail.getByRole("button", { name: p.tag.rounder }).click();
  await detail.getByRole("button", { name: p.save }).click();
  await expect(detail.getByRole("status").filter({ hasText: p.saved })).toBeVisible();
  expect(sent.checkins[0]).toMatchObject({ batch_id: id(4), day: 20, scheduled_day: 14, note: "Creamier. Less sharp.", rating: 4, tags: ["rounder"], upsert: true });
  await expect(detail.locator('[data-node="w2"]')).toHaveAttribute("aria-label", new RegExp(p.dots.note));

  // Editing Day 1 keeps its note's id.
  await detail.locator('[data-node="d1"]').click();
  await expect(detail.getByLabel(p.note, { exact: true })).toHaveValue("Bright neroli, thin.");
  // Month 1 is ahead.
  await detail.locator('[data-node="m1"]').click();
  await expect(detail.getByText(p.future.split("{date}")[0].trim())).toBeVisible();

  // Compare any two notes.
  await detail.getByRole("button", { name: p.compare }).click();
  const compare = detail.getByRole("region", { name: p.compareTitle });
  await compare.getByLabel(p.a).selectOption("d1");
  await compare.getByLabel(p.b).selectOption("w2");
  await expect(compare.locator('[data-compare="d1"]')).toContainText("Bright neroli, thin.");
  await expect(compare.locator('[data-compare="w2"]')).toContainText("Creamier. Less sharp.");
  await expect(compare.locator('[data-compare="w2"]')).toContainText(p.tag.rounder);
  await compare.getByLabel(p.b).selectOption("w1");
  await expect(compare.locator('[data-compare="w1"]')).toContainText("Petitgrain coming through.");

  // The reminder: stored only.
  const remind = detail.getByRole("button", { name: p.remind });
  await remind.click();
  await expect(detail.getByRole("button", { name: p.reminded })).toHaveAttribute("aria-pressed", "true");
  expect(sent.reminds).toEqual([{ id: id(4), remind: true }]);
  await expect(detail.getByText(p.remindNote)).toBeVisible();

  await settle(page);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

const order = (page) => page.locator("[data-batch]").evaluateAll((els) => els.map((e) => e.getAttribute("data-batch")));

test("the list sorts: needs a note (default), newest, maceration, size; kept on reload", async ({ page }) => {
  await signIn(page);
  const batches = fixtures();
  [30, 100, 10, 50, 100].forEach((ml, i) => { batches[i].total_ml = ml; });
  await fakeApi(page, { batches });
  await page.goto("/journal");
  const p = en.journal.page;
  const sorts = page.getByRole("group", { name: p.sort.label });
  await expect(sorts.getByRole("button", { name: p.sort.note })).toHaveAttribute("aria-pressed", "true");
  // Neroli owes Week 2 (closes in 10 days), Santal Month 1 (40), then the two
  // at Month 3 (never closes), then Amber, noted.
  await expect.poll(() => order(page)).toEqual([id(4), id(3), id(2), id(1), id(5)]);
  // With no batch picked, the room opens on the first row.
  await expect(page.locator(`[data-batch="${id(4)}"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`[data-batch="${id(4)}"] [data-due]`)).toHaveText(p.noteDue.replace("{milestone}", p.milestones.w2));
  await expect(page.locator(`[data-batch="${id(5)}"] [data-due]`)).toHaveCount(0);

  await sorts.getByRole("button", { name: p.sort.new }).click();
  await expect.poll(() => order(page)).toEqual([id(5), id(4), id(3), id(2), id(1)]);
  await expect(page.locator("[data-due]")).toHaveCount(0);
  await sorts.getByRole("button", { name: p.sort.rest }).click();
  await expect.poll(() => order(page)).toEqual([id(1), id(2), id(3), id(4), id(5)]);
  await sorts.getByRole("button", { name: p.sort.size }).click();
  // 100 mL twice: the newer first.
  await expect.poll(() => order(page)).toEqual([id(4), id(1), id(2), id(5), id(3)]);
  await expect(page).toHaveURL(/[?&]sort=size/);
  // The selected batch stays selected across sorts.
  await expect(page.locator(`[data-batch="${id(4)}"]`)).toHaveAttribute("aria-pressed", "true");

  // Kept on reload and, with no ?sort=, remembered on this device.
  await page.reload();
  await expect(sorts.getByRole("button", { name: p.sort.size })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/journal");
  await expect(sorts.getByRole("button", { name: p.sort.size })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/journal?sort=bogus");
  await expect(sorts.getByRole("button", { name: p.sort.note })).toHaveAttribute("aria-pressed", "true");
});

test("each sort but needs a note runs either way; the direction is kept", async ({ page }) => {
  await signIn(page);
  const batches = fixtures();
  [30, 100, 10, 50, 100].forEach((ml, i) => { batches[i].total_ml = ml; });
  await fakeApi(page, { batches });
  await page.goto("/journal");
  const p = en.journal.page;
  const sorts = page.getByRole("group", { name: p.sort.label });
  const dir = page.locator("[data-sort-dir]");
  // Needs a note has no direction.
  await expect(dir).toHaveCount(0);

  await sorts.getByRole("button", { name: p.sort.new }).click();
  await expect(dir).toHaveText(p.dir.new.desc);
  await dir.click();
  await expect(dir).toHaveText(p.dir.new.asc);
  await expect(dir).toBeFocused();
  await expect.poll(() => order(page)).toEqual([id(1), id(2), id(3), id(4), id(5)]);
  await expect(page).toHaveURL(/[?&]dir=asc/);

  // A new sort starts in its own default direction.
  await sorts.getByRole("button", { name: p.sort.rest }).click();
  await expect(dir).toHaveText(p.dir.rest.asc);
  await expect.poll(() => order(page)).toEqual([id(1), id(2), id(3), id(4), id(5)]);
  await dir.click();
  await expect(dir).toHaveText(p.dir.rest.desc);
  await expect.poll(() => order(page)).toEqual([id(5), id(4), id(3), id(2), id(1)]);

  await sorts.getByRole("button", { name: p.sort.size }).click();
  await expect(dir).toHaveText(p.dir.size.desc);
  await dir.click();
  // Smallest first; the two at 100 mL still newest first.
  await expect.poll(() => order(page)).toEqual([id(3), id(5), id(2), id(4), id(1)]);

  // Kept on reload and on this device.
  await page.reload();
  await expect(dir).toHaveText(p.dir.size.asc);
  await page.goto("/journal");
  await expect(dir).toHaveText(p.dir.size.asc);
  await expect.poll(() => order(page)).toEqual([id(3), id(5), id(2), id(4), id(1)]);
  // Back to needs a note: no direction.
  await sorts.getByRole("button", { name: p.sort.note }).click();
  await expect(dir).toHaveCount(0);
});

test("ar: the sort chips and direction at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await signIn(page);
  await fakeApi(page, { locale: "ar" });
  await page.goto("/ar/journal");
  const p = ar.journal.page;
  const sorts = page.getByRole("group", { name: p.sort.label });
  await expect(sorts.getByRole("button")).toHaveCount(4);
  await sorts.getByRole("button", { name: p.sort.rest }).click();
  await expect.poll(() => order(page)).toEqual([id(1), id(2), id(3), id(4), id(5)]);
  await page.locator("[data-sort-dir]").click();
  await expect(page.locator("[data-sort-dir]")).toHaveText(p.dir.rest.desc);
  await expect.poll(() => order(page)).toEqual([id(5), id(4), id(3), id(2), id(1)]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await settle(page);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

for (const [locale, m, path] of [["en", en, "/journal"], ["ar", ar, "/ar/journal"]]) {
  test(`${locale}: Free sees its newest 3 batches, a locked card, and the trial opens the rest`, async ({ page }) => {
    await signIn(page);
    const sent = await fakeApi(page, { plan: "free", locale });
    await page.goto(path);
    const p = m.journal.page;
    await expect(page.getByRole("heading", { level: 1, name: p.title })).toBeVisible();
    await expect(page.locator("[data-batch]")).toHaveCount(3);
    await expect(page.locator(`[data-batch="${id(2)}"]`)).toHaveCount(0);
    const title = locale === "en" ? p.locked.other.replace("{count}", "2") : p.locked.two;
    const locked = page.locator("[data-pro-card]").filter({ hasText: title });
    await expect(locked).toContainText(p.lockedBody);

    // A reminder is Pro: Free gets the Pro card, nothing is sent.
    await page.getByRole("button", { name: new RegExp(p.remind) }).click();
    await expect(page.locator("[data-pro-card]").filter({ hasText: p.remindPro })).toContainText(p.remindBody);
    expect(sent.reminds).toEqual([]);

    await settle(page);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations).toEqual([]);

    await locked.getByRole("button", { name: m.plan.trial.start }).click();
    await expect(page.locator("[data-batch]")).toHaveCount(5);
    expect(sent.trial).toBe(1);
    await expect(page.locator("[data-pro-card]").filter({ hasText: title })).toHaveCount(0);
  });
}

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

// Month 1 opened 3 days ago: inside Smell today's week (Santal's opened 20 days ago, so it stays off the strip).
const withRecent = () => [...fixtures(), batch(6, "Vetiver Cut", "woody", 33)];

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

test("a note written offline waits on the phone and is sent when the connection returns", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page);
  let offline = true;
  // Registered after the fake API, so it answers first; fallback() hands the call on.
  await page.route("**/api/checkins", (route) => (offline && route.request().method() === "POST" ? route.abort("internetdisconnected") : route.fallback()));
  await page.goto("/journal");
  const p = en.journal.page;

  await page.locator(`[data-batch="${id(4)}"]`).click();
  const detail = page.getByRole("region", { name: "Neroli Eau" });
  await detail.getByLabel(p.note, { exact: true }).fill("Smoother after a fortnight.");
  await detail.getByRole("button", { name: p.save }).click();
  await expect(detail.getByRole("status").filter({ hasText: p.savedOffline })).toBeVisible();
  await expect(detail.locator('[data-node="w2"]')).toHaveAttribute("aria-label", new RegExp(p.dots.note));
  expect(sent.checkins).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sh-outbox")).length)).toBe(1);

  offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => sent.checkins.length).toBe(1);
  expect(sent.checkins[0]).toMatchObject({ batch_id: id(4), scheduled_day: 14, note: "Smoother after a fortnight.", upsert: true });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sh-outbox")).length)).toBe(0);
});

test("Smell today: due batches, a quick note in three taps, and a quiet day", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page, { batches: withRecent() });
  await page.goto("/journal");
  const p = en.journal.page;
  const strip = page.getByRole("region", { name: p.todayStrip.title });

  // Day 20 Neroli owes Week 2; Amber (day 3, noted at Day 1) owes nothing.
  await expect(strip.locator(`[data-today-card="${id(4)}"]`)).toContainText("Smell No. 004, Week 2");
  await expect(strip.locator(`[data-today-card="${id(5)}"]`)).toHaveCount(0);
  // Only milestones opened in the last 7 days, closing soonest first: Neroli's Week 2 (10 days left) before Vetiver's Month 1 (57).
  // Santal's Month 1 opened 20 days ago and Tuberose's Month 3 10 days ago: still in the list below, not on the strip.
  const cards = await strip.locator("[data-today-card]").evaluateAll((els) => els.map((e) => e.getAttribute("data-today-card")));
  expect(cards).toEqual([id(4), id(6)]);
  await expect(page.locator(`[data-batch="${id(3)}"]`)).toBeVisible();

  await strip.locator(`[data-today-card="${id(4)}"]`).getByRole("button", { name: p.todayStrip.add }).click();
  const sheet = page.getByRole("dialog", { name: "No. 004, Week 2" });
  await sheet.getByRole("button", { name: p.ratingN.other.replace("{count}", "4") }).click();
  await sheet.getByRole("button", { name: p.tag.rounder }).click();
  await sheet.getByRole("button", { name: p.save }).click();
  await expect(strip.getByRole("status").filter({ hasText: "Noted No. 004, Week 2." })).toBeVisible();
  await expect(strip.locator(`[data-today-card="${id(4)}"]`)).toHaveCount(0);
  expect(sent.checkins[0]).toMatchObject({ batch_id: id(4), day: 20, scheduled_day: 14, rating: 4, tags: ["rounder"], upsert: true });

  // A quiet day says what comes next.
  const quiet = await page.context().newPage();
  await signIn(quiet);
  await fakeApi(quiet, { batches: [batch(5, "Amber Room", "oriental", 3, [["d1", 0, "Loud.", 2, ["harsh"]]])] });
  await quiet.goto("/journal");
  await expect(quiet.getByRole("region", { name: p.todayStrip.title })).toContainText("Nothing to smell today. Next: No. 005 on");
});

test("the curve: a plain line before three rated notes, then the drawing, its peak and its words", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { batches: [
    ...fixtures(),
    batch(6, "Santal Soir", "woody", 40, [["d1", 0, "Raw.", 2, ["harsh"]], ["w1", 7, "Calmer.", 3, ["rounder"]], ["w2", 14, "Warm and round.", 5, ["rounder", "sweeter"]], ["m1", 30, "A touch flatter.", 4, ["fading"]]]),
  ] });
  await page.goto("/journal?batch=" + id(4));
  const p = en.journal.page;
  const curve = page.locator("[data-curve]");

  // Neroli has two rated notes: words only, no drawing.
  await expect(curve).toContainText("2 rated notes so far. The curve draws from 3.");
  await expect(curve.locator("[data-curve-svg]")).toHaveCount(0);

  await page.goto("/journal?batch=" + id(6));
  await expect(curve.locator("[data-curve-svg]")).toBeVisible();
  await expect(curve.locator("[data-curve-svg] circle")).toHaveCount(5); // four dots and the ringed peak
  await expect(curve).toContainText("rated best at Week 2 (5 of 5)");
  await expect(curve.locator("[data-curve-note]")).toHaveCount(4);
  await expect(curve.locator('[data-curve-note="14"]')).toContainText("Day 14: 5 of 5");
  await expect(curve.locator('[data-curve-note="14"]')).toContainText(`${p.tag.rounder}, ${p.tag.sweeter}`);

  if (process.env.SHOT_DIR) await curve.screenshot({ path: `${process.env.SHOT_DIR}/curve-${test.info().project.name}.png` });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("your batches of this oil: Pro sees them on one curve and which rated best; Free sees the offer", async ({ page, browser }) => {
  const rows = () => {
    const a = { ...batch(6, "Oud Nights", "woody", 60, [["d1", 0, "Raw.", 2, []], ["w1", 7, "Calmer.", 3, []], ["w2", 14, "Round.", 4, []]]), concentration_pct: 20 };
    const b = { ...batch(7, "oud nights ", "woody", 40, [["d1", 0, "Raw.", 3, []], ["w1", 7, "Better.", 5, []], ["m1", 30, "Still good.", 4, []]]), concentration_pct: 25 };
    return [b, a, batch(5, "Amber Room", "oriental", 3)];
  };
  await signIn(page);
  await fakeApi(page, { batches: rows() });
  await page.goto("/journal?batch=" + id(7));
  const oil = page.locator("[data-oil]");
  await expect(oil).toContainText("Of your 2 batches of this oil, No. 007 at 25% (EDP Intense) rated best, at Week 1 (5 of 5).");
  await expect(oil.locator("[data-oil-svg] path")).toHaveCount(2);
  await expect(oil.locator("[data-oil-row]")).toHaveCount(2);
  await expect(oil.locator(`[data-oil-row="${id(6)}"]`)).toContainText("No. 006 at 20% (EDP)");
  await expect(oil.locator("[data-pro-card]")).toHaveCount(0);
  if (process.env.SHOT_DIR) await oil.screenshot({ path: `${process.env.SHOT_DIR}/oil-${test.info().project.name}.png` });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations).toEqual([]);

  // Make again at the winner's settings: the Bench opens on its oil, strength and size, with a line about it.
  await oil.locator("[data-make-again]").click();
  await expect(page).toHaveURL(/\/bench\?size=50&unit=ml&conc=25&family=woody&name=oud\+nights&best=7:7$/);
  await expect(page.locator("[data-best-from]")).toHaveText("Your best of this oil was No. 007, rested 7 days.");
  await page.goto("/journal?batch=" + id(7));

  // A batch of another oil has no overlay.
  await page.goto("/journal?batch=" + id(5));
  await expect(page.locator("[data-oil]")).toHaveCount(0);

  const free = await browser.newPage();
  await signIn(free);
  await fakeApi(free, { plan: "free", batches: rows() });
  await free.goto("/journal?batch=" + id(7));
  await expect(free.locator("[data-oil] [data-pro-card]")).toContainText(en.journal.page.oil.proBody);
  await expect(free.locator("[data-oil-svg]")).toHaveCount(0);
});

test("compare two batches side by side (Pro); Free sees the offer", async ({ page, browser }) => {
  const rows = () => {
    const a = { ...batch(6, "Oud Nights", "woody", 60, [["d1", 0, "Raw.", 2, ["harsh"]], ["w1", 7, "Calmer.", 3, ["rounder"]], ["w2", 14, "Round.", 4, ["rounder"]]]), concentration_pct: 20 };
    const b = { ...batch(7, "Oud Nights", "woody", 40, [["d1", 0, "Raw.", 3, []], ["w1", 7, "Better.", 5, ["sweeter"]]]), concentration_pct: 25 };
    return [b, a, batch(5, "Amber Room", "oriental", 3)];
  };
  await signIn(page);
  await fakeApi(page, { batches: rows() });
  await page.goto("/journal?batch=" + id(7));
  const cmp = page.locator("[data-compare]");
  const p = en.journal.page;
  // The same oil comes first in the list.
  await expect(cmp.locator("select option")).toHaveCount(3);
  const options = await cmp.locator("select option").allTextContents();
  expect(options).toEqual([p.cmp.choose, "No. 006, Oud Nights, 20%", "No. 005, Amber Room, 20%"]);
  await expect(cmp.locator("table")).toHaveCount(0);
  await cmp.getByLabel(p.cmp.pick).selectOption(id(6));
  const table = cmp.locator("[data-compare-table]");
  await expect(table.getByRole("columnheader")).toHaveCount(2);
  await expect(table.getByRole("row", { name: new RegExp(p.cmp.strength) })).toContainText("25% (EDP Intense)");
  await expect(table.getByRole("row", { name: new RegExp(p.cmp.strength) })).toContainText("20% (EDP)");
  await expect(table.getByRole("row", { name: new RegExp(p.cmp.peak) })).toContainText("Week 1, day 7 (5 of 5)");
  await expect(table.getByRole("row", { name: new RegExp(p.cmp.peak) })).toContainText("Week 2, day 14 (4 of 5)");
  await expect(table.getByRole("row", { name: new RegExp(p.cmp.tags) })).toContainText(`${p.tag.rounder} ×2, ${p.tag.harsh}`);
  const axe = await new AxeBuilder({ page }).include("[data-compare]").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations).toEqual([]);

  const free = await browser.newPage();
  await signIn(free);
  await fakeApi(free, { plan: "free", batches: rows() });
  await free.goto("/journal?batch=" + id(7));
  await expect(free.locator("[data-compare] [data-pro-card]")).toContainText(en.journal.page.cmp.proBody);
  await expect(free.locator("[data-compare-table]")).toHaveCount(0);
});

test("phone: a tapped batch opens its record on its own screen; back returns to the list", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "wide screens show the list and the record side by side");
  await signIn(page);
  const old = { ...batch(1, "Old Oud", "oriental", 70), amount: null, unit: null, total_ml: 100 };
  await fakeApi(page, { batches: [...fixtures().filter((x) => x.batch_no !== 1), old] });
  await page.goto("/journal");
  const p = en.journal.page;
  const record = page.locator("[data-journal-record]");
  // The list alone, with a size for a batch logged before the typed size was kept.
  await expect(page.locator(`[data-batch="${id(1)}"]`)).toContainText("100 mL");
  await expect(record).toBeHidden();
  await page.locator(`[data-batch="${id(4)}"]`).click();
  await expect(record.getByRole("heading", { level: 2, name: "Neroli Eau" })).toBeVisible();
  await expect(page.locator("[data-record]")).toContainText("9.5 g");
  await expect(page.locator("[data-batch]").first()).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(400);
  // The back button, then the phone's own back gesture, both return to the list.
  await page.getByRole("button", { name: p.backToList }).click();
  await expect(page.locator(`[data-batch="${id(4)}"]`)).toBeVisible();
  await expect(record).toBeHidden();
  await page.locator(`[data-batch="${id(4)}"]`).click();
  await expect(record).toBeVisible();
  await page.goBack();
  await expect(page.locator(`[data-batch="${id(4)}"]`)).toBeVisible();
  await expect(page).toHaveURL(/\/journal$/);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("the batch record lives in the Journal: weights, the actions, and delete", async ({ page }) => {
  await signIn(page);
  let deleted = null;
  await fakeApi(page);
  await page.route("**/api/batches?id=*", (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    deleted = new URL(route.request().url()).searchParams.get("id");
    return json(route, { success: true });
  });
  await page.goto("/journal?batch=" + id(4));
  const rec = page.locator("[data-record]");
  const p = en.journal.page;
  await expect(rec.getByRole("heading", { name: p.record.title })).toBeVisible();
  await expect(rec).toContainText("9.5 g");
  await expect(rec).toContainText("41.90 g");
  await expect(rec.getByRole("link", { name: en.batches.again })).toHaveAttribute("href", /\/bench\?size=50&unit=ml&conc=20&family=fresh&name=Neroli\+Eau/);
  await expect(rec.getByRole("button", { name: en.batches.exportCard })).toBeVisible();
  await expect(rec.getByRole("button", { name: en.batches.edit.open, exact: true })).toBeVisible();

  // Delete takes a second tap, then the batch leaves the list.
  await rec.getByRole("button", { name: en.batches.delete }).click();
  await rec.getByRole("button", { name: en.batches.delete }).click();
  await expect(page.locator(`[data-batch="${id(4)}"]`)).toHaveCount(0);
  expect(deleted).toBe(id(4));
});

test("a seller sees the bottles promised on a batch; the records page links to the Journal", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.route(/\/rest\/v1\/profiles/, (route) => json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", sells: true, currency: "EGP" }]));
  await page.route("**/api/batches?resource=orders", (route) => json(route, { orders: [
    { id: "o1", status: "resting", batch_id: id(4), scent_text: "Neroli", size_ml: 30, strength_pct: 20, buyer_name: "A" },
    { id: "o2", status: "bottled", batch_id: id(4), scent_text: "Neroli", size_ml: 30, strength_pct: 20, buyer_name: "B" },
    { id: "o3", status: "handed_over", batch_id: id(4), scent_text: "Neroli", size_ml: 30, strength_pct: 20, buyer_name: "C" },
    { id: "o4", status: "resting", batch_id: id(3), scent_text: "Santal", size_ml: 30, strength_pct: 20, buyer_name: "D" },
  ] }));
  await page.goto("/journal?batch=" + id(4));
  await expect(page.locator("[data-promised]")).toContainText("2 bottles promised, ready on");
  await page.goto("/journal?batch=" + id(3));
  await expect(page.locator("[data-promised]")).toContainText("1 bottle promised, ready on");
  await page.goto("/journal?batch=" + id(5));
  await expect(page.locator("[data-record]")).toBeVisible();
  await expect(page.locator("[data-promised]")).toHaveCount(0);

  // The records page sends a batch to its home in the Journal.
  await page.goto("/bench/journal");
  await page.getByRole("button", { name: en.batches.openJournal }).first().click();
  await expect(page).toHaveURL(/\/journal\?batch=/);
  await expect(page.locator("[data-record]")).toBeVisible();
});

test("the room's small motions run, and stop under reduced motion", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  const names = () => page.evaluate(() => ({
    fill: getComputedStyle(document.querySelector("[data-track-fill]")).animationName,
    line: getComputedStyle(document.querySelector(".kx-curve-line") ?? document.body).animationName,
  }));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/journal?batch=" + id(4));
  await expect(page.locator("[data-track-fill]")).toBeAttached();
  expect((await names()).fill).toBe("kx-track-fill");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await names()).fill).toBe("none");

  // A saved note settles in.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const detail = page.getByRole("region", { name: "Neroli Eau" });
  await detail.getByLabel(en.journal.page.note, { exact: true }).fill("Warmer.");
  await detail.getByRole("button", { name: en.journal.page.save }).click();
  const saved = detail.getByRole("status").getByText(en.journal.page.saved);
  await expect(saved).toBeVisible();
  expect(await saved.evaluate((el) => getComputedStyle(el).animationName)).toBe("kx-settle");
});

test("M1: one saved state, a sheet that leaves faster than it came, and none of it under reduced motion", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { batches: withRecent() });
  const p = en.journal.page;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/journal");
  const strip = page.getByRole("region", { name: p.todayStrip.title });
  // Records when the sheet starts leaving and when the dialog actually closes.
  const watch = () => page.evaluate(() => {
    window.__sheet = [];
    const d = document.querySelector("dialog.kx-sheet");
    new MutationObserver(() => window.__sheet.push([performance.now(), d.hasAttribute("data-leaving"), d.open, getComputedStyle(d).animationDuration]))
      .observe(d, { attributes: true, attributeFilter: ["data-leaving", "open"] });
  });

  await strip.locator(`[data-today-card="${id(4)}"]`).getByRole("button", { name: p.todayStrip.add }).click();
  const sheet = page.getByRole("dialog", { name: "No. 004, Week 2" });
  await expect(sheet).toBeVisible();
  expect(await sheet.evaluate((d) => [getComputedStyle(d).animationName, getComputedStyle(d).animationDuration]))
    .toEqual([expect.stringMatching(/^kx-(sheet|pop)-in$/), "0.25s"]);
  await watch();
  await sheet.getByRole("button", { name: p.todayStrip.close }).click();
  await expect(sheet).toBeHidden();
  // The sheet keeps its name while it leaves, so it is still there during the exit.
  await expect.poll(() => page.evaluate(() => window.__sheet.some(([, , open]) => !open))).toBe(true);
  const log = await page.evaluate(() => window.__sheet);
  const left = log.find(([, leaving]) => leaving);
  const closed = log.find(([, , open]) => !open);
  expect(left?.[3]).toBe("0.15s");
  expect(closed[0] - left[0]).toBeGreaterThanOrEqual(120);

  // Saving through the sheet answers in the shared saved state: the words and a drawn check.
  await strip.locator(`[data-today-card="${id(4)}"]`).getByRole("button", { name: p.todayStrip.add }).click();
  await sheet.getByRole("button", { name: p.ratingN.other.replace("{count}", "4") }).click();
  await sheet.getByRole("button", { name: p.save }).click();
  const status = strip.locator('[data-save-state="saved"]');
  await expect(status).toContainText("Noted No. 004, Week 2.");
  await expect(status.locator("svg.kx-tick")).toBeAttached();

  // Reduced motion: the sheet closes at once, with no leaving step.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await strip.locator("[data-today-card]").first().getByRole("button", { name: p.todayStrip.add }).click();
  const again = page.locator("dialog.kx-sheet[open]");
  await expect(again).toBeVisible();
  expect(await again.evaluate((d) => getComputedStyle(d).animationName)).toBe("none");
  await watch();
  await again.getByRole("button", { name: p.todayStrip.close }).click();
  await expect(again).toBeHidden();
  expect((await page.evaluate(() => window.__sheet)).some(([, leaving]) => leaving)).toBe(false);
});

test("M1: the phone bar has one room rule; it sits under the room you are in and travels to the next (EN and AR)", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the bar is the phone layout");
  await signIn(page);
  await fakeApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" }); // measure the resting place, not the slide
  const under = () => page.evaluate(() => {
    const ind = document.querySelector('[data-mo-ind="bar"]').getBoundingClientRect();
    const cur = document.querySelector('nav[data-mo-chrome="bar"] [aria-current="page"]').getBoundingClientRect();
    return Math.abs((ind.left + ind.width / 2) - (cur.left + cur.width / 2));
  });
  for (const [path, msgs] of [["/journal", en], ["/ar/journal", ar]]) {
    await page.goto(path);
    const bar = page.getByRole("navigation", { name: msgs.app.barLabel });
    await expect(bar.locator('[aria-current="page"]')).toBeVisible();
    await expect(page.locator('[data-mo-ind="bar"]')).toHaveCount(1);
    expect(await under()).toBeLessThan(2);
    await page.evaluate(() => { window.__ind = document.querySelector('[data-mo-ind="bar"]'); });
    await bar.getByRole("link").first().click();
    await expect(bar.getByRole("link").first()).toHaveAttribute("aria-current", "page");
    expect(await under()).toBeLessThan(2);
    // The same rule moved: it was not drawn again.
    expect(await page.evaluate(() => window.__ind === document.querySelector('[data-mo-ind="bar"]'))).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await page.locator('[data-mo-ind="bar"]').evaluate((e) => getComputedStyle(e).transitionProperty)).toContain("transform");
});

test("Pro can switch web push on for this device; Free is not offered it", async ({ page, browser }) => {
  const stub = () => {
    let sub = null;
    const fake = { endpoint: "https://push.example/sub/1", toJSON: () => ({ endpoint: "https://push.example/sub/1", keys: { p256dh: "pk", auth: "ak" } }), unsubscribe: async () => { sub = null; window.__unsubscribed = true; return true; } };
    const reg = { pushManager: { getSubscription: async () => sub, subscribe: async (o) => { window.__subscribeOptions = { userVisibleOnly: o.userVisibleOnly, bytes: o.applicationServerKey.length }; sub = fake; return fake; } } };
    Object.defineProperty(navigator, "serviceWorker", { value: { register: async () => reg, getRegistration: async () => reg, ready: Promise.resolve(reg), addEventListener() {} }, configurable: true });
    window.PushManager = function PushManager() {};
    window.Notification = { permission: "default", requestPermission: async () => "granted" };
  };
  const key = Buffer.from([4, ...Array(64).fill(7)]).toString("base64url");
  const calls = [];
  await signIn(page);
  await page.addInitScript(stub);
  await fakeApi(page);
  await page.route("**/api/checkins?push=*", (route) => {
    const u = new URL(route.request().url());
    if (u.searchParams.get("push") === "key") return json(route, { publicKey: key });
    calls.push([route.request().method(), u.searchParams.get("push"), route.request().postDataJSON()]);
    return json(route, { success: true }, route.request().method() === "POST" ? 201 : 200);
  });
  await page.goto("/journal");
  const p = en.journal.page.push;
  const button = page.locator("[data-push] button");
  await expect(button).toHaveText(p.enable);
  await button.click();
  await expect(button).toHaveText(p.on);
  expect(calls[0]).toEqual(["POST", "subscribe", { endpoint: "https://push.example/sub/1", keys: { p256dh: "pk", auth: "ak" } }]);
  expect(await page.evaluate(() => window.__subscribeOptions)).toEqual({ userVisibleOnly: true, bytes: 65 });
  await button.click();
  await expect(button).toHaveText(p.enable);
  expect(calls[1]).toEqual(["DELETE", "unsubscribe", { endpoint: "https://push.example/sub/1" }]);
  expect(await page.evaluate(() => window.__unsubscribed)).toBe(true);

  // Free: no offer. Push not set up on the server: no offer either.
  const free = await browser.newPage();
  await signIn(free);
  await free.addInitScript(stub);
  await fakeApi(free, { plan: "free" });
  await free.route("**/api/checkins?push=*", (route) => json(route, { publicKey: key }));
  await free.goto("/journal");
  await expect(free.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(free.locator("[data-push]")).toHaveCount(0);
  const off = await browser.newPage();
  await signIn(off);
  await off.addInitScript(stub);
  await fakeApi(off);
  await off.route("**/api/checkins?push=*", (route) => json(route, { error: "off" }, 404));
  await off.goto("/journal");
  await expect(off.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(off.locator("[data-push]")).toHaveCount(0);
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
  test(`${locale}: Free sees its newest 3 batches, a locked card, and the trial opens the rest`, async ({ page }, info) => {
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

    // A reminder is Pro: Free gets the Pro card, nothing is sent. (On a phone the record is its own screen.)
    const phone = info.project.name === "phone";
    if (phone) await page.locator("[data-batch]").first().click();
    await page.getByRole("button", { name: new RegExp(p.remind) }).click();
    await expect(page.locator("[data-pro-card]").filter({ hasText: p.remindPro })).toContainText(p.remindBody);
    expect(sent.reminds).toEqual([]);
    if (phone) await page.getByRole("button", { name: p.backToList }).click();

    await settle(page);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations).toEqual([]);

    await locked.getByRole("button", { name: m.plan.trial.start }).click();
    await expect(page.locator("[data-batch]")).toHaveCount(5);
    expect(sent.trial).toBe(1);
    await expect(page.locator("[data-pro-card]").filter({ hasText: title })).toHaveCount(0);
  });
}

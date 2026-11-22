import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The Journal's batch page on phones (audit H5): the milestone's note comes
// right after the timeline, and the curve, the oil's batches, the compare and
// the record fold away under their titles. Wide screens show them open.
test.use({ serviceWorkers: "block" });

const DAY = 86400000;
const id = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${n}`;
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 4 };

function batch(n, daysAgo, ratings) {
  const at = new Date(Date.now() - daysAgo * DAY - 3600000);
  const days = [0, 7, 14, 30];
  return {
    id: id(n), user_id: USER.id, batch_no: n, fragrance_name: "Oud Nights", tier: "woody", concentration_pct: 25, amount: 50, unit: "ml",
    blend_date: at.toISOString().slice(0, 10), created_at: at.toISOString(), remind: false, total_ml: 50, basis: "volume",
    batch_checkins: ratings.map((r, i) => ({ id: `${id(n)}-${i}`, day: days[i], scheduled_day: days[i], note: "x", rating: r, tags: [], skipped: false, created_at: at.toISOString() })),
    shared_recipes: null,
  };
}
// No. 8 owes its Month 1 note (40 days in, three earlier notes: the curve shows); the others make the oil's sections.
const BATCHES = [batch(8, 40, [3, 4, 4]), batch(7, 60, [3, 5, 4, 4]), batch(6, 90, [2, 3, 4, 4])];
const FOLDS = ["curve", "oil", "compare", "record"];

async function open(page, locale = "en", theme = "light") {
  await signIn(page);
  // An account made after the rename never sees its notice (renameNoticeVisible).
  await page.addInitScript((th) => { try { localStorage.setItem("theme", th); localStorage.setItem("kyphira.renameNoticeDismissed", "1"); } catch { /* blocked */ } }, theme);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, PRO);
    if (p === "/api/batches") return json(route, { batches: BATCHES });
    return json(route, { patterns: {}, locked: false });
  });
  await page.goto(`${locale === "ar" ? "/ar" : ""}/journal?batch=${id(8)}`);
  await expect(page.locator("[data-record]")).toBeAttached();
}

for (const [locale, m] of [["en", en], ["ar", ar]]) {
  test(`${locale}: the note owed comes right after the timeline, its Save on the first screen of a phone`, async ({ page }, info) => {
    await open(page, locale);
    const save = page.getByRole("button", { name: m.journal.page.save, exact: true });
    await expect(save).toBeVisible();
    if (process.env.MEASURE) console.log(`[measure] ${locale} ${info.project.name} height=${await page.evaluate(() => document.documentElement.scrollHeight)} saveBottom=${Math.round((await save.boundingBox()).y + (await save.boundingBox()).height)} ${JSON.stringify(await page.evaluate(() => Object.fromEntries([["h2", "#journal-batch"], ["remind", "[aria-pressed] svg"], ["timeline", "[data-node]"], ["note", "[data-note-block]"], ["textarea", "[data-note-block] textarea"], ["save", "[data-note-block] button:last-of-type"]].map(([k, q]) => { const r = document.querySelector(q)?.getBoundingClientRect(); return [k, r ? [Math.round(r.top), Math.round(r.bottom)] : null]; }))))}`);
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/journal-batch__${locale}__${info.project.name}.png`, fullPage: true });
    // Before every section that follows, in reading order.
    const after = await page.evaluate(() => {
      const s = [...document.querySelectorAll("button")].find((x) => x.closest("[data-note-block]"));
      return ["curve", "oil", "compare", "record"].every((k) => {
        const el = document.querySelector(`[data-${k}]`);
        return el && Boolean(s.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
    });
    expect(after).toBe(true);
    if (info.project.name === "phone") {
      // Above the phone's bottom bar, which covers the foot of the screen.
      const box = await save.boundingBox();
      const bar = await page.getByRole("navigation", { name: m.app.barLabel }).boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(bar.y);
    }
  });
}

test("phones fold the four sections under their titles; one tap opens each; wide screens show them open", async ({ page }, info) => {
  await open(page);
  const phone = info.project.name === "phone";
  for (const k of FOLDS) {
    const fold = page.locator(`[data-${k}] details[data-fold]`);
    if (!phone) {
      await expect(fold).toHaveCount(0);
      continue;
    }
    await expect(fold).not.toHaveAttribute("open", "");
    await fold.locator("summary").click();
    await expect(fold).toHaveAttribute("open", "");
  }
  // Opened, the sections work as before.
  await expect(page.locator("[data-curve-svg]")).toBeVisible();
  await expect(page.locator("[data-oil-row]")).toHaveCount(3);
  await expect(page.locator("[data-record]")).toContainText(en.journal.page.record.title);
});

for (const [locale] of [["en"], ["ar"]]) {
  for (const theme of ["light", "dark"]) {
    test(`${locale} ${theme}: axe on the batch page, folded`, async ({ page }) => {
      await open(page, locale, theme);
      const { violations } = await new AxeBuilder({ page }).include("[aria-labelledby=journal-batch]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow).toBe(false);
    });
  }
}

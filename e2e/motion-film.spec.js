import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Motion M6: the film and the stills for the submission. Runs only with
// MOTION_FILM=1, on the phone project (Pixel 7). The video lands in
// test-results; scripts/motion-proof/film.sh turns it into
// docs/redesign/motion/m6/kyphira-motion.mp4. Stills go to the same folder.
test.use({ serviceWorkers: "block", video: { mode: "on", size: { width: 412, height: 915 } } });
test.skip(!process.env.MOTION_FILM, "set MOTION_FILM=1 to film");

const OUT = "docs/redesign/motion/m6";
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };
const DAY = 86400000;
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bid = (n) => `ffffffff-ffff-4fff-8fff-${String(n).padStart(12, "0")}`;
const NAMES = ["Oud Nights", "Amber Room", "Neroli Eau", "Santal Dry", "Tonka Praline", "Vetiver Cut"];
const batch = (n, daysAgo, ml) => {
  const started = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: bid(n), user_id: USER.id, batch_no: n, fragrance_name: NAMES[n - 1], tier: "woody", concentration_pct: 20, amount: ml, unit: "ml",
    blend_date: localDate(started), created_at: started.toISOString(), remind: false,
    oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: ml, basis: "volume", batch_checkins: [], shared_recipes: null,
  };
};
const BATCHES = [batch(1, 95, 100), batch(2, 8, 30), batch(3, 15, 50), batch(4, 31, 10), batch(5, 2, 75), batch(6, 60, 20)];

async function fakeApi(page, locale) {
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: locale(), default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    if (url.includes("/rest/v1/rpc/ensure_fragrance")) return json(route, [{ id: "22222222-2222-4222-8222-222222222222", name: "Oud Nights", tier: "woody" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/me") return json(route, PRO);
    if (path === "/api/batches" && req.method() === "POST") return json(route, { success: true, batch: { ...req.postDataJSON(), user_id: USER.id, batch_no: 72 } }, 201);
    if (path === "/api/batches") return json(route, { batches: BATCHES });
    if (path === "/api/checkins") return json(route, { patterns: {}, locked: false });
    return json(route, {});
  });
}

test("the motion film", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "filmed on the phone");
  test.setTimeout(120000);
  mkdirSync(OUT, { recursive: true });
  let locale = "en";
  await page.addInitScript(() => {
    for (const n of ["motion", "compounding"]) localStorage.setItem(`kyphira.flag.${n}`, "1");
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  });
  await signIn(page);
  await fakeApi(page, () => locale);
  const still = (n, name) => page.screenshot({ path: `${OUT}/${n}-${name}.png` });
  const hold = (ms) => page.waitForTimeout(ms);

  // 1. Home: the page settles, the scene scrolls.
  await page.goto("/");
  await hold(1800);
  await page.mouse.wheel(0, 900);
  await hold(1500);
  await page.mouse.wheel(0, 900);
  await hold(1200);

  // 2. The Bench: a strength chosen, the batch logged and filed into the Journal.
  await page.goto("/bench?size=50&unit=ml&conc=25&family=woody&name=Oud%20Nights");
  await hold(1500);
  await page.getByRole("button", { name: /^30\s*%/ }).first().click().catch(() => {});
  await hold(900);
  const log = page.getByRole("button", { name: en.calc.log, exact: true });
  await log.scrollIntoViewIfNeeded();
  await hold(600);
  await log.click();
  await hold(380);
  await still(1, "signature");
  await hold(1600);

  // 3. The Journal: re-sorted (rows slide), a batch picked (its name carried), a rested batch turns ready.
  await page.locator("[data-journal-door]").click();
  await hold(1600);
  await still(2, "journal");
  const chips = page.getByRole("group", { name: en.journal.page.sort.label });
  await chips.getByRole("button", { name: en.journal.page.sort.size, exact: true }).click();
  await hold(120);
  await still(3, "re-sort");
  await hold(1400);
  await page.locator(`button[data-batch="${bid(1)}"]`).click();
  await hold(500);
  await page.locator("[data-ready-moment]").scrollIntoViewIfNeeded().catch(() => {});
  await hold(400);
  await still(4, "ready-day");
  await hold(1600);

  // 4. The More sheet rises and leaves; Motion set to Calm, then back to Full.
  await page.getByRole("navigation", { name: en.app.barLabel }).getByRole("button", { name: en.app.more }).click();
  await hold(700);
  await still(5, "motion-setting");
  const g = page.getByRole("group", { name: en.settings.motion.label });
  await g.getByText(en.settings.motion.calm, { exact: true }).click();
  await hold(900);
  await g.getByText(en.settings.motion.full, { exact: true }).click();
  await hold(700);
  await page.keyboard.press("Escape");
  await hold(1000);

  // 5. The Library: one rule slides between the tabs.
  await page.goto("/library");
  await hold(1400);
  await page.getByRole("button", { name: en.site.guides.tabs.glossary }).click();
  await hold(1100);
  await page.getByRole("button", { name: en.site.guides.tabs.essays }).click();
  await hold(1200);

  // 6. The same Journal in Arabic: everything mirrored.
  locale = "ar";
  await page.goto("/journal");
  await hold(1600);
  const chipsAr = page.getByRole("group", { name: ar.journal.page.sort.label });
  await chipsAr.getByRole("button", { name: ar.journal.page.sort.size, exact: true }).click();
  await hold(150);
  await still(6, "arabic");
  await hold(1500);
  await page.getByRole("navigation", { name: ar.app.barLabel }).getByRole("link").first().click();
  await hold(1800);
});

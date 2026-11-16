import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// Motion M6, control: Full, Calm or Off, chosen in More and Account, kept on
// the device, applied before first paint. Calm keeps feedback and fades and
// drops travel (rows sliding, page slides, the signature, the home scene);
// Off stills everything. Against the production build with a fake session.
test.use({ serviceWorkers: "block" });

const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };
const DAY = 86400000;
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bid = (n) => `dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12, "0")}`;
function batch(n, daysAgo, ml) {
  const started = new Date(Date.now() - daysAgo * DAY - 3600000);
  return {
    id: bid(n), user_id: USER.id, batch_no: n, fragrance_name: `Batch ${n}`, tier: "woody", concentration_pct: 20, amount: ml, unit: "ml",
    blend_date: localDate(started), created_at: started.toISOString(), remind: false,
    oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: ml, basis: "volume", batch_checkins: [], shared_recipes: null,
  };
}
const BATCHES = [batch(1, 80, 100), batch(2, 40, 30), batch(3, 20, 50), batch(4, 5, 10)];

async function fakeApi(page, { locale = "en" } = {}) {
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
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

// The layer on, not a low-power device, a record of View Transitions, signatures and row slides.
const setup = (page, level) => page.addInitScript((lv) => {
  localStorage.setItem("kyphira.flag.motion", "1");
  if (lv && !sessionStorage.getItem("lv-set")) { localStorage.setItem("kyphira.motion", lv); sessionStorage.setItem("lv-set", "1"); }
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  window.__vts = [];
  window.__sig = 0;
  window.__slid = 0;
  const start = document.startViewTransition?.bind(document);
  if (start) document.startViewTransition = (cb) => { window.__vts.push(document.documentElement.getAttribute("data-mo-nav")); return start(cb); };
  new MutationObserver((l) => { for (const m of l) for (const n of m.addedNodes) if (n.nodeType === 1 && n.hasAttribute("data-mo-signature")) window.__sig += 1; })
    .observe(document, { childList: true, subtree: true });
  const tick = () => { window.__slid = Math.max(window.__slid, document.getAnimations().filter((a) => a.effect?.target?.hasAttribute?.("data-flip")).length); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}, level);
const level = (page) => page.evaluate(() => document.documentElement.getAttribute("data-mo-level"));
const group = (page, m = en) => page.getByRole("group", { name: m.settings.motion.label });
// A fresh settle (the shared arrival of words and counts): which animation it would run now.
const settleAnim = (page) => page.evaluate(() => {
  const e = document.createElement("span");
  e.className = "kx-settle";
  document.body.appendChild(e);
  const name = getComputedStyle(e).animationName;
  e.remove();
  return name;
});
const sortChip = (page, name) => page.getByRole("group", { name: en.journal.page.sort.label }).getByRole("button", { name, exact: true });

test("Account: choosing Calm applies at once, is kept on the device, and Full clears it", async ({ page }) => {
  await setup(page);
  await signIn(page);
  await fakeApi(page);
  await page.goto("/app/account");
  const g = group(page).last();
  await expect(g.getByRole("radio", { name: en.settings.motion.full })).toBeChecked();
  await g.getByText(en.settings.motion.calm, { exact: true }).click();
  await expect(g.getByRole("radio", { name: en.settings.motion.calm })).toBeChecked();
  expect(await level(page)).toBe("calm");
  await expect(g).toContainText(en.settings.motion.hint.calm);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mo-d-m").trim())).toBe("0px");
  await page.reload();
  expect(await level(page)).toBe("calm"); // before React: the inline script
  await expect(group(page).last().getByRole("radio", { name: en.settings.motion.calm })).toBeChecked();
  await group(page).last().getByText(en.settings.motion.full, { exact: true }).click();
  expect(await level(page)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("kyphira.motion"))).toBe("full");
});

test("phone: the setting is in the More sheet, in Arabic too", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the More sheet is the phone's");
  await setup(page);
  await signIn(page);
  await fakeApi(page, { locale: "ar" });
  await page.goto("/journal");
  await page.getByRole("navigation", { name: ar.app.barLabel }).getByRole("button", { name: ar.app.more }).click();
  const sheet = page.getByRole("dialog", { name: ar.app.moreTitle });
  const g = group(page, ar);
  await expect(sheet.locator("[data-motion-setting]")).toBeVisible();
  await g.getByText(ar.settings.motion.off, { exact: true }).click();
  expect(await level(page)).toBe("off");
});

test("Calm: a re-sort swaps without sliding, a page change cross-fades, and a log files no bottle", async ({ page }) => {
  await setup(page, "calm");
  await signIn(page);
  await fakeApi(page);
  await page.goto("/journal");
  await expect(page.locator("[data-flip]")).toHaveCount(4);
  await sortChip(page, en.journal.page.sort.size).click();
  await expect(page.locator("[data-flip]").first()).toHaveAttribute("data-flip", bid(1));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__slid)).toBe(0);
  // Feedback stays: words and counts still settle in.
  expect(await settleAnim(page)).toBe("kx-settle");
  await page.goto("/bench?size=50&unit=ml&conc=25&family=woody&name=Oud%20Nights");
  const log = page.getByRole("button", { name: en.calc.log, exact: true });
  await log.scrollIntoViewIfNeeded();
  await log.click();
  await expect(page.getByText(en.calc.loggedNo.replace("{no}", "072"))).toBeVisible();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__sig)).toBe(0);
  await page.locator("[data-journal-door]").click();
  await expect(page).toHaveURL(/\/journal/);
  const navs = await page.evaluate(() => window.__vts);
  expect(navs.length).toBeGreaterThan(0);
  expect(navs.every((n) => n === "fade")).toBe(true);
});

test("Off: nothing animates and no View Transition runs", async ({ page }) => {
  await setup(page, "off");
  await signIn(page);
  await fakeApi(page);
  await page.goto("/journal");
  await expect(page.locator("[data-flip]")).toHaveCount(4);
  await sortChip(page, en.journal.page.sort.size).click();
  await page.getByRole("link", { name: en.journal.page.records }).click();
  await expect(page).toHaveURL(/\/bench\/journal/);
  expect(await page.evaluate(() => window.__vts)).toEqual([]);
  const moving = await page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => {
    const s = getComputedStyle(e);
    return s.animationName !== "none" || (s.transitionDuration !== "0s" && s.transitionProperty !== "none" && s.transitionDuration.split(",").some((d) => parseFloat(d) > 0));
  }).length);
  expect(moving).toBe(0);
  expect(await settleAnim(page)).toBe("none");
});

test("a device asking for reduced motion starts on Calm and is told why", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  await signIn(page);
  await fakeApi(page);
  await page.goto("/app/account");
  const g = group(page).last();
  await expect(g.getByRole("radio", { name: en.settings.motion.calm })).toBeChecked();
  await expect(g).toContainText(en.settings.motion.system);
});

test("home: under Calm the scroll scene and the 3D pour stay still", async ({ page }) => {
  await page.addInitScript(() => {
    for (const n of ["motion", "compounding", "hero3d"]) localStorage.setItem(`kyphira.flag.${n}`, "1");
    localStorage.setItem("kyphira.motion", "calm");
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  });
  await page.goto("/");
  await page.locator('[data-stage="reading"] h1').waitFor();
  await page.waitForTimeout(1500);
  await expect(page.locator("[data-hero3d]")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", "");
  const live = page.locator("[data-compounding] .cmp-live");
  if (await live.count()) expect(await live.first().evaluate((e) => getComputedStyle(e).display)).toBe("none");
});

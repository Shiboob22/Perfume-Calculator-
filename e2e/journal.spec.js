import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import { FEATURES } from "../src/lib/entitlements.js";

// The signed-in Batches tab — Resting Journal and recipe sharing — against
// the production build with a fake session and a fake API: every /api and
// Supabase request is answered here (nothing reaches a real project), and
// what the app sends is checked. The real API and database are covered by
// the unit tests, the RLS test on staging and signed-in.spec.js.

const DAY = 86400000;
const USER = { id: "00000000-0000-4000-8000-000000000001", email: "e2e@example.test", aud: "authenticated", role: "authenticated" };
const WOODY = "11111111-1111-4111-8111-111111111111";

// A local date, as the app compares blend dates (not the UTC date).
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function fixtures(now) {
  const started = new Date(now - 22 * DAY - 3600000);
  return [{
    id: WOODY, user_id: USER.id, fragrance_name: "Oud Nights", tier: "woody", concentration_pct: 25,
    blend_date: localDate(started), created_at: started.toISOString(),
    oil_g: 23.75, oil_ml: 25, ethanol_g: 60.75, ethanol_ml: 75, total_g: 84.5, total_ml: 100,
    notes: "Supplier X — private", oil_cost: 12.5, basis: "volume",
    batch_checkins: [{ id: "c-1", day: 1, scheduled_day: 1, note: "Alcohol still sharp", rating: 2, skipped: false, created_at: started.toISOString() }],
    shared_recipes: null,
  }];
}

// A signed-in session for whatever Supabase project the build points at:
// the auth client reads it from localStorage under sb-<ref>-auth-token.
async function signIn(page) {
  await page.addInitScript((user) => {
    const session = JSON.stringify({
      access_token: "e2e-access-token", token_type: "bearer", expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "e2e-refresh-token", user,
    });
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      return /^sb-.+-auth-token$/.test(key) ? session : getItem.call(this, key);
    };
  }, USER);
}

// offline: true makes check-in sends fail the way a dropped connection does
// (Playwright's request stubs keep answering while the context is offline).
async function fakeApi(page, { plan = "pro", offline = false } = {}) {
  const sent = { checkins: [], shares: [] };
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  const batches = fixtures(Date.now());

  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") {
      return json(route, plan === "pro"
        ? { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, batchesUsed: 1 }
        : { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, batchesUsed: 1 });
    }
    if (url.pathname === "/api/batches" && req.method() === "GET") return json(route, { batches });
    if (url.pathname === "/api/batches" && req.method() === "PATCH") {
      const body = req.postDataJSON();
      sent.shares.push(body);
      return json(route, { share: body.share === false
        ? { slug: "oud-nights-k3x9qa", published: false, public_note: null, rest_days: 24, indexable: false }
        : { slug: "oud-nights-k3x9qa", published: true, public_note: body.share.public_note, rest_days: body.share.rest_days, indexable: (body.share.public_note || "").length >= 40 } });
    }
    if (url.pathname === "/api/checkins" && req.method() === "POST") {
      if (offline) return route.abort("internetdisconnected");
      const body = req.postDataJSON();
      sent.checkins.push(body);
      return json(route, { checkin: { ...body, created_at: new Date().toISOString() } }, 201);
    }
    if (url.pathname === "/api/checkins" && req.method() === "GET") {
      return json(route, plan === "pro" ? { patterns: { woody: { day: 26, min: 21, max: 28, batches: 3 } }, locked: false } : { ready: ["woody"], locked: true });
    }
    return json(route, {});
  });
  return sent;
}

test("journal: a due check-in is saved from the Batches tab", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page);
  await page.goto("/app/batches");

  const tab = page.getByRole("button", { name: new RegExp(en.app.tabs.batches) });
  await expect(tab).toContainText("1 check-in due");
  const due = page.getByRole("region", { name: "1 batch is due for a check-in" });
  await expect(due).toBeVisible();
  await expect(due).toContainText("Woody, day 22 of rest");

  await due.getByLabel(/How does .*Oud Nights.* smell today\?/).fill("Softer, the oud is coming forward");
  await due.getByRole("radio", { name: "4 of 5" }).check({ force: true });
  await due.getByRole("button", { name: en.journal.save }).click();

  await expect(page.getByRole("status").filter({ hasText: en.journal.saved })).toBeAttached();
  await expect(due).toBeHidden();
  await expect(tab).not.toContainText("check-in due");
  expect(sent.checkins).toHaveLength(1);
  expect(sent.checkins[0]).toMatchObject({ batch_id: WOODY, day: 22, scheduled_day: 21, rating: 4, note: "Softer, the oud is coming forward" });
  await expect(page.getByText("Softer, the oud is coming forward")).toBeVisible();
});

test("journal: Pro sees the pattern, worded as the user's own history", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/app/batches");
  const patterns = page.getByRole("region", { name: en.journal.pattern.title });
  await expect(patterns).toContainText("In your own log, your Woody batches rated highest around day 26 (3 batches, days 21–28).");
  await expect(patterns).toContainText(en.journal.pattern.source);
});

test("journal: Free sees that a pattern is ready, not the day", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { plan: "free" });
  await page.goto("/app/batches");
  const patterns = page.getByRole("region", { name: en.journal.pattern.title });
  await expect(patterns).toContainText("Your Woody pattern is ready.");
  await expect(patterns).not.toContainText("day 26");
  await expect(patterns.getByRole("link", { name: en.journal.pattern.waitlist })).toHaveAttribute("href", "/app/account");
});

test("journal: a check-in made offline waits on the device", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page, { offline: true });
  await page.goto("/app/batches");
  const due = page.getByRole("region", { name: "1 batch is due for a check-in" });
  await due.getByLabel(/How does/).fill("Offline note");
  await due.getByRole("button", { name: en.journal.save }).click();
  await expect(page.getByRole("status").filter({ hasText: en.journal.queued })).toBeAttached();
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem("sh-outbox") || "[]"));
  expect(queued).toHaveLength(1);
  expect(queued[0].checkin).toMatchObject({ batch_id: WOODY, scheduled_day: 21, note: "Offline note" });
  expect(sent.checkins).toHaveLength(0);
});

test("sharing: publish with a public note, then stop sharing", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page);
  await page.goto("/app/batches");

  await page.getByRole("button", { name: en.share.open }).click();
  const panel = page.getByRole("region", { name: en.share.title });
  await expect(panel).toContainText(en.share.never);
  // The public note starts from the private one, so the owner sees it first.
  const note = panel.getByLabel(en.share.noteLabel);
  await expect(note).toHaveValue("Supplier X — private");
  await note.fill("Sharp for two weeks, then the oud rounds out beautifully.");
  await expect(panel).toContainText(en.share.preview);
  await expect(panel.getByLabel(en.share.restLabel)).toHaveValue("1");
  await panel.getByLabel(en.share.restLabel).fill("24");

  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);

  await panel.getByRole("button", { name: en.share.publish }).click();
  await expect(page.getByRole("status").filter({ hasText: en.share.published })).toBeAttached();
  expect(sent.shares[0]).toEqual({ id: WOODY, share: { public_note: "Sharp for two weeks, then the oud rounds out beautifully.", rest_days: 24 } });
  await expect(panel.getByRole("link", { name: /\/r\/oud-nights-k3x9qa$/ })).toBeVisible();
  await expect(panel).toContainText(en.share.indexed);

  await panel.getByRole("button", { name: en.share.stop }).click();
  await expect(page.getByRole("status").filter({ hasText: en.share.stopped })).toBeAttached();
  expect(sent.shares[1]).toEqual({ id: WOODY, share: false });
  await expect(panel.getByRole("button", { name: en.share.publish })).toBeVisible();
});

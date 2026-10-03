// Full-page screenshots of every screen, on a phone and a desktop, for
// before/after comparisons in a PR. Runs against a served production build
// (`node scripts/serve-dist.mjs`) with a fake signed-in session and a fake
// API, as e2e/journal.spec.js does: nothing reaches a real project.
//   node scripts/screenshots.mjs <out-dir> [base-url]
// Build with any VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (CI's placeholders
// are fine). Uses installed Chrome locally, Playwright's Chromium in CI.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [, , out, base = "http://localhost:4173"] = process.argv;
if (!out) throw new Error("usage: node scripts/screenshots.mjs <out-dir> [base-url]");
mkdirSync(out, { recursive: true });

const DAY = 86400000;
const USER = { id: "00000000-0000-4000-8000-000000000001", email: "preview@example.test", aud: "authenticated", role: "authenticated" };
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function batches(now) {
  const make = (id, name, tier, pct, daysAgo, extra = {}) => {
    const started = new Date(now - daysAgo * DAY - 3600000);
    return {
      id, user_id: USER.id, fragrance_name: name, tier, concentration_pct: pct, basis: "volume",
      blend_date: localDate(started), created_at: started.toISOString(),
      oil_g: 23.75, oil_ml: 25, ethanol_g: 60.75, ethanol_ml: 75, total_g: 84.5, total_ml: 100,
      batch_checkins: [], shared_recipes: null, ...extra,
    };
  };
  return [
    make("11111111-1111-4111-8111-111111111111", "Oud Nights", "woody", 25, 22, {
      oil_cost: 12.5, price_per_gram: 0.53, oil_type: "Supplier A", blended_by: "Sam",
      batch_checkins: [{ id: "c-1", day: 1, scheduled_day: 1, note: "Alcohol still sharp", rating: 2, skipped: false, created_at: new Date(now - 21 * DAY).toISOString() }],
    }),
    make("22222222-2222-4222-8222-222222222222", "Amber Room", "oriental", 30, 40, {
      batch_checkins: [
        { id: "c-2", day: 1, scheduled_day: 1, note: null, rating: 3, skipped: false, created_at: new Date(now - 39 * DAY).toISOString() },
        { id: "c-3", day: 28, scheduled_day: 28, note: "Round and warm, the spice has settled", rating: 5, skipped: false, created_at: new Date(now - 12 * DAY).toISOString() },
      ],
      shared_recipes: { slug: "amber-room-k3x9qa", published: true, public_note: null, rest_days: 28, indexable: false },
    }),
  ];
}

const PROFILE = { locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" };

async function signedIn(page, { onboarded = true } = {}) {
  await page.addInitScript(({ user, plan }) => {
    const session = JSON.stringify({
      access_token: "preview-token", token_type: "bearer", expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "preview-refresh", user,
    });
    const getItem = globalThis.Storage.prototype.getItem;
    globalThis.Storage.prototype.getItem = function (key) {
      return /^sb-.+-auth-token$/.test(key) ? session : getItem.call(this, key);
    };
    globalThis.sessionStorage.setItem("sh-bench", JSON.stringify(plan));
  }, { user: USER, plan: { name: "Oud Nights", fragranceId: null, tier: "woody", amount: 100, unit: "ml", concPct: 25, densities: { oil: 0.95, ethanol: 0.81 } } });

  const json = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [onboarded ? PROFILE : { ...PROFILE, onboarded_at: null }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/me") return json(route, { plan: "pro", name: "Pro", features: ["batches.unlimited", "inventory", "ai.ask", "export.labels", "cards.download", "journal.insights"], batchCap: null, batchesUsed: 2 });
    if (pathname === "/api/batches") return json(route, { batches: batches(Date.now()) });
    if (pathname === "/api/inventory") return json(route, { items: [
      { fragrance_id: "f1", name: "Oud Nights", tier: "woody", stock_g: 96.25, low_threshold_g: 20 },
      { fragrance_id: "f2", name: "Amber Room", tier: "oriental", stock_g: 8.5, low_threshold_g: 10 },
    ] });
    if (pathname === "/api/checkins") return json(route, { patterns: { woody: { day: 26, min: 21, max: 28, batches: 3 } }, locked: false });
    return json(route, {});
  });
}

const PUBLIC = { home: "/", "home-ar": "/ar", guides: "/guides", "guides-ar": "/ar/guides", guide: "/guides/at-the-bench", pricing: "/pricing", signin: "/app" };
const APP = {
  calculator: "/app/calculator", batches: "/app/batches", inventory: "/app/inventory", ask: "/app/ask",
  search: "/app/search", account: "/app/account", labels: "/app/labels?batch=11111111-1111-4111-8111-111111111111", bench: "/app/bench",
};

const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
for (const [size, width, height] of [["phone", 390, 844], ["desktop", 1280, 900]]) {
  const shoot = async (name, path, setup) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: "block" });
    const page = await context.newPage();
    if (setup) await setup(page);
    await page.goto(base + path, { waitUntil: "networkidle" }).catch(() => {});
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}-${size}.png`, fullPage: true });
    await context.close();
  };
  for (const [name, path] of Object.entries(PUBLIC)) await shoot(name, path);
  for (const [name, path] of Object.entries(APP)) await shoot(name, path, (p) => signedIn(p));
  await shoot("onboarding", "/app/calculator", (p) => signedIn(p, { onboarded: false }));
  // The app's language is the saved preference, not the URL.
  const arabic = (p) => p.addInitScript(() => globalThis.localStorage.setItem("sh-locale", "ar"));
  await shoot("signin-ar", "/app", arabic);
  await shoot("batches-ar", "/app/batches", async (p) => { await arabic(p); await signedIn(p); });
}
await browser.close();
console.log(`screenshots: ${out}`);

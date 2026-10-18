/* global document, window, localStorage, Storage, innerWidth, innerHeight, innerWidth */
// Drives the four rooms through the real UI of a served production build, with
// REAL catalog rows (read from the public search API) behind a fake session.
// A staging sign-in is not possible without the service-role key, so the
// session and the user-owned tables (bottles, wear log, posts) are faked; every
// fragrance name, note, accord, rating and year on screen is a live catalog row.
//   ENGINE=chromium|firefox|webkit  OUT=dir  BASE=http://localhost:4173  THEME=light|dark
//   node scripts/rooms-real.mjs
import { chromium, firefox, webkit } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const ENGINE = process.env.ENGINE || "chromium";
const OUT = process.env.OUT || "docs/redesign/animation-pass/rooms";
const BASE = process.env.BASE || "http://localhost:4173";
const THEME = process.env.THEME || "light";
const SOURCE = process.env.CATALOG || "https://scent-handbook-app.vercel.app";
mkdirSync(OUT, { recursive: true });

// ── Real rows ────────────────────────────────────────────────────────────
const QUERIES = ["oud", "rose", "vanilla", "bergamot", "tobacco", "musk", "sandalwood", "iris", "amber", "fig"];
const seen = new Map();
for (const q of QUERIES) {
  const r = await fetch(`${SOURCE}/api/search?q=${encodeURIComponent(q)}`).then((x) => x.json()).catch(() => null);
  for (const f of r?.results ?? []) if (f.accords?.length >= 3 && f.top_notes?.length && f.brand && !seen.has(f.id)) seen.set(f.id, f);
}
const REAL = [...seen.values()].slice(0, 12);
if (REAL.length < 8) throw new Error(`only ${REAL.length} real rows came back from ${SOURCE}`);
writeFileSync(`${OUT}/catalog-sample.json`, JSON.stringify(REAL.map(({ id, name, brand, year, rating, tier, accords }) => ({ id, name, brand, year, rating, tier, accords })), null, 1));
const atlasRow = (f) => ({ ...f, olfactory_family: f.tier, status: "approved", country: null, perfumers: f.perfumers ?? [] });

const USER = { id: "00000000-0000-4000-8000-000000000001", email: "e2e@example.test", aud: "authenticated", role: "authenticated" };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

const bottles = REAL.slice(0, 6).map((f, i) => ({
  id: `77777777-7777-4777-8777-${String(i + 1).padStart(12, "0")}`, user_id: USER.id, status: "owned", kind: i % 3 === 2 ? "decant" : "bottle", name: f.name, brand: f.brand,
  clusters: [], projection: null, fill_pct: [95, 70, 40, 85, 15, 60][i], size_ml: [100, 50, 10, 75, 100, 30][i], price: [120, 95, 30, 140, 80, 60][i], currency: "USD", note: null,
  purchase_date: null, fragrance_id: f.id, family: ["fresh", "woody", "oriental", "floral", "fresh", "woody"][i], created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z",
}));
const wear = bottles.flatMap((b, i) => Array.from({ length: 6 - i }, (_, k) => ({ id: `w-${i}-${k}`, user_id: USER.id, bottle_id: b.id, worn_on: `2026-10-${String(10 - k).padStart(2, "0")}`, occasion: "casual", time_of_day: null, temp_c: 18, sprays: 4, note: null })));
const posts = REAL.slice(0, 5).map((f, i) => i % 2
  ? { id: `p${i}`, kind: "review", title: `${f.name}: ${["warm and quiet", "better than the notes suggest", "wears close", "a cold-weather one"][i % 4]}`, body: `Sampled for a week. The ${f.accords[0].toLowerCase()} opens first, then ${f.accords[1].toLowerCase()}.`, family: null, snapshot: null, fragrance_id: f.id, fragrance_name: f.name, rating: 3 + (i % 3), status: "published", created_at: `2026-10-${String(12 - i).padStart(2, "0")}T10:00:00Z`, handle: "ada_k", display_name: "Ada K.", likes: 4 + i, liked: false, mine: false }
  : { id: `p${i}`, kind: "recipe", title: `${f.accords[0]} study after ${f.name}`, body: "My weekend blend, rested three weeks.", family: f.tier, snapshot: { amount: 50 + 25 * i, unit: "ml", concentration_pct: 20 + (i % 3) * 5, oil_density: 0.95 }, fragrance_id: null, fragrance_name: null, rating: null, status: "published", created_at: `2026-10-${String(12 - i).padStart(2, "0")}T10:00:00Z`, handle: "omar", display_name: "Omar", likes: 9 + i, liked: i === 2, mine: false });
const picks = REAL.slice(2, 6).map((f) => ({ id: f.id, name: f.name, brand: f.brand, year: f.year, family: f.tier, accords: f.accords.slice(0, 5), matched: f.accords.slice(0, 2), reason: `${f.accords[0]} first, then ${f.accords[1].toLowerCase()}.` }));
const shelf = bottles.slice(0, 3).map((b, i) => ({ id: b.id, name: b.name, matched: REAL[i].accords.slice(0, 2) }));

async function fake(page, locale) {
  await page.addInitScript(([user, theme, loc]) => {
    const session = JSON.stringify({ access_token: "e2e", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "e2e", user });
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) { return /^sb-.+-auth-token$/.test(k) ? session : getItem.call(this, k); };
    try { localStorage.setItem("theme", theme); localStorage.setItem("sh-locale", loc); ["wardrobe", "atlas", "salon", "nose", "motion"].forEach((n) => localStorage.setItem(`kyphira.flag.${n}`, "1")); } catch { /* blocked */ }
  }, [USER, THEME, locale]);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const one = (req.headers().accept || "").includes("pgrst.object");
    const rows = (arr) => json(route, one ? arr[0] ?? null : arr);
    const p = url.pathname;
    if (p.includes("/auth/v1/user")) return json(route, USER);
    if (p.endsWith("/rest/v1/profiles")) return rows([{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    if (p.endsWith("/rest/v1/wardrobe_bottles")) return json(route, bottles);
    if (p.endsWith("/rest/v1/wear_log")) return json(route, wear);
    if (p.endsWith("/rpc/is_admin")) return json(route, false);
    if (p.endsWith("/rest/v1/salon_profiles")) return rows([]);
    if (p.endsWith("/rpc/salon_feed")) return json(route, posts);
    if (p.endsWith("/rpc/atlas_search")) return json(route, REAL.map((f) => ({ ...atlasRow(f), total: REAL.length })));
    if (p.endsWith("/rpc/similar_fragrances")) return json(route, { basis: "accords", similar: REAL.slice(3, 6).map(atlasRow), same_brand: [] });
    if (p.endsWith("/rpc/atlas_wear_stats")) return json(route, { shown: false });
    if (p.endsWith("/rest/v1/fragrances")) { const id = url.searchParams.get("id")?.replace("eq.", ""); return rows(REAL.map(atlasRow).filter((f) => !id || f.id === id)); }
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, { plan: "free", name: "Free", features: ["calculator.basic"], batchCap: 25, batchesUsed: 0 });
    if (p === "/api/ai") return json(route, { kind: "picks", intro: "", picks, shelf });
    return json(route, {});
  });
}

// What is animating, and how far along. Scroll timelines report a percentage in currentTime.
const probe = (page, cls) => page.evaluate((c) => document.getAnimations().filter((a) => a.effect?.target?.classList?.contains(c)).map((a) => ({ timeline: a.timeline?.constructor?.name ?? "none", progress: a.timeline?.constructor?.name === "ViewTimeline" ? Math.round(Number(a.currentTime?.value ?? a.currentTime ?? 0)) : null, name: a.animationName })), cls);

// Rendered width of the LAST matching element with its top at three heights in the viewport: grows as it scrolls in, and shrinks again on the way back.
const scrub = async (page, sel) => {
  const out = [];
  for (const f of [1.0, 0.75, 0.5, 0.25, 0.75, 1.0]) {
    await page.evaluate(([s, fr]) => { const els = document.querySelectorAll(s); const el = els[els.length - 1]; const r = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - innerHeight * fr); }, [sel, f]);
    await page.waitForTimeout(120);
    out.push(await page.evaluate((s) => { const els = document.querySelectorAll(s); return Math.round(els[els.length - 1].getBoundingClientRect().width); }, sel));
  }
  return out;
};
const launcher = { chromium, firefox, webkit }[ENGINE];
const browser = await launcher.launch(ENGINE === "chromium" ? (process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" }) : {});
const report = [];
const errors = [];
for (const lang of ["en", "ar"]) {
  for (const w of [1440, 375]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 812 : 900 }, reducedMotion: "no-preference", colorScheme: THEME, serviceWorkers: "block" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => { errors.push(`${lang}@${w}: ${e.message}`); console.error("pageerror", e.message); });
    page.on("console", (m) => m.type() === "error" && !/401|403|Failed to load resource/.test(m.text()) && (errors.push(`${lang}@${w}: ${m.text()}`), console.error("console", m.text().slice(0, 400))));
    await fake(page, lang);
    const tag = `${ENGINE}${THEME === "dark" ? "-dark" : ""}-${lang}-${w}`;
    const row = { tag };
    const shot = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${tag}-${name}.png` }); };
    const scrollTo = async (sel, frac) => page.evaluate(([s, f]) => { const el = document.querySelector(s); if (!el) return; const r = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - innerHeight * f); }, [sel, frac]);

    // Wardrobe: the collection, gauges fill as cards enter.
    await page.goto(`${BASE}/wardrobe?section=collection`, { waitUntil: "load" });
    await page.waitForSelector(".mo-gauge", { state: "attached", timeout: 15000 });
    await scrollTo(".mo-gauge", 0.95); await page.waitForTimeout(300);
    row.wardrobeEarly = await probe(page, "mo-gauge");
    await shot("wardrobe-a");
    await scrollTo(".mo-gauge", 0.35); await page.waitForTimeout(300);
    row.wardrobeLate = await probe(page, "mo-gauge");
    row.wardrobeCards = await page.locator(".mo-gauge").count();
    row.gaugeScrub = await scrub(page, ".mo-gauge");
    await shot("wardrobe-b");

    // Salon: the feed, page rules inked in.
    await page.goto(`${BASE}/salon`, { waitUntil: "load" });
    await page.waitForSelector(".mo-ink", { state: "attached", timeout: 15000 }).catch(async (e) => { await page.screenshot({ path: `${OUT}/_fail-salon.png` }); console.error(await page.locator("body").innerText()); throw e; });
    await scrollTo(".mo-ink", 0.9); await page.waitForTimeout(300);
    row.salonEarly = await probe(page, "mo-ink");
    await shot("salon-a");
    await scrollTo(".mo-ink", 0.4); await shot("salon-b");
    row.inkScrub = await scrub(page, ".mo-ink");

    // Nose: ask, picks land, matched accords light up.
    await page.goto(`${BASE}/nose`, { waitUntil: "load" });
    await page.locator("#nose-q").fill("warm and woody for the evening");
    await page.locator("#nose-q").press("Enter");
    await page.waitForSelector(".mo-ember", { state: "attached", timeout: 15000 });
    row.noseEmbers = await page.locator(".mo-ember").count();
    row.noseEmberAnim = await page.evaluate(() => document.getAnimations().filter((a) => a.animationName === "mo-ember").length);
    await page.waitForTimeout(1600);
    await shot("nose");

    // Atlas: a real fragrance page, the pyramid's light grows band by band.
    await page.goto(`${BASE}/atlas/fragrance/${REAL[0].id}`, { waitUntil: "load" });
    await page.waitForSelector(".mo-band", { state: "attached", timeout: 15000 });
    await scrollTo(".mo-band", 0.92); await page.waitForTimeout(300);
    row.atlasEarly = await probe(page, "mo-band");
    await shot("atlas-a");
    await scrollTo(".mo-band", 0.35); await page.waitForTimeout(300);
    row.atlasLate = await probe(page, "mo-band");
    await shot("atlas-b");
    row.bandScrub = await scrub(page, ".mo-band");
    row.overflowX = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    report.push(row);
    await ctx.close();
  }
}
await browser.close();
writeFileSync(`${OUT}/${ENGINE}${THEME === "dark" ? "-dark" : ""}-report.json`, JSON.stringify({ engine: ENGINE, theme: THEME, realRows: REAL.map((f) => f.name), report, errors: [...new Set(errors)] }, null, 1));
console.log(JSON.stringify({ report, errors: [...new Set(errors)] }, null, 1));

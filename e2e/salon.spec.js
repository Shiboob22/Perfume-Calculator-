import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

test.use({ serviceWorkers: "block" });

// The Salon (Phase 6), against the production build with a fake session and a
// fake API. Flagged: off, /salon returns to the Bench; on, the loop works:
// reading the feed, liking and reporting, making a profile (private by
// default), posting a recipe that carries only the blend, following, and the
// editors' report queue.

const P1 = "99999999-9999-4999-8999-000000000001";
const P2 = "99999999-9999-4999-8999-000000000002";
const OTHER = "99999999-9999-4999-8999-0000000000aa";
const FRAG = "88888888-8888-4888-8888-000000000001";
const POSTS = [
  { id: P1, kind: "recipe", title: "Oud Nights", body: "My weekend blend.", family: "woody", snapshot: { amount: 100, unit: "ml", concentration_pct: 25, oil_density: 0.95 }, fragrance_id: null, fragrance_name: null, rating: null, status: "published", created_at: "2026-10-12T10:00:00Z", handle: "ada_p", display_name: "Ada", likes: 2, liked: false, mine: false },
  { id: P2, kind: "review", title: "Fresh and clean", body: "Lasts all day.", family: null, snapshot: null, fragrance_id: FRAG, fragrance_name: "Citrus Dawn", rating: 4, status: "published", created_at: "2026-10-11T10:00:00Z", handle: "ada_p", display_name: "Ada", likes: 0, liked: true, mine: false },
];
const VERSION = { id: "v1", version: 1, amount: 50, unit: "ml", concentration_pct: 20, oil_density: null, ethanol_density: null, note: "PRIVATE NOTE", created_at: "2026-10-01T00:00:00Z" };
const RECIPE = { id: "r1", name: "Citrus Morning", family: "fresh", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", recipe_versions: [VERSION] };

async function fakeApi(page, { locale = "en", admin = false, mine = null, queue = [], info = null, postError = null } = {}) {
  const seen = { feed: [], profileWrites: [], posts: [], likes: [], unlikes: [], follows: [], reports: [], moderate: [], unsuspend: [], removed: [] };
  let profile = mine ? { ...mine } : null;
  const pending = queue.map((q) => ({ ...q }));
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const one = (req.headers().accept || "").includes("pgrst.object");
    const rows = (arr) => json(route, one ? arr[0] ?? null : arr);
    const path = url.pathname;
    const method = req.method();
    if (path.includes("/auth/v1/user")) return json(route, USER);
    if (path.endsWith("/rest/v1/profiles")) return rows([{ locale, default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z" }]);
    if (path.endsWith("/rpc/is_admin")) return json(route, admin);
    if (path.endsWith("/rest/v1/salon_profiles")) {
      if (method === "GET") return rows(profile ? [profile] : []);
      if (method === "DELETE") { profile = null; seen.removed.push("profile"); return json(route, [], 204); }
      const body = req.postDataJSON();
      seen.profileWrites.push({ method, body });
      profile = { user_id: USER.id, created_at: "2026-10-14T00:00:00Z", suspended: false, ...(profile ?? {}), ...body };
      return json(route, method === "POST" ? [profile] : [], method === "POST" ? 201 : 204);
    }
    if (path.endsWith("/rest/v1/salon_posts")) {
      if (method === "DELETE") { seen.removed.push("posts"); return json(route, [], 204); }
      seen.posts.push(req.postDataJSON());
      return postError ? json(route, { code: postError, message: "x" }, 409) : json(route, { id: "new" }, 201);
    }
    if (path.endsWith("/rest/v1/salon_likes")) {
      if (method === "POST") seen.likes.push(req.postDataJSON()); else seen.unlikes.push(url.search);
      return json(route, [], method === "POST" ? 201 : 204);
    }
    if (path.endsWith("/rest/v1/salon_follows")) {
      if (method === "POST") seen.follows.push(req.postDataJSON());
      return json(route, [], method === "POST" ? 201 : 204);
    }
    if (path.endsWith("/rest/v1/salon_reports")) { seen.reports.push(req.postDataJSON()); return json(route, [], 201); }
    if (path.endsWith("/rest/v1/recipes")) return json(route, [RECIPE]);
    if (path.endsWith("/rpc/salon_feed")) {
      const args = req.postDataJSON();
      seen.feed.push(args);
      const list = POSTS.filter((p) => !args.p_kind || p.kind === args.p_kind);
      return json(route, args.p_following ? [] : list);
    }
    if (path.endsWith("/rpc/salon_profile")) return json(route, info);
    if (path.endsWith("/rpc/atlas_search")) return json(route, [{ id: FRAG, name: "Citrus Dawn", brand: "Maison Test", year: 2008, tier: "fresh", accords: [], total: 1 }]);
    if (path.endsWith("/rpc/salon_report_queue")) return json(route, pending);
    if (path.endsWith("/rpc/salon_moderate")) {
      const args = req.postDataJSON();
      seen.moderate.push(args);
      const i = pending.findIndex((p) => p.id === args.p_report);
      if (i >= 0) pending.splice(i, 1);
      return json(route, null, 204);
    }
    if (path.endsWith("/rpc/salon_unsuspend")) { seen.unsuspend.push(req.postDataJSON()); return json(route, null, 204); }
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, { plan: "free", name: "Free", features: FEATURES.slice(0, 1), batchCap: 25, batchesUsed: 0 });
    return json(route, {});
  });
  return seen;
}
const flags = (page, ...names) => page.addInitScript((list) => list.forEach((n) => localStorage.setItem(`kyphira.flag.${n}`, "1")), names);
const PUBLIC = { user_id: USER.id, handle: "me_blends", display_name: "Me", bio: null, is_public: true };

test("with the flag off, /salon returns to the Bench and the nav has no Salon link", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/salon");
  await expect(page).toHaveURL(/\/bench$/);
  await expect(page.getByRole("link", { name: en.site.nav.salon })).toHaveCount(0);
});

test("the feed shows posts with the safety copy, filters by kind, and says when nothing is followed", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  const seen = await fakeApi(page, { mine: PUBLIC });
  await page.goto("/salon");
  await expect(page.getByRole("heading", { level: 1, name: en.salon.title })).toBeVisible();
  await expect(page.getByText(en.salon.safety)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Oud Nights" })).toBeVisible();
  await expect(page.getByText("100 mL · 25%")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fresh and clean" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ada" }).first()).toHaveAttribute("href", "/salon/u/ada_p");
  await expect(page.getByRole("link", { name: en.salon.post.openBench })).toHaveAttribute("href", /\/bench\?size=100&unit=ml&conc=25&family=woody&name=Oud\+Nights/);

  await page.getByRole("button", { name: en.salon.feed.recipe }).click();
  await expect(page.getByRole("heading", { name: "Fresh and clean" })).toHaveCount(0);
  expect(seen.feed.at(-1)).toMatchObject({ p_kind: "recipe", p_following: false });
  await page.getByRole("button", { name: en.salon.feed.following }).click();
  await expect(page.getByText(en.salon.feed.emptyFollowing)).toBeVisible();
  expect(seen.feed.at(-1)).toMatchObject({ p_following: true });
});

test("a private profile can read but is told how to post", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  await fakeApi(page, { mine: { ...PUBLIC, is_public: false } });
  await page.goto("/salon");
  await expect(page.getByText(en.salon.feed.privateNotice)).toBeVisible();
  await page.goto("/salon/new");
  await expect(page.getByText(en.salon.compose.needProfile)).toBeVisible();
  await expect(page.getByRole("button", { name: en.salon.compose.publish })).toHaveCount(0);
});

test("like toggles with a count, and a report sends the reason", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  const seen = await fakeApi(page, { mine: PUBLIC });
  await page.goto("/salon");
  const card = page.getByRole("article", { name: "Oud Nights" });
  await card.getByRole("button", { name: new RegExp(`^${en.salon.post.like}`) }).click();
  await expect(card.getByRole("button", { name: new RegExp(`^${en.salon.post.unlike}`) })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("button", { name: /3$/ })).toBeVisible();
  expect(seen.likes.at(-1)).toMatchObject({ post_id: P1 });
  await card.getByRole("button", { name: new RegExp(`^${en.salon.post.unlike}`) }).click();
  await expect.poll(() => seen.unlikes.length).toBe(1);

  await card.getByRole("button", { name: en.salon.post.report }).click();
  await card.getByLabel(en.salon.post.reportTitle).selectOption("unsafe");
  await card.getByLabel(en.salon.post.reportNote).fill("not safe");
  await card.getByRole("button", { name: en.salon.post.reportSend }).click();
  await expect(card.getByText(en.salon.post.reported)).toBeVisible();
  expect(seen.reports.at(-1)).toMatchObject({ post_id: P1, reason: "unsafe", note: "not safe" });
});

test("making a profile: private by default, links refused, public when asked", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  const seen = await fakeApi(page);
  await page.goto("/salon/me");
  await expect(page.getByRole("heading", { name: en.salon.me.title })).toBeVisible();
  await expect(page.getByLabel(en.salon.me.public)).not.toBeChecked();
  await page.getByLabel(en.salon.me.handle).fill("@Me_Blends");
  await page.getByLabel(en.salon.me.bio).fill("see www.example.com");
  await page.getByRole("button", { name: en.salon.me.save }).click();
  await expect(page.getByRole("alert").filter({ hasText: en.salon.me.fields.bio })).toBeVisible();
  expect(seen.profileWrites).toHaveLength(0);

  await page.getByLabel(en.salon.me.bio).fill("I dilute oud.");
  await page.getByRole("button", { name: en.salon.me.save }).click();
  await expect(page.getByText(en.salon.me.saved)).toBeVisible();
  expect(seen.profileWrites.at(-1)).toMatchObject({ method: "POST", body: { handle: "me_blends", bio: "I dilute oud.", is_public: false } });

  await page.getByLabel(en.salon.me.public).check();
  await page.getByRole("button", { name: en.salon.me.save }).click();
  await expect.poll(() => seen.profileWrites.length).toBe(2);
  expect(seen.profileWrites.at(-1)).toMatchObject({ method: "PATCH", body: { is_public: true } });
  await expect(page.getByRole("link", { name: en.salon.me.view })).toBeVisible();

  await page.getByRole("button", { name: en.salon.me.remove }).click();
  await page.getByRole("button", { name: en.salon.me.removeYes }).click();
  await expect(page.getByText(en.salon.me.removed)).toBeVisible();
  expect(seen.removed).toEqual(["posts", "profile"]);
});

test("a recipe post carries only the blend, never the private note", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  const seen = await fakeApi(page, { mine: PUBLIC });
  await page.goto("/salon/new");
  await page.getByLabel(en.salon.compose.pickRecipe).selectOption("r1");
  await expect(page.getByLabel(en.salon.compose.titleLabel)).toHaveValue("Citrus Morning");
  await expect(page.getByText("50 mL · 20%")).toBeVisible();
  await page.getByLabel(en.salon.compose.bodyLabel).fill("Bright and quick.");
  await page.getByRole("button", { name: en.salon.compose.publish }).click();
  await expect(page).toHaveURL(/\/salon$/);
  expect(seen.posts).toHaveLength(1);
  expect(seen.posts[0]).toMatchObject({ kind: "recipe", title: "Citrus Morning", body: "Bright and quick.", family: "fresh", snapshot: { amount: 50, unit: "ml", concentration_pct: 20 } });
  expect(JSON.stringify(seen.posts[0])).not.toContain("PRIVATE NOTE");
  expect(Object.keys(seen.posts[0].snapshot).sort()).toEqual(["amount", "concentration_pct", "unit"]);
});

test("a review needs a fragrance and a link-free text; the daily limit is explained", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  const seen = await fakeApi(page, { mine: PUBLIC, postError: "54000" });
  await page.goto("/salon/new");
  await page.getByLabel(en.salon.post.review).check();
  await page.getByLabel(en.salon.compose.titleLabel).fill("Great");
  await page.getByRole("button", { name: en.salon.compose.publish }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Check:" })).toContainText(en.salon.compose.fields.fragrance);
  expect(seen.posts).toHaveLength(0);

  await page.getByLabel(en.salon.compose.fragrance).fill("citrus");
  await page.getByRole("button", { name: en.salon.compose.find }).click();
  await page.getByRole("button", { name: /Citrus Dawn/ }).click();
  await expect(page.getByText(en.salon.compose.chosen.replace("{name}", "Citrus Dawn"))).toBeVisible();
  await page.getByLabel(en.salon.compose.bodyLabel).fill("buy at shop.com");
  await page.getByRole("button", { name: en.salon.compose.publish }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Check:" })).toContainText(en.salon.compose.fields.body.split(" (")[0]);
  await page.getByLabel(en.salon.compose.bodyLabel).fill("Lasts all day.");
  await page.getByRole("button", { name: en.salon.compose.publish }).click();
  await expect(page.getByRole("alert").filter({ hasText: en.salon.compose.tooMany })).toHaveText(en.salon.compose.tooMany);
  expect(seen.posts.at(-1)).toMatchObject({ kind: "review", fragrance_id: FRAG, rating: 5 });
});

test("a profile page follows and reports, and a missing profile says so", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  const info = { handle: "ada_p", display_name: "Ada", bio: "Blender.", mine: false, is_public: true, suspended: false, posts: 2, followers: 3, following: 1, i_follow: false, user_id: OTHER };
  const seen = await fakeApi(page, { mine: PUBLIC, info });
  await page.goto("/salon/u/ada_p");
  await expect(page.getByRole("heading", { level: 2, name: "Ada" })).toBeVisible();
  await expect(page.getByText("Blender.")).toBeVisible();
  await page.getByRole("button", { name: en.salon.profile.follow, exact: true }).click();
  await expect(page.getByRole("button", { name: en.salon.profile.unfollow })).toHaveAttribute("aria-pressed", "true");
  expect(seen.follows.at(-1)).toMatchObject({ followee_id: OTHER });
  expect(seen.feed.at(-1)).toMatchObject({ p_handle: "ada_p" });
  await page.getByRole("button", { name: en.salon.profile.report }).click();
  await page.getByRole("button", { name: en.salon.post.reportSend }).click();
  await expect(page.getByText(en.salon.post.reported)).toBeVisible();
  expect(seen.reports.at(-1)).toMatchObject({ profile_user_id: OTHER, reason: "abuse" });
});

test("a profile that isn't public is not found", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  await fakeApi(page, { mine: PUBLIC, info: null });
  await page.goto("/salon/u/ghost");
  await expect(page.getByText(en.salon.profile.notFound)).toBeVisible();
});

test("editors see the report queue and act on it; others are told it is for editors", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  const queue = [{ id: "rep1", reason: "spam", note: "selling", created_at: "2026-10-13T00:00:00Z", post_id: P1, post_title: "Buy my oil", post_body: "cheap", post_status: "published", target_user_id: OTHER, target_handle: "spammer", reports: 3 }];
  const seen = await fakeApi(page, { admin: true, queue });
  await page.goto("/salon/moderation");
  await expect(page.getByRole("heading", { name: "Buy my oil" })).toBeVisible();
  await expect(page.getByText(en.salon.mod.reports.replace("{n}", "3"))).toBeVisible();
  await page.getByRole("button", { name: en.salon.mod.hide }).click();
  await expect(page.getByText(en.salon.mod.did.hide)).toBeVisible();
  expect(seen.moderate.at(-1)).toEqual({ p_report: "rep1", p_action: "hide" });
  await expect(page.getByText(en.salon.mod.empty)).toBeVisible();
  await page.getByLabel(en.salon.mod.unsuspendTitle).fill("@spammer");
  await page.getByRole("button", { name: en.salon.mod.unsuspend }).click();
  await expect(page.getByText(en.salon.mod.did.unsuspend)).toBeVisible();
  expect(seen.unsuspend.at(-1)).toEqual({ p_handle: "spammer" });

  const other = await page.context().newPage();
  await signIn(other);
  await flags(other, "salon");
  await fakeApi(other, { admin: false });
  await other.goto("/salon/moderation");
  await expect(other.getByText(en.salon.mod.notAdmin)).toBeVisible();
  await expect(other.getByRole("link", { name: en.salon.nav.moderation })).toHaveCount(0);
});

test("Arabic at 320 px: no sideways scroll, no axe violations on any page", async ({ page }) => {
  await flags(page, "salon");
  await signIn(page);
  const info = { handle: "ada_p", display_name: "Ada", bio: "Blender.", mine: false, is_public: true, suspended: false, posts: 2, followers: 3, following: 1, i_follow: false, user_id: OTHER };
  await fakeApi(page, { locale: "ar", admin: true, mine: PUBLIC, info,
    queue: [{ id: "rep1", reason: "abuse", note: null, created_at: "2026-10-13T00:00:00Z", post_id: P1, post_title: "Buy", post_body: "x", post_status: "published", target_user_id: OTHER, target_handle: "spammer", reports: 1 }] });
  await page.setViewportSize({ width: 320, height: 700 });
  for (const url of ["/salon", "/salon/new", "/salon/me", "/salon/u/ada_p", "/salon/moderation"]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1, name: ar.salon.title })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, url).toBe(false);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations, url).toEqual([]);
  }
});

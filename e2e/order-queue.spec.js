import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The order queue (Phase A), against the production build with a fake
// session and a fake API, behind the `orders` flag (set on this device).
// Phone and desktop widths run through the two projects.
test.use({ serviceWorkers: "block" });

const FREE = { plan: "free", name: "Free", features: ["cards.download"], batchCap: 25, formulaCap: null, ingredientCap: 3, journalWindow: 3, trial: null, batchesUsed: 0 };
const PRO = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 0 };
const OIL = "bbbbbbbb-bbbb-4bbb-8bbb-000000000001";
const o = en.orders;
const fill = (s, vars) => Object.entries(vars).reduce((x, [k, v]) => x.replaceAll(`{${k}}`, String(v)), s);

async function fakeApi(page, { plan = "pro", locale = "en", orders = [], flag = true, sells = true } = {}) {
  const sent = { posts: [], patches: [], logs: [] };
  if (flag) await page.addInitScript(() => localStorage.setItem("kyphira.flag.orders", "1"));
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale, default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", sells, currency: "EGP" }]);
    return json(route, []);
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/me") return json(route, plan === "pro" ? PRO : FREE);
    if (url.pathname === "/api/inventory") return json(route, { items: [{ fragrance_id: OIL, stock_g: 10, name: "Bergamot Oil", tier: "fresh", low_threshold_g: 5 }] });
    if (url.pathname === "/api/batches" && url.searchParams.get("resource") === "orders") {
      if (plan !== "pro") return json(route, { code: "feature_locked", feature: "orders" }, 403);
      if (req.method() === "GET") return json(route, { orders });
      const body = req.postDataJSON();
      if (req.method() === "POST") {
        sent.posts.push(body);
        const row = { ...body, id: body.id || `o-${orders.length}`, user_id: USER.id, status: "queued", group_mode: "mix", created_at: new Date().toISOString() };
        orders.unshift(row);
        return json(route, { order: row }, 201);
      }
      sent.patches.push(body);
      if (body.ids) {
        const changed = orders.filter((r) => body.ids.includes(r.id)).map((r) => Object.assign(r, { group_mode: body.group_mode }));
        return json(route, { orders: changed });
      }
      const r = orders.find((x) => x.id === body.id);
      Object.assign(r, body.status ? { status: body.status } : body.edit);
      const answer = { ...r }; // writes answer without the batch join, as the API does
      delete answer.batches;
      return json(route, { order: answer });
    }
    if (url.pathname === "/api/batches" && req.method() === "POST") {
      const body = req.postDataJSON();
      sent.logs.push(body);
      const batch = { ...body, user_id: USER.id, batch_no: 6, created_at: new Date().toISOString() };
      let linked = 0;
      for (const id of body.order_ids || []) {
        const o = orders.find((x) => x.id === id && ["queued", "planned"].includes(x.status));
        if (o) { Object.assign(o, { status: "resting", batch_id: batch.id, batches: { batch_no: 6, blend_date: body.blend_date } }); linked += 1; }
      }
      return json(route, { success: true, batch, ...(body.order_ids ? { orders_linked: linked } : {}) }, 201);
    }
    if (url.pathname === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
  return sent;
}

async function addOrder(page, { buyer, scent, size, strength }) {
  await page.getByRole("button", { name: o.add }).click();
  const sheet = page.getByRole("dialog", { name: o.form.title });
  await sheet.getByLabel(o.form.buyer).fill(buyer);
  await sheet.getByLabel(o.form.scent).fill(scent);
  await sheet.getByRole("button", { name: fill(o.form.ml, { ml: size }) }).click();
  await sheet.getByRole("button", { name: `EDP Intense ${strength}%` }).click();
  await sheet.getByRole("button", { name: o.form.save }).click();
  await expect(sheet).toBeHidden();
}

test("two orders of one scent become one mix with 5% extra, then separate bottles", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page);
  await page.goto("/bench/orders");
  await expect(page.getByText(o.empty)).toBeVisible();

  await addOrder(page, { buyer: "Sara", scent: "Oud Nights", size: 50, strength: 25 });
  await addOrder(page, { buyer: "Omar", scent: "oud nights ", size: 50, strength: 25 });
  expect(sent.posts.map((p) => [p.buyer_name, p.size_ml, p.strength_pct])).toEqual([["Sara", 50, 25], ["Omar", 50, 25]]);
  expect(sent.posts.every((p) => typeof p.id === "string")).toBe(true);

  const group = page.getByRole("article").filter({ hasText: fill(o.mix.group, { scent: "Oud Nights", pct: 25 }) });
  await expect(group).toContainText(fill(o.mix.volumeExtra, { mix: "105.00", ordered: "100.00", pct: 5 }));
  // The 100 mL @ 25 % Quick Reference row × 1.05 (handbook densities for a typed name).
  for (const g of ["24.94", "63.79", "88.73"]) await expect(group).toContainText(fill(o.grams, { g }));
  await expect(page.getByText(fill(o.headline.other, { count: 2 }))).toBeVisible();

  await group.getByRole("button", { name: o.mix.mode.separate }).click();
  await expect(group.getByText(fill(o.mix.volume, { mix: "50.00" }))).toHaveCount(2);
  expect(sent.patches.at(-1)).toMatchObject({ group_mode: "separate" });
  expect(sent.patches.at(-1).ids).toHaveLength(2);

  await group.getByRole("button", { name: fill(o.row.cancelFor, { name: "Omar" }) }).click();
  await expect(page.getByText(fill(o.cancelled.one, { count: 1 }))).toBeVisible();
  await expect(page.getByText(fill(o.headline.one, { count: 1 }))).toBeVisible();
});

test("oil from stock is checked against what the orders need", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, {
    orders: [
      { id: "a", user_id: USER.id, buyer_name: "Lina", scent_text: "Bergamot Oil", fragrance_id: OIL, family: "fresh", size_ml: 100, strength_pct: 25, status: "queued", group_mode: "mix" },
    ],
  });
  await page.goto("/bench/orders");
  const oil = page.getByRole("region", { name: o.oil.title }).or(page.locator("section", { has: page.getByRole("heading", { name: o.oil.title }) }));
  await expect(oil).toContainText("Bergamot Oil");
  await expect(oil).toContainText(/g short/);
});

test("Free sees the Pro lock", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { plan: "free" });
  await page.goto("/bench/orders");
  await expect(page.getByText(en.plan.locked.orders)).toBeVisible();
});

test("the queue is on without a device flag (on by default; VITE_FLAG_ORDERS=0 turns it off)", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { flag: false });
  await page.goto("/bench/orders");
  await expect(page).toHaveURL(/\/bench\/orders$/);
  await expect(page.getByRole("button", { name: o.add })).toBeVisible();
});

test("the Bench shows sellers a link to the queue", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, { orders: [{ id: "a", user_id: USER.id, buyer_name: "Lina", scent_text: "Rose", size_ml: 30, strength_pct: 20, status: "queued", group_mode: "mix" }] });
  await page.goto("/bench");
  const card = page.getByRole("link", { name: new RegExp(o.benchCard.title) });
  await expect(card).toContainText(fill(o.benchCard.line.one, { count: 1 }));
  await card.click();
  await expect(page).toHaveURL(/\/bench\/orders$/);
});

test("Arabic: the queue reads right to left, with no axe violations", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, {
    locale: "ar",
    orders: [{ id: "a", user_id: USER.id, buyer_name: "سارة", scent_text: "عود", size_ml: 50, strength_pct: 25, status: "queued", group_mode: "mix", wanted_by: "2026-12-01", price: 450, currency: "EGP" }],
  });
  await page.goto("/ar/bench/orders");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByText(ar.orders.mix.title, { exact: true })).toBeVisible();
  await expect(page.getByText(ar.orders.oil.title, { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("English: the add-order sheet has no axe violations", async ({ page }) => {
  await signIn(page);
  await fakeApi(page);
  await page.goto("/bench/orders");
  await page.getByRole("button", { name: o.add }).click();
  await expect(page.getByRole("dialog", { name: o.form.title })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("weigh a mix from the plan, log it, then bottle and hand over", async ({ page }) => {
  await signIn(page);
  const A = "aaaaaaaa-0000-4000-8000-00000000000a";
  const B = "aaaaaaaa-0000-4000-8000-00000000000b";
  const sent = await fakeApi(page, {
    orders: [
      { id: A, user_id: USER.id, buyer_name: "Sara", scent_text: "Oud Nights", size_ml: 50, strength_pct: 25, status: "queued", group_mode: "mix" },
      { id: B, user_id: USER.id, buyer_name: "Omar", scent_text: "Oud Nights", size_ml: 50, strength_pct: 25, status: "queued", group_mode: "mix" },
    ],
  });
  await page.goto("/bench/orders");
  await page.getByRole("link", { name: fill(o.weigh.labelFor, { mix: "105.00", scent: "Oud Nights" }) }).click();
  await expect(page).toHaveURL(/\/bench\?/);
  const q = new URL(page.url()).searchParams;
  expect([q.get("size"), q.get("conc"), q.get("orders")]).toEqual(["105", "25", `${A},${B}`]);
  await expect(page.getByText(fill(o.weigh.for.other, { count: 2 }))).toBeVisible();

  // Pour along, as on any bench run.
  await page.getByRole("button", { name: en.bench.start }).click();
  await page.getByRole("checkbox").check();
  const next = page.getByRole("button", { name: en.bench.next, exact: true });
  await next.click(); await next.click();
  const target = (label) => page.getByText(label, { exact: true }).locator("xpath=following-sibling::p[1]");
  const num = async (loc) => Number((await loc.textContent()).replace(/[^\d.]/g, ""));
  await page.getByLabel(en.bench.oil.actual).fill(String(await num(target(en.bench.oil.target))));
  await next.click();
  await page.getByLabel(en.bench.alcohol.actual).fill(String(await num(target(en.bench.alcohol.target))));
  await next.click(); await next.click(); await next.click();
  await page.getByRole("button", { name: en.bench.label.log }).click();
  await expect(page.getByText(fill(o.weigh.linked.other, { count: 2 }))).toBeVisible();
  expect(sent.logs[0].order_ids).toEqual([A, B]);
  expect(sent.logs[0].total_ml).toBeCloseTo(105, 2);

  await page.getByRole("button", { name: o.weigh.back }).click();
  await expect(page).toHaveURL(/\/bench\/orders$/);
  const card = page.getByRole("article").filter({ hasText: fill(o.bottle.batchNo, { no: "006", scent: "Oud Nights", pct: 25 }) });
  await expect(card).toContainText(o.bottle.resting.split("{ready}")[0]);
  await expect(card).toContainText(fill(o.bottle.fill, { ml: 50, name: "Sara" }));

  // Still resting: bottling asks once.
  await card.getByRole("button", { name: fill(o.bottle.markFor, { name: "Sara" }) }).click();
  await expect(card.getByRole("alert")).toContainText(o.bottle.early.split("{ready}")[0]);
  await card.getByRole("button", { name: o.bottle.anyway }).click();
  await expect(card.getByRole("button", { name: fill(o.bottle.handFor, { name: "Sara" }) })).toBeVisible();
  // Undo once, bottle again, then hand over.
  await card.getByRole("button", { name: fill(o.bottle.undoFor, { name: "Sara" }) }).click();
  await card.getByRole("button", { name: fill(o.bottle.markFor, { name: "Sara" }) }).click();
  await card.getByRole("button", { name: o.bottle.anyway }).click();
  await card.getByRole("button", { name: fill(o.bottle.handFor, { name: "Sara" }) }).click();
  await expect(page.getByText(fill(o.history.one, { count: 1 }))).toBeVisible();
  expect(sent.patches.filter((p) => p.status).map((p) => p.status)).toEqual(["bottled", "resting", "bottled", "handed_over"]);
  // Omar's bottle is still to bottle, in the same batch.
  await expect(card).toContainText(fill(o.bottle.fill, { ml: 50, name: "Omar" }));
});

test("an order whose batch was removed goes back to the queue", async ({ page }) => {
  await signIn(page);
  const sent = await fakeApi(page, { orders: [{ id: "a", user_id: USER.id, buyer_name: "Lina", scent_text: "Rose", size_ml: 30, strength_pct: 20, status: "resting", batch_id: null, group_mode: "mix" }] });
  await page.goto("/bench/orders");
  await expect(page.getByText(fill(o.bottle.lost, { name: "Lina", scent: "Rose" }))).toBeVisible();
  await page.getByRole("button", { name: o.bottle.requeue }).click();
  expect(sent.patches.at(-1)).toMatchObject({ id: "a", status: "queued" });
  await expect(page.getByRole("article").filter({ hasText: fill(o.mix.group, { scent: "Rose", pct: 20 }) })).toBeVisible();
});

test("Arabic: bottling has no axe violations", async ({ page }) => {
  await signIn(page);
  await fakeApi(page, {
    locale: "ar",
    orders: [{ id: "a", user_id: USER.id, buyer_name: "سارة", scent_text: "عود", size_ml: 50, strength_pct: 25, status: "bottled", family: "woody", batch_id: "b1", batches: { batch_no: 12, blend_date: "2026-09-01" }, group_mode: "mix" },
      { id: "h", user_id: USER.id, buyer_name: "عمر", scent_text: "عود", size_ml: 30, strength_pct: 25, status: "handed_over", batch_id: "b1", batches: { batch_no: 12, blend_date: "2026-09-01" }, group_mode: "mix" }],
  });
  await page.goto("/ar/bench/orders");
  await expect(page.getByText(ar.orders.bottle.title, { exact: true })).toBeVisible();
  await expect(page.getByText(ar.orders.bottle.ready, { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

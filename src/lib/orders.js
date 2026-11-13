import { bottlingGroups } from "./calc";

// From stored orders (seller_orders) and the seller's own formulas and
// stock to what the batch plan reads (src/lib/calc/orderPlan.ts). No
// arithmetic here: only which scent an order is, and where its density,
// family and stock come from.

/** Typed scent names group when they match, ignoring case and spaces. */
export function scentTextKey(text) {
  return String(text ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** The newest version of each saved formula. */
function latest(recipe) {
  return [...(recipe.recipe_versions || [])].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0] ?? null;
}

/**
 * What an order can be: the seller's saved formulas (their newest version)
 * and the oils in their stock, by name. Typed text is always possible too.
 */
export function scentOptions(recipes = [], inventory = []) {
  const formulas = recipes.flatMap((r) => {
    const v = latest(r);
    return v ? [{ key: `v:${v.id}`, kind: "formula", label: r.name, recipe_version_id: v.id, fragrance_id: null, family: r.family ?? null, strengthPct: Number(v.concentration_pct) || null }] : [];
  });
  const oils = inventory.map((i) => ({
    key: `f:${i.fragrance_id}`, kind: "oil", label: i.fragrances?.name ?? "", recipe_version_id: null, fragrance_id: i.fragrance_id,
    family: i.fragrances?.tier ?? null, strengthPct: null,
  })).filter((o) => o.label);
  const byLabel = (a, b) => a.label.localeCompare(b.label);
  return [...formulas.sort(byLabel), ...oils.sort(byLabel)];
}

/** A stored order as the plan reads it. */
export function toPlanOrder(row, { recipes = [] } = {}) {
  const versions = new Map(recipes.flatMap((r) => (r.recipe_versions || []).map((v) => [v.id, v])));
  const version = row.recipe_version_id ? versions.get(row.recipe_version_id) : null;
  const text = scentTextKey(row.scent_text);
  const scentKey = row.recipe_version_id ? `v:${row.recipe_version_id}` : row.fragrance_id ? `f:${row.fragrance_id}` : text ? `t:${text}` : null;
  return {
    id: row.id,
    scentKey,
    scentName: row.scent_text,
    sizeMl: Number(row.size_ml) || 0,
    strengthPct: Number(row.strength_pct) || 0,
    status: row.status,
    groupMode: row.group_mode,
    family: row.family ?? null,
    stockKey: row.fragrance_id ?? null,
    oilDensity: version?.oil_density != null ? Number(version.oil_density) : null,
    wantedBy: row.wanted_by ?? null,
  };
}

/** Grams in stock by fragrance id, for oilNeeds(). */
export function stockMap(inventory = []) {
  return Object.fromEntries(inventory.map((i) => [i.fragrance_id, Number.isFinite(Number(i.stock_g)) ? Number(i.stock_g) : null]));
}

/**
 * The Bench link that weighs one planned mix (Phase B): its scent, family,
 * strength and volume (the mix's, with any allowance), the saved formula
 * when there is one, and the orders the logged batch will take.
 */
export function weighLink(group, mix) {
  const q = new URLSearchParams();
  q.set("name", group.scentName);
  if (group.family) q.set("family", group.family);
  q.set("size", String(mix.mixMl));
  q.set("unit", "ml");
  q.set("conc", String(group.strengthPct));
  if (group.scentKey?.startsWith("v:")) q.set("recipe", group.scentKey.slice(2));
  q.set("orders", mix.orderIds.join(","));
  return `/bench?${q}`;
}

/** A stored order as the bottling list reads it (its batch from the join). */
export function toBottlingOrder(row) {
  return {
    id: row.id,
    status: row.status,
    family: row.family ?? null,
    batchId: row.batch_id ?? null,
    blendDate: row.batches?.blend_date ?? null,
    batchNo: row.batches?.batch_no ?? null,
    scentName: row.scent_text,
    strengthPct: Number(row.strength_pct) || 0,
  };
}

/** Sent by the order queue whenever its orders change ({ detail: { ready } }), for the tab's badge. */
export const ORDERS_CHANGED = "kyphira-orders-changed";

/** Today as YYYY-MM-DD in the seller's own time zone. */
export function localToday(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** How many orders are waiting to be bottled today: resting, in a batch whose rest window has opened. */
export function readyToBottle(rows = [], today = localToday()) {
  return bottlingGroups(rows.map(toBottlingOrder), today).groups
    .filter((g) => g.ready)
    .reduce((n, g) => n + g.orders.filter((o) => o.status === "resting").length, 0);
}

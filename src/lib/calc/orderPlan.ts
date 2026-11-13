// The order queue's batch plan (spec: docs/order-queue/Kyphira-Order-Queue_Brief_v2.md).
// Open orders are grouped by scent and strength; a group is weighed as one
// mix (ordered total + MIX_ALLOWANCE_PCT, through solveRun) or as separate
// bottles (each exactly its size, no allowance). The oil each scent needs is
// set against stock, and each order gets a rest window from its family.
// Pure: no dates from the clock, no I/O.

import type { Densities } from "./types";
import { solveBottle, solveRun } from "./solve";
import { round2, shownTotal } from "./round";
import { batchCost } from "./cost";
import { POUR_BAND } from "./pour";
import { FAMILIES, REFERENCE, ETHANOL_DENSITY, type TierKey } from "../formulation";

/** Extra liquid on one mix, for what is lost filling several bottles (owner, 2026-11-13). */
export const MIX_ALLOWANCE_PCT = 5;
/** No order rests longer than this before it counts as fully rested (owner, 2026-11-13). */
export const MAX_REST_DAYS = 90;

/** Orders still to be weighed. */
export const OPEN_STATUSES = Object.freeze(["queued", "planned"] as const);
export const ORDER_STATUSES = Object.freeze(["queued", "planned", "resting", "ready", "bottled", "handed_over", "cancelled"] as const);
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type GroupMode = "mix" | "separate";

export interface PlanOrder {
  id: string;
  /** What identifies the scent: `v:<recipe_version_id>`, `f:<fragrance_id>`; null for typed-only text. */
  scentKey: string | null;
  scentName: string;
  sizeMl: number;
  strengthPct: number;
  status: OrderStatus;
  groupMode?: GroupMode | null;
  family?: string | null;
  /** The oil's stock row (inventory.fragrance_id), when the scent is one oil. */
  stockKey?: string | null;
  /** Measured oil density, g/mL; wins over the family's. */
  oilDensity?: number | null;
  wantedBy?: string | null;
}

export interface MixPlan {
  orderIds: string[];
  orderedMl: number;
  allowancePct: number;
  mixMl: number;
  oilG: number;
  oilMl: number;
  ethanolG: number;
  ethanolMl: number;
  totalG: number;
}

export interface OrderGroup {
  key: string;
  scentKey: string;
  scentName: string;
  strengthPct: number;
  family: string | null;
  stockKey: string | null;
  mode: GroupMode;
  densities: Densities;
  orders: PlanOrder[];
  mixes: MixPlan[];
  orderedMl: number;
  oilG: number;
}

export interface OilNeed {
  key: string;
  scentName: string;
  needG: number;
  /** null: no stock row, so unknown (never read as zero). */
  haveG: number | null;
  shortG: number | null;
}

export interface Plan {
  groups: OrderGroup[];
  /** Open orders that can't be planned yet (typed scent, no size, no strength). */
  unplanned: PlanOrder[];
  oil: OilNeed[];
}

function isFamily(f: unknown): f is TierKey {
  return typeof f === "string" && Object.prototype.hasOwnProperty.call(FAMILIES, f);
}

/** The family's oil density, or the handbook's 0.95; a measured density wins. */
export function orderDensities(family: string | null | undefined, measuredOil?: number | null): Densities {
  const oil = measuredOil && measuredOil > 0 ? measuredOil : isFamily(family) ? FAMILIES[family].active.density : REFERENCE.oilDensity;
  return { oil, ethanol: ETHANOL_DENSITY };
}

/** Days from an ISO date (YYYY-MM-DD), in UTC so no time zone shifts the day. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface RestWindow {
  minDays: number;
  maxDays: number;
  readyFrom: string;
  fullyRested: string;
}

/**
 * The rest window: ready from the family's shortest rest, fully rested at its
 * longest, never past MAX_REST_DAYS. Unknown family: 90 days for both. The
 * per-family ranges are formulation.ts's `sources.htmlTool.restDays`.
 */
export function restWindow(family: string | null | undefined, blendDate: string): RestWindow {
  const days = (isFamily(family) && FAMILIES[family].sources.htmlTool.restDays) || [MAX_REST_DAYS, MAX_REST_DAYS];
  const minDays = Math.min(days[0], MAX_REST_DAYS);
  const maxDays = Math.min(days[1], MAX_REST_DAYS);
  return { minDays, maxDays, readyFrom: addDays(blendDate, minDays), fullyRested: addDays(blendDate, maxDays) };
}

function plannable(o: PlanOrder): boolean {
  return !!o.scentKey && o.sizeMl > 0 && o.strengthPct > 0 && o.strengthPct < 100;
}

function mixPlan(orders: PlanOrder[], pct: number, d: Densities, allowancePct: number): MixPlan {
  const run = solveRun(orders.map((o) => ({ sizeMl: o.sizeMl, count: 1 })), pct, d, allowancePct);
  const s = run.exact;
  return {
    orderIds: orders.map((o) => o.id),
    orderedMl: run.bottlesMl,
    allowancePct,
    mixMl: round2(s.totalMl),
    oilG: round2(s.oilG),
    oilMl: round2(s.oilMl),
    ethanolG: round2(s.ethanolG),
    ethanolMl: round2(s.ethanolMl),
    totalG: shownTotal(s.oilG, s.ethanolG),
  };
}

/** One separate bottle, weighed straight into itself: exactly its size. */
function bottlePlan(o: PlanOrder, d: Densities): MixPlan {
  const s = solveBottle(o.sizeMl, "ml", o.strengthPct, d).exact;
  return {
    orderIds: [o.id],
    orderedMl: o.sizeMl,
    allowancePct: 0,
    mixMl: round2(s.totalMl),
    oilG: round2(s.oilG),
    oilMl: round2(s.oilMl),
    ethanolG: round2(s.ethanolG),
    ethanolMl: round2(s.ethanolMl),
    totalG: shownTotal(s.oilG, s.ethanolG),
  };
}

/** Earliest wanted-by first, orders without one last, then by id for a stable order. */
function byWanted(a: PlanOrder, b: PlanOrder): number {
  const wa = a.wantedBy || "9999-12-31";
  const wb = b.wantedBy || "9999-12-31";
  return wa < wb ? -1 : wa > wb ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Group open orders into mixes. Same scent and same strength share a group;
 * two strengths of one scent never do. A group is one mix unless any of its
 * orders asks for separate bottles.
 */
export function planMixes(orders: PlanOrder[], stock: Record<string, number | null | undefined> = {}, allowancePct = MIX_ALLOWANCE_PCT): Plan {
  const open = orders.filter((o) => (OPEN_STATUSES as readonly string[]).includes(o.status)).sort(byWanted);
  const unplanned = open.filter((o) => !plannable(o));
  const byKey = new Map<string, PlanOrder[]>();
  for (const o of open.filter(plannable)) {
    const key = `${o.scentKey}@${o.strengthPct}`;
    const list = byKey.get(key) ?? [];
    list.push(o);
    byKey.set(key, list);
  }

  const groups: OrderGroup[] = [];
  for (const [key, list] of byKey) {
    const first = list[0];
    const family = list.find((o) => o.family)?.family ?? null;
    const measured = list.find((o) => o.oilDensity && o.oilDensity > 0)?.oilDensity ?? null;
    const d = orderDensities(family, measured);
    const mode: GroupMode = list.some((o) => o.groupMode === "separate") ? "separate" : "mix";
    const mixes = mode === "mix" ? [mixPlan(list, first.strengthPct, d, allowancePct)] : list.map((o) => bottlePlan(o, d));
    groups.push({
      key,
      scentKey: first.scentKey as string,
      scentName: first.scentName,
      strengthPct: first.strengthPct,
      family,
      stockKey: list.find((o) => o.stockKey)?.stockKey ?? null,
      mode,
      densities: d,
      orders: list,
      mixes,
      orderedMl: list.reduce((s, o) => s + o.sizeMl, 0),
      oilG: round2(mixes.reduce((s, m) => s + m.oilG, 0)),
    });
  }

  return { groups, unplanned, oil: oilNeeds(groups, stock) };
}

/**
 * Oil per scent across every group (one oil at two strengths draws on the
 * same stock), against stock in grams. No stock row = unknown, not zero.
 */
export function oilNeeds(groups: OrderGroup[], stock: Record<string, number | null | undefined>): OilNeed[] {
  const needs = new Map<string, OilNeed>();
  for (const g of groups) {
    const key = g.stockKey ? `s:${g.stockKey}` : `k:${g.scentKey}`;
    const n = needs.get(key) ?? { key, scentName: g.scentName, needG: 0, haveG: null, shortG: null };
    n.needG = round2(n.needG + g.oilG);
    needs.set(key, n);
    const have = g.stockKey ? stock[g.stockKey] : null;
    if (typeof have === "number" && Number.isFinite(have)) n.haveG = have;
  }
  for (const n of needs.values()) {
    n.shortG = n.haveG === null ? null : round2(Math.max(0, n.needG - n.haveG));
  }
  return [...needs.values()];
}

// ------------------------------------------------------------ Phase B
// After weighing: an order rests with its batch, is bottled, then handed
// over. Each step can be undone once (a mistaken tap). Queued/cancelled
// moves are Phase A's (cancel, bring back).

/** Steps a seller takes by hand, each with the one step back it allows. */
export const ORDER_STEPS: Readonly<Record<string, { next: OrderStatus | null; back: OrderStatus | null }>> = Object.freeze({
  resting: { next: "bottled", back: null },
  bottled: { next: "handed_over", back: "resting" },
  handed_over: { next: null, back: "bottled" },
});

/** Whether a seller may move an order from `from` to `to` by hand. */
export function canMove(from: string, to: string): boolean {
  if (to === "cancelled") return (OPEN_STATUSES as readonly string[]).includes(from);
  if (to === "queued") return from === "cancelled" || from === "resting";
  const step = ORDER_STEPS[from];
  return !!step && (step.next === to || step.back === to);
}

export interface BottlingOrder {
  id: string;
  status: string;
  family?: string | null;
  batchId?: string | null;
  /** The batch's blend date (YYYY-MM-DD); null when the batch is gone. */
  blendDate?: string | null;
  batchNo?: number | null;
  scentName: string;
  strengthPct: number;
}

export interface BottlingGroup {
  batchId: string;
  batchNo: number | null;
  scentName: string;
  strengthPct: number;
  rest: RestWindow;
  /** On or after the ready-from date. */
  ready: boolean;
  orders: BottlingOrder[];
}

/**
 * Resting and bottled orders by their batch, with the rest window counted
 * from the batch's real blend date. Ready batches first, then by ready-from
 * date. Orders whose batch is gone are returned apart (back to the queue).
 */
export function bottlingGroups(orders: BottlingOrder[], today: string): { groups: BottlingGroup[]; orphaned: BottlingOrder[] } {
  const live = orders.filter((o) => o.status === "resting" || o.status === "bottled");
  const orphaned = live.filter((o) => !o.batchId || !o.blendDate);
  const byBatch = new Map<string, BottlingOrder[]>();
  for (const o of live.filter((x) => x.batchId && x.blendDate)) {
    const list = byBatch.get(o.batchId as string) ?? [];
    list.push(o);
    byBatch.set(o.batchId as string, list);
  }
  const groups: BottlingGroup[] = [...byBatch].map(([batchId, list]) => {
    const first = list[0];
    const rest = restWindow(list.find((o) => o.family)?.family ?? null, first.blendDate as string);
    return {
      batchId,
      batchNo: first.batchNo ?? null,
      scentName: first.scentName,
      strengthPct: first.strengthPct,
      rest,
      ready: today.slice(0, 10) >= rest.readyFrom,
      orders: list,
    };
  });
  groups.sort((a, b) => Number(b.ready) - Number(a.ready) || a.rest.readyFrom.localeCompare(b.rest.readyFrom));
  return { groups, orphaned };
}

// ------------------------------------------------------------ P1a
// What one order's bottle cost, from the batch it was weighed in: its share
// (by volume) of the batch's oil, alcohol and time, plus that batch's bottle
// and packaging per bottle. Null when the batch has no prices at all, so a
// missing cost never reads as zero.

export interface OrderCost {
  cost: number;
  currency: string;
  /** Price minus cost; null without a price. */
  profit: number | null;
  /** Profit as a share of the price, %; null without a price. */
  marginPct: number | null;
}

const pos = (v: unknown) => (Number(v) > 0 ? Number(v) : null);

export function orderCost(batch: Record<string, any> | null | undefined, sizeMl: number, price?: number | null): OrderCost | null {
  if (!batch) return null;
  const prices = {
    oilPerG: pos(batch.price_per_gram),
    ethanolPerL: pos(batch.ethanol_price_per_l),
    bottleEach: pos(batch.bottle_cost),
    packagingEach: pos(batch.packaging_cost),
    labourMinutes: pos(batch.labour_minutes),
    labourPerHour: pos(batch.labour_rate_per_hour),
  };
  if (Object.values(prices).every((v) => v === null)) return null;
  const totalMl = pos(batch.total_ml);
  const share = totalMl && sizeMl > 0 ? Math.min(sizeMl / totalMl, 1) : 0;
  const liquid = batchCost(pos(batch.actual_oil_g) ?? (Number(batch.oil_g) || 0), Number(batch.ethanol_ml) || 0, 0, prices);
  const cost = round2(liquid.total * share + (prices.bottleEach ?? 0) + (prices.packagingEach ?? 0));
  const p = pos(price);
  return {
    cost,
    currency: typeof batch.currency === "string" ? batch.currency : "",
    profit: p === null ? null : round2(p - cost),
    marginPct: p === null ? null : round2(((p - cost) / p) * 100),
  };
}

/**
 * Whether a logged mix came out short of the bottles it was weighed for.
 * The volume made is read from the grams weighed and the batch's densities
 * (the handbook's starting points where none were stored); without weighed
 * grams the planned volume stands. Short only beyond POUR_BAND (1 %), the
 * Bench's own tolerance. It informs; it never proposes a correction.
 */
export function shortMix(batch: Record<string, any>, sizesMl: number[]): { madeMl: number; neededMl: number; shortMl: number } {
  const neededMl = round2(sizesMl.reduce((n, x) => n + (Number(x) || 0), 0));
  const oilG = pos(batch.actual_oil_g);
  const ethG = pos(batch.actual_ethanol_g);
  const madeMl = round2(oilG && ethG
    ? oilG / (pos(batch.oil_density) ?? REFERENCE.oilDensity) + ethG / (pos(batch.ethanol_density) ?? ETHANOL_DENSITY)
    : Number(batch.total_ml) || 0);
  const gap = neededMl - madeMl;
  return { madeMl, neededMl, shortMl: gap > neededMl * POUR_BAND ? round2(gap) : 0 };
}

/** Profit over many orders, one total per currency; orders without a cost or price are counted apart. */
export function profitTotals(items: Array<OrderCost | null>): { totals: { currency: string; profit: number; count: number }[]; missing: number } {
  const by = new Map<string, { currency: string; profit: number; count: number }>();
  let missing = 0;
  for (const c of items) {
    if (!c || c.profit === null) { missing += 1; continue; }
    const t = by.get(c.currency) ?? { currency: c.currency, profit: 0, count: 0 };
    t.profit = round2(t.profit + c.profit);
    t.count += 1;
    by.set(c.currency, t);
  }
  return { totals: [...by.values()], missing };
}

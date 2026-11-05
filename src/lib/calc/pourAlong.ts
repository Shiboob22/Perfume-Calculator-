import type { Basis, Densities } from "./types";
import { ingredientAmounts, type Ingredient } from "./mixture";
import { pourScaleAt, ingredientTarget, blendEthanolTarget } from "./pour";
import { fromWeights, concentrationOf } from "./blend";

// Bench mode's pour-along (Bench SaaS Phase 4): the steps a formula needs
// and each step's target, from what has really been poured so far. Pure;
// BenchMode.jsx only formats.

/** One thing to pour: a material of a blend, or the single oil. */
export interface PourItem {
  /** The material's name; null for a simple formula's one oil. */
  name: string | null;
  type: string | null;
  /** Share of the concentrate as entered, %; null for the single oil. */
  pct: number | null;
  /** Planned grams. */
  base: number;
}

export type PourStep =
  | { key: "prepare" }
  | { key: "tare" }
  | { key: "pour"; index: number; name: string | null }
  | { key: "ethanol" }
  | { key: "mix" }
  | { key: "qc" }
  | { key: "done" };

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const poured = (v: unknown) => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * What to pour for `concentrateG` of concentrate: a blend's materials in
 * order (those with no positive share left out), or a single oil step when
 * there is no blend.
 */
export function pourItems(concentrateG: number, blend?: readonly Ingredient[] | null): PourItem[] {
  const list = Array.isArray(blend) ? blend : [];
  if (list.length) {
    const grams = ingredientAmounts(concentrateG, list);
    const items = list
      .map((i, n) => ({ name: String(i.name ?? "").trim(), type: i.type ? String(i.type) : null, pct: num(i.pct), base: grams[n].g }))
      .filter((i) => i.base > 0);
    if (items.length) return items;
  }
  return [{ name: null, type: null, pct: null, base: Math.max(num(concentrateG), 0) }];
}

/** prepare → tare → each item in order → ethanol → mix → QC → done. */
export function pourSteps(items: readonly PourItem[]): PourStep[] {
  return [
    { key: "prepare" },
    { key: "tare" },
    ...items.map((i, index) => ({ key: "pour" as const, index, name: i.name })),
    { key: "ethanol" },
    { key: "mix" },
    { key: "qc" },
    { key: "done" },
  ];
}

export interface PourState {
  /** Target grams per item, after any over-pour scaling before it. */
  targets: number[];
  /** The scale factor each item's target carries (1 = as planned). */
  scales: number[];
  /** Ethanol for what was actually poured; the planned ethanol until then. */
  ethanolTarget: number;
  /** Sum of the items poured so far. */
  concentrateG: number;
  /** Sum of the planned items. */
  plannedG: number;
  /** True once the concentrate poured differs from the plan (≥ 0.005 g). */
  ethanolAdjusted: boolean;
}

/**
 * The targets for every step from what was poured. `pouredG[i]` is item i's
 * actual grams (blank or 0 = not yet). `plannedEthanolG` is used until
 * something has been poured.
 */
export function pourState(
  items: readonly PourItem[],
  pouredG: readonly unknown[],
  targetPct: number,
  basis: Basis,
  d: Densities,
  plannedEthanolG: number,
): PourState {
  const bases = items.map((i) => i.base);
  const p = items.map((_, n) => poured(pouredG[n]));
  const concentrateG = p.reduce<number>((a, v) => a + (v ?? 0), 0);
  const plannedG = bases.reduce((a, v) => a + v, 0);
  const eth = blendEthanolTarget(p, targetPct, basis, d);
  return {
    targets: bases.map((_, n) => ingredientTarget(bases, p, n)),
    scales: bases.map((_, n) => pourScaleAt(bases, p, n)),
    ethanolTarget: Number.isFinite(eth) ? eth : plannedEthanolG,
    concentrateG,
    plannedG,
    ethanolAdjusted: concentrateG > 0 && Math.abs(concentrateG - plannedG) >= 0.005,
  };
}

/** The summary once poured: grams, and the strength made on the batch's basis. */
export function pourSummary(concentrateG: number, ethanolG: unknown, basis: Basis, d: Densities) {
  const c = Math.max(num(concentrateG), 0);
  const e = poured(ethanolG) ?? 0;
  const madePct = c > 0 && e > 0 ? concentrationOf(fromWeights(c, e, d), basis) * 100 : 0;
  return { concentrateG: c, ethanolG: e, totalG: c + e, madePct };
}

/**
 * The per-material record a blend's batch stores (0032 batches.pours):
 * name, type, share, target and what was poured. Null for a simple formula,
 * whose one pour is the batch's actual_oil_g.
 */
export function pourRecord(items: readonly PourItem[], pouredG: readonly unknown[], targets: readonly number[]) {
  if (!items.length || items[0].name === null) return null;
  return items.map((i, n) => ({
    name: i.name || null,
    type: i.type,
    pct: i.pct,
    target_g: Math.round(targets[n] * 100) / 100,
    actual_g: poured(pouredG[n]),
  }));
}

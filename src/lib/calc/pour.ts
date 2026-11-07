import type { Basis, Densities } from "./types";
import { fromWeights, concentrationOf } from "./blend";
import { adjustConcentration } from "./solve";
import { round2 } from "./round";

// Precision Rule 5 — record actual weights. Given what was really poured,
// what concentration was made, and what to add (never remove) to land on
// the target.

export interface PourCheck {
  basis: Basis;
  targetPct: number;
  actualPct: number;
  /** Actual minus target, in percentage points. */
  deviation: number;
  /** null until a tolerance is set; then whether |deviation| is within it. */
  withinTolerance: boolean | null;
  fix: ReturnType<typeof adjustConcentration>["add"];
}

export function checkPour(
  actualOilG: number,
  actualEthanolG: number,
  targetPct: number,
  basis: Basis,
  d: Densities,
  tolerancePts: number | null = null,
): PourCheck {
  const made = fromWeights(actualOilG, actualEthanolG, d);
  const actualPct = concentrationOf(made, basis) * 100;
  const deviation = actualPct - targetPct;
  return {
    basis,
    targetPct,
    actualPct,
    deviation,
    withinTolerance: tolerancePts == null ? null : Math.abs(deviation) <= tolerancePts + 1e-9,
    fix: adjustConcentration(made, targetPct, basis, d).add,
  };
}

/**
 * Bench step 5: the alcohol to add for the oil actually poured, so the
 * concentration stays on target without removing anything.
 */
export function alcoholForOil(actualOilG: number, targetPct: number, basis: Basis, d: Densities): number {
  const c = targetPct / 100;
  if (!(c > 0 && c < 1) || !(actualOilG > 0)) return NaN;
  return basis === "volume"
    ? (actualOilG / d.oil / c) * (1 - c) * d.ethanol
    : (actualOilG / c) * (1 - c);
}

/**
 * The weights for the label: what was poured where recorded, else the
 * targets; the total is the sum of the two rounded weights, as on the scale.
 */
export function labelWeights(targetOilG: number, targetEthanolG: number, actualOilG?: number | null, actualEthanolG?: number | null) {
  const oil = round2(actualOilG && actualOilG > 0 ? actualOilG : targetOilG);
  const ethanol = round2(actualEthanolG && actualEthanolG > 0 ? actualEthanolG : targetEthanolG);
  return { oil, ethanol, total: round2(oil + ethanol) };
}

/**
 * Pouring a blend, one material at a time: when an earlier material went
 * over, the ones after it scale up by the largest overshoot so far, keeping
 * the blend's ratio (nothing is ever taken out). Under-pours never scale
 * down. `poured[j]` is null or missing for a material not poured yet.
 * Owner-approved 2026-11-05.
 */
export function pourScaleAt(bases: readonly number[], poured: readonly (number | null | undefined)[], i: number): number {
  let k = 1;
  for (let j = 0; j < i && j < bases.length; j++) {
    const p = poured[j];
    if (p != null && Number.isFinite(p) && bases[j] > 0) k = Math.max(k, p / bases[j]);
  }
  return k;
}

/** The target for material `i`: its planned grams times pourScaleAt(). */
export function ingredientTarget(bases: readonly number[], poured: readonly (number | null | undefined)[], i: number): number {
  return (bases[i] ?? 0) * pourScaleAt(bases, poured, i);
}

/**
 * The ethanol target after a blend is poured: alcoholForOil() on the sum of
 * what was actually poured, with the blend's density as the oil density.
 * NaN until something has been poured (as alcoholForOil()).
 */
export function blendEthanolTarget(
  poured: readonly (number | null | undefined)[],
  targetPct: number,
  basis: Basis,
  d: Densities,
): number {
  const sum = poured.reduce<number>((a, v) => a + (v != null && Number.isFinite(v) && v > 0 ? v : 0), 0);
  return alcoholForOil(sum, targetPct, basis, d);
}

/** Bench mode's "on target" band: ±1 % of the target (owner-approved 2026-11-05). */
export const POUR_BAND = 0.01;

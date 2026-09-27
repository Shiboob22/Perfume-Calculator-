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

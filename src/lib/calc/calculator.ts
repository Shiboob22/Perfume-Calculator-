import type { Unit } from "./units";
import { solveBottle } from "./solve";
import { volumeToWeightFraction, weightToVolumeFraction } from "./basis";
import { checkPour } from "./pour";
import { checkInputs } from "./solve";
import { batchCost, costPer } from "./cost";
import { PLAUSIBLE_DENSITY } from "../formulation";

// Everything the Calculator screen shows, from its raw form inputs. The
// screen only renders this; no arithmetic lives in the component.

export interface CalculatorInput {
  amount: number | string;
  unit: Unit;
  concPct: number | string;
  oilDensity: number;
  ethanolDensity: number;
  actualOilG?: number | string | null;
  actualEthanolG?: number | string | null;
  pricePerGram?: number | string | null;
  /** Percentage points; null until the owner sets one. */
  tolerancePts?: number | null;
  /** The family's recommended range, percent; null when none is set. */
  range?: readonly [number, number] | null;
  ethanolPricePerL?: number | string | null;
  bottleCost?: number | string | null;
  bottles?: number | string | null;
}

/** Fallback densities (g/mL) when the user's value is blank or unusable. */
const FALLBACK_DENSITY = { oil: 1, ethanol: 0.81 } as const;

/**
 * A strictly positive, finite number, or null. Blank, zero, negative, NaN and
 * ±Infinity are all "not a usable value": `Number(v) > 0` alone lets Infinity
 * through, which would turn every downstream weight and cost infinite.
 */
const positive = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * A density with its fallback. Blank or zero is "missing"; a negative or
 * non-finite value is "invalid". Either way a safe fallback is used and the
 * caller says so, so the fallback is never presented as the user's own value.
 */
function resolveDensity(raw: unknown, fallback: number) {
  const value = positive(raw);
  if (value !== null) return { value, problem: null as null | "missing" | "invalid" };
  const n = Number(raw);
  const invalid = n < 0 || n === Infinity;
  return { value: fallback, problem: invalid ? ("invalid" as const) : ("missing" as const) };
}

export function calculate(input: CalculatorInput) {
  const rawAmount = Number(input.amount) || 0;
  // A negative or non-finite batch never yields negative grams: it computes as
  // zero and the amount warning says why.
  const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0;
  const concPct = Math.min(Math.max(Number(input.concPct) || 0, 0), 100);
  // Each density is validated on its own: a bad oil density never changes the
  // ethanol one, and a valid measured density is kept as entered.
  const oilD = resolveDensity(input.oilDensity, FALLBACK_DENSITY.oil);
  const ethanolD = resolveDensity(input.ethanolDensity, FALLBACK_DENSITY.ethanol);
  const d = { oil: oilD.value, ethanol: ethanolD.value };

  const solution = solveBottle(amount, input.unit, concPct, d);
  const c = concPct / 100;
  // The same batch on the other basis, e.g. 25% by volume = 28.11% by weight.
  const otherBasisPct = (solution.basis === "volume" ? volumeToWeightFraction(c, d) : weightToVolumeFraction(c, d)) * 100;

  // A tolerance that is negative or not finite would make every pour "within"
  // (Infinity) or never within (NaN); treat it as not set.
  const tolerancePts = input.tolerancePts != null && Number.isFinite(input.tolerancePts) && input.tolerancePts >= 0
    ? input.tolerancePts
    : null;

  const actualOilG = positive(input.actualOilG);
  const actualEthanolG = positive(input.actualEthanolG);
  const actual = actualOilG !== null && actualEthanolG !== null
    ? checkPour(actualOilG, actualEthanolG, concPct, solution.basis, d, tolerancePts)
    : null;

  // Cost and stock follow the oil actually used, when it was recorded.
  const usedOilG = actualOilG ?? solution.exact.oilG;
  const price = positive(input.pricePerGram);
  const oilCostRaw = price !== null ? usedOilG * price : null;
  const oilCost = oilCostRaw !== null && Number.isFinite(oilCostRaw) ? oilCostRaw : null;

  const warnings = checkInputs(amount, Number(input.concPct) || 0, d, {
    range: input.range ?? null,
    oilDensity: PLAUSIBLE_DENSITY.oil,
    ethanolDensity: PLAUSIBLE_DENSITY.ethanol,
  });
  // A blank, zero, negative or non-finite density is replaced by a fallback
  // above; say so rather than present the fallback as the user's own value.
  if (oilD.problem) warnings.push({ code: `oil_density_${oilD.problem}`, used: d.oil });
  if (ethanolD.problem) warnings.push({ code: `ethanol_density_${ethanolD.problem}`, used: d.ethanol });

  // Full cost (Pro): oil actually used, ethanol by the litre, bottles.
  const bottlesRaw = Number(input.bottles);
  const bottles = Number.isFinite(bottlesRaw) ? Math.max(Math.floor(bottlesRaw), 0) : 0;
  const ethanolMl = actualEthanolG !== null ? actualEthanolG / d.ethanol : solution.exact.ethanolMl;
  const prices = {
    oilPerG: price,
    ethanolPerL: positive(input.ethanolPricePerL),
    bottleEach: positive(input.bottleCost),
  };
  let cost = batchCost(usedOilG, ethanolMl, bottles, prices);
  // Valid but extreme inputs can still overflow; never show an infinite cost.
  if (!Number.isFinite(cost.total)) cost = batchCost(usedOilG, ethanolMl, bottles, {});
  const per = costPer(cost.total, bottles, solution.exact.totalMl);

  return { ...solution, otherBasisPct, actual, usedOilG, oilCost, warnings, cost: { ...cost, ...per, bottles } };
}

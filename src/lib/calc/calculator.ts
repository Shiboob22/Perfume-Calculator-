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

const positive = (v: unknown) => (Number(v) > 0 ? Number(v) : null);

export function calculate(input: CalculatorInput) {
  const amount = Number(input.amount) || 0;
  const concPct = Math.min(Math.max(Number(input.concPct) || 0, 0), 100);
  const d = { oil: input.oilDensity || 1, ethanol: input.ethanolDensity || 0.81 };

  const solution = solveBottle(amount, input.unit, concPct, d);
  const c = concPct / 100;
  // The same batch on the other basis, e.g. 25% by volume = 28.11% by weight.
  const otherBasisPct = (solution.basis === "volume" ? volumeToWeightFraction(c, d) : weightToVolumeFraction(c, d)) * 100;

  const actualOilG = positive(input.actualOilG);
  const actualEthanolG = positive(input.actualEthanolG);
  const actual = actualOilG !== null && actualEthanolG !== null
    ? checkPour(actualOilG, actualEthanolG, concPct, solution.basis, d, input.tolerancePts ?? null)
    : null;

  // Cost and stock follow the oil actually used, when it was recorded.
  const usedOilG = actualOilG ?? solution.exact.oilG;
  const price = Number(input.pricePerGram);
  const oilCost = price > 0 ? usedOilG * price : null;

  const warnings = checkInputs(amount, Number(input.concPct) || 0, d, {
    range: input.range ?? null,
    oilDensity: PLAUSIBLE_DENSITY.oil,
    ethanolDensity: PLAUSIBLE_DENSITY.ethanol,
  });

  // Full cost (Pro): oil actually used, ethanol by the litre, bottles.
  const bottles = Math.max(Math.floor(Number(input.bottles) || 0), 0);
  const ethanolMl = actualEthanolG !== null ? actualEthanolG / d.ethanol : solution.exact.ethanolMl;
  const cost = batchCost(usedOilG, ethanolMl, bottles, {
    oilPerG: price > 0 ? price : null,
    ethanolPerL: Number(input.ethanolPricePerL) > 0 ? Number(input.ethanolPricePerL) : null,
    bottleEach: Number(input.bottleCost) > 0 ? Number(input.bottleCost) : null,
  });
  const per = costPer(cost.total, bottles, solution.exact.totalMl);

  return { ...solution, otherBasisPct, actual, usedOilG, oilCost, warnings, cost: { ...cost, ...per, bottles } };
}

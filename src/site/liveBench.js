// The live bench on the home page: the handbook's own arithmetic for the
// sizes and named strengths a visitor can pick. Pure, so the prerendered
// figures and the interactive ones can't differ.
import { solveBottle } from "../lib/calc";
import { REFERENCE, STRENGTHS } from "../lib/formulation";

export const BENCH_SIZES = [30, 50, 100];
export const BENCH_STRENGTHS = STRENGTHS;
export const BENCH_DEFAULT = { size: 100, pct: 25 };
const DENSITIES = { oil: REFERENCE.oilDensity, ethanol: REFERENCE.ethanolDensity };

/** Grams of oil, alcohol and total, and each part's share of the weight. */
export function benchFigures(size, pct) {
  const { exact } = solveBottle(size, "ml", pct, DENSITIES);
  return { oil: exact.oilG, alcohol: exact.ethanolG, total: exact.totalG, oilShare: exact.oilG / exact.totalG };
}

/** The calculator, opened at the same bottle. */
export function benchHref(size, pct) {
  return `/app/calculator?${new URLSearchParams({ size: String(size), unit: "ml", conc: String(pct), ref: "home" })}`;
}

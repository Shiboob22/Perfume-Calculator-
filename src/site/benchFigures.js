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

// The Scent Ledger bench (redesign/scent-ledger): a 10 mL tester too, and
// 50 mL at 25% to start.
export const LEDGER_SIZES = [10, 30, 50, 100];
export const LEDGER_DEFAULT = { size: 50, pct: 25 };

/** The two weights as shown (2 decimals), the oil's share by weight and the recipe line's numbers. */
export function ledgerFigures(size, pct) {
  const f = benchFigures(size, pct);
  const share = f.oil / f.total;
  return { ...f, oilText: f.oil.toFixed(2), alcoholText: f.alcohol.toFixed(2), share,
    oilPct: (share * 100).toFixed(1), alcoholPct: ((1 - share) * 100).toFixed(1),
    bottleScale: 0.72 + (0.28 * LEDGER_SIZES.indexOf(size)) / (LEDGER_SIZES.length - 1) };
}

/** A weight as the scale's five places: a digit, ".", or a blank to hide. */
export function scaleDigits(text) {
  return [...text.padStart(5, " ")].map((c) => (c === "." ? { dot: true } : c === " " ? { blank: true, n: 0 } : { n: Number(c) }));
}

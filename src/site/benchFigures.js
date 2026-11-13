// The live bench on the home page: the handbook's own arithmetic for the
// sizes and named strengths a visitor can pick. Pure, so the prerendered
// figures and the interactive ones can't differ.
import { solveBottle } from "../lib/calc";
import { REFERENCE, STRENGTHS } from "../lib/formulation";

export const BENCH_SIZES = [10, 30, 50, 100];
export const BENCH_STRENGTHS = STRENGTHS;
export const BENCH_DEFAULT = { size: 100, pct: 25 };
const DENSITIES = { oil: REFERENCE.oilDensity, ethanol: REFERENCE.ethanolDensity };

/** Grams of oil, alcohol and total, and the oil's share of the weight and of the bottle (by volume). */
export function benchFigures(size, pct) {
  const { exact } = solveBottle(size, "ml", pct, DENSITIES);
  const ml = exact.oilMl + exact.ethanolMl;
  return { oil: exact.oilG, alcohol: exact.ethanolG, total: exact.totalG, oilShare: exact.oilG / exact.totalG, volShare: ml > 0 ? exact.oilMl / ml : 0 };
}

// The card's motion (section I): the Bench's own pour and roll (BENCH_MOTION
// in src/lib/calc/flacon.ts), driven by one clock. What the clock rolls:
export const benchTarget = (f) => [f.oil, f.alcohol, f.total, f.volShare];
/** An empty bottle on the scale: where the first pour starts. */
export const BENCH_EMPTY = Object.freeze([0, 0, 0, 0]);
/** Which way each figure hunts as it settles (oil and alcohol against each other; the bottle's fill holds still). */
export const BENCH_JITTER = Object.freeze([1, -1, 1, 0]);
/** The first pour, when the card first comes into view: the same pour at half speed. */
export const BENCH_INTRO_PACE = 2;
/** How much of the card must be in view before it counts as seen. */
export const BENCH_SEEN_AT = 0.35;
/** The flacon's box on the card: the 100 mL bottle (the largest here) at scale 1, without the pan. */
export const BENCH_FLACON_BOX = Object.freeze([112, 140]);

/** The calculator, opened at the same bottle. */
export function benchHref(size, pct) {
  return `/bench?${new URLSearchParams({ size: String(size), unit: "ml", conc: String(pct), ref: "home" })}`;
}

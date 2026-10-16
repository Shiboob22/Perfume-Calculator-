import { benchFigures } from "../../site/benchFigures.js";
import { SCALE, STAGES } from "./config.js";

/** Batch weight, in grams, at which the gauge is full. */
export const SCALE_FULL_G = benchFigures(SCALE.size, SCALE.pct).total;

/** Scroll progress (0–1) → grams on the gauge. */
export function gramsAt(progress) {
  return Math.min(1, Math.max(0, progress)) * SCALE_FULL_G;
}

/**
 * Grams shown on the static composition: where each stage begins (so the
 * empty afternoon reads 0.00 g), except the handoff, which shows the full
 * batch weight the calculator starts from.
 */
export const STAGE_SHOWN_GRAMS = Object.freeze(Object.fromEntries(
  STAGES.map((s) => [s.id, gramsAt(s.id === "handoff" ? s.to : s.from)]),
));

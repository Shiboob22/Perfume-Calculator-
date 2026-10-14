import React from "react";
import { COLORS } from "../../lib/theme";

// Three directions for the Kyphira mark, all one line of smoke over a vessel.
// The owner picks one (docs/redesign/PHASE-1.md); `A` is the provisional
// default. `tone`: "ink" (follows the text colour), "mono" (one colour, no
// accent: for stamps and print) or "reversed" (for dark grounds).
//   A  Censer: a bowl with smoke that rises as the stem and arms of a K.
//   B  Flacon: the bench's own bottle with the smoke rising out of its neck.
//   C  Monogram: a K drawn in three strokes with an ember above its arm.
export const MARK_VARIANTS = ["A", "B", "C"];

const SHAPES = {
  A: (smoke, ink) => (
    <>
      <path d="M6 33h36M9 33c1 6.5 7 11 15 11s14-4.500 15-11" stroke={ink} strokeWidth="2" strokeLinecap="square" fill="none" />
      <path d="M17 31c-3.500-5 3-8 0-13s2-9 0-14" stroke={smoke} strokeWidth="2.200" strokeLinecap="round" fill="none" />
      <path d="M17.500 19c5-1 9-5.500 12.500-12M19 19.500c4 2.500 8.500 6 11 11.500" stroke={smoke} strokeWidth="2.200" strokeLinecap="round" fill="none" />
    </>
  ),
  B: (smoke, ink) => (
    <>
      <rect x="20" y="6" width="8" height="5" fill={ink} />
      <path d="M22.500 11v4M25.500 11v4" stroke={ink} strokeWidth="1.600" />
      <rect x="11" y="15" width="26" height="29" stroke={ink} strokeWidth="2" fill="none" />
      <path d="M24 38c-5.500-4.500 5-7.500 0-12s3-7-1-19" stroke={smoke} strokeWidth="2.200" strokeLinecap="round" fill="none" />
    </>
  ),
  C: (smoke, ink) => (
    <>
      <path d="M14 6v36" stroke={ink} strokeWidth="2.600" strokeLinecap="square" />
      <path d="M14 27L33 10M21 22l14 20" stroke={ink} strokeWidth="2.600" strokeLinecap="square" fill="none" />
      <path d="M36 5c-2.500 2.500 2.500 4.500 0 7" stroke={smoke} strokeWidth="2.200" strokeLinecap="round" fill="none" />
    </>
  ),
};

// `inkColor` / `smokeColor` override the palette (static files can't use CSS variables).
export default function KyphiraMark({ variant = "A", size = 40, tone = "ink", title, inkColor, smokeColor }) {
  const ink = inkColor ?? (tone === "reversed" ? COLORS.onInk : COLORS.ink);
  const smoke = smokeColor ?? (tone === "mono" ? ink : COLORS.resin);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : "true"} focusable="false">
      {SHAPES[variant](smoke, ink)}
    </svg>
  );
}

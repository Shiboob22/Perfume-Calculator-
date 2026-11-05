import { STRENGTHS } from "../formulation";

// Strength tiers for the Bench strength picker, built on the handbook's four
// named strengths (Vol. III Formulation, Sections 02–03). Owner's decision
// (Bench SaaS round, option A): the prototype's tier layout, but with the
// handbook strengths, not the five-tier EdC–Extrait ladder.
//
// A tier holds every concentration above the previous strength, up to and
// including its own: EDT ≤ 15, EDP 15–20, EDP Intense 20–25, Extrait 25–30.
// Tapping a tier sets its strength. Anything above 30 % (or not a number)
// reads as the top tier, as in the prototype; the calculator's own
// warnings cover out-of-range values.

export interface StrengthTier {
  name: (typeof STRENGTHS)[number]["name"];
  /** Exclusive lower bound, % (the previous strength; 0 for the first). */
  min: number;
  /** Inclusive upper bound, % (the tier's own strength). */
  max: number;
  /** The concentration a tap sets, % (the handbook strength). */
  pct: number;
}

export const STRENGTH_TIERS: readonly StrengthTier[] = STRENGTHS.map((s, i) => ({
  name: s.name,
  min: i === 0 ? 0 : STRENGTHS[i - 1].pct,
  max: s.pct,
  pct: s.pct,
}));

export function tierFor(pct: unknown): StrengthTier {
  const p = Number(pct);
  return STRENGTH_TIERS.find((t) => p <= t.max) ?? STRENGTH_TIERS[STRENGTH_TIERS.length - 1];
}

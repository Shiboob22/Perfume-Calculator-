import type { Amounts, Basis, Densities } from "./types";
import { round2 } from "./round";

// Concentration C (a fraction) means "share of oil" on the basis the batch
// was specified in: by volume for mL / fl oz, by weight for g / oz. The
// handbook's method is by volume: oil volume = V × C, oil mass = V × C × ρoil.

/** A blend of total volume V (mL) at concentration C by volume. */
export function byVolume(totalMl: number, c: number, d: Densities): Amounts {
  const oilMl = totalMl * c;
  const ethanolMl = totalMl * (1 - c);
  const oilG = oilMl * d.oil;
  const ethanolG = ethanolMl * d.ethanol;
  return { oilG, oilMl, ethanolG, ethanolMl, totalG: oilG + ethanolG, totalMl };
}

/** A blend of total weight W (g) at concentration C by weight. */
export function byWeight(totalG: number, c: number, d: Densities): Amounts {
  const oilG = totalG * c;
  const ethanolG = totalG * (1 - c);
  const oilMl = oilG / d.oil;
  const ethanolMl = ethanolG / d.ethanol;
  return { oilG, oilMl, ethanolG, ethanolMl, totalG, totalMl: oilMl + ethanolMl };
}

/** A blend from its two component weights. */
export function fromWeights(oilG: number, ethanolG: number, d: Densities): Amounts {
  const oilMl = oilG / d.oil;
  const ethanolMl = ethanolG / d.ethanol;
  return { oilG, oilMl, ethanolG, ethanolMl, totalG: oilG + ethanolG, totalMl: oilMl + ethanolMl };
}

/** The oil share of a blend on a basis, as a fraction. */
export function concentrationOf(a: Amounts, basis: Basis): number {
  const oil = basis === "volume" ? a.oilMl : a.oilG;
  const total = basis === "volume" ? a.totalMl : a.totalG;
  return total > 0 ? oil / total : NaN;
}

/**
 * What the scale shows: each pour rounded to 0.01 g, and the total as the
 * sum of the two rounded pours — which is how the handbook's quick-reference
 * table prints it (30 ml at 15%: 4.28 + 20.66 = 24.94, not round(24.93)).
 */
export function displayed(a: Amounts) {
  const oilG = round2(a.oilG);
  const ethanolG = round2(a.ethanolG);
  return {
    oilG,
    ethanolG,
    totalG: round2(oilG + ethanolG),
    oilMl: round2(a.oilMl),
    ethanolMl: round2(a.ethanolMl),
    totalMl: round2(a.totalMl),
  };
}

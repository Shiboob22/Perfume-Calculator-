import type { Densities } from "./types";

// The same blend expressed on the other basis. A fraction C by volume is
// C·ρoil / (C·ρoil + (1−C)·ρethanol) by weight: 25% by volume at 0.95/0.81
// is 28.11% by weight.

export function volumeToWeightFraction(c: number, d: Densities): number {
  const oil = c * d.oil;
  const eth = (1 - c) * d.ethanol;
  return oil + eth > 0 ? oil / (oil + eth) : NaN;
}

export function weightToVolumeFraction(c: number, d: Densities): number {
  const oil = c / d.oil;
  const eth = (1 - c) / d.ethanol;
  return oil + eth > 0 ? oil / (oil + eth) : NaN;
}

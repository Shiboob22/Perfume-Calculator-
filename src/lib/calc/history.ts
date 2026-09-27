import type { Basis } from "./types";

// A logged batch as stored (numbers may arrive as strings from Postgres).
export interface BatchRow {
  oil_g: number | string;
  oil_ml: number | string;
  ethanol_g: number | string;
  ethanol_ml: number | string;
  actual_oil_g?: number | string | null;
  actual_ethanol_g?: number | string | null;
  basis?: Basis | null;
  oil_density?: number | string | null;
  ethanol_density?: number | string | null;
}

/**
 * The strength a logged batch really came out at, from its recorded pours,
 * on the batch's own basis. Batches logged before the basis was stored are
 * treated as by volume (what the app assumed then) and say so: basisKnown
 * is false. Null when the actual pour wasn't recorded.
 */
export function actualStrength(b: BatchRow): { pct: number; basis: Basis; basisKnown: boolean } | null {
  const oilG = Number(b.actual_oil_g);
  const ethG = Number(b.actual_ethanol_g);
  if (!(oilG > 0 && ethG > 0)) return null;
  const basis: Basis = b.basis === "weight" ? "weight" : "volume";
  if (basis === "weight") return { pct: (oilG / (oilG + ethG)) * 100, basis, basisKnown: true };
  // By volume: the densities stored with the batch, else the ones implied by
  // its planned grams and millilitres.
  const oilDensity = Number(b.oil_density) || Number(b.oil_g) / Number(b.oil_ml) || 1;
  const ethDensity = Number(b.ethanol_density) || Number(b.ethanol_g) / Number(b.ethanol_ml) || 1;
  const oilMl = oilG / oilDensity;
  const ethMl = ethG / ethDensity;
  return { pct: (oilMl / (oilMl + ethMl)) * 100, basis, basisKnown: b.basis === "volume" };
}

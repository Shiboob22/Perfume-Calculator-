import type { Amounts, Basis, Densities, Warning } from "./types";
import { byVolume, byWeight, fromWeights, concentrationOf, displayed } from "./blend";
import { isVolumeUnit, toBase, type Unit } from "./units";

// The four ways to ask for a blend. Concentrations come in as percentages
// (25 = 25%); every result says which basis and densities it used.

export interface Solution {
  basis: Basis;
  concentration: number; // percent, on `basis`
  densities: Densities;
  exact: Amounts;
  shown: ReturnType<typeof displayed>;
}

function solution(basis: Basis, pct: number, d: Densities, exact: Amounts): Solution {
  return { basis, concentration: pct, densities: d, exact, shown: displayed(exact) };
}

// ------------------------------------------------------------------ mode a
/**
 * Bottle size + concentration → oil and alcohol. The basis follows the unit:
 * mL / fl oz → by volume (the handbook's method), g / oz → by weight.
 */
export function solveBottle(amount: number, unit: Unit, pct: number, d: Densities): Solution {
  const c = pct / 100;
  const base = toBase(amount, unit);
  return isVolumeUnit(unit)
    ? solution("volume", pct, d, byVolume(base, c, d))
    : solution("weight", pct, d, byWeight(base, c, d));
}

// ------------------------------------------------------------------ mode b
export interface FromOil extends Solution {
  /** Whole bottles of `bottleMl` this blend fills, and what's left over. */
  bottles: number | null;
  leftoverMl: number | null;
}

/** Oil on hand (g) + concentration → the alcohol it needs and what it fills. */
export function solveFromOil(oilG: number, pct: number, basis: Basis, d: Densities, bottleMl?: number): FromOil {
  const c = pct / 100;
  const exact = basis === "volume"
    ? byVolume(oilG / d.oil / c, c, d)
    : byWeight(oilG / c, c, d);
  const bottles = bottleMl && bottleMl > 0 ? Math.floor(Number((exact.totalMl / bottleMl).toPrecision(12))) : null;
  const leftoverMl = bottles === null ? null : exact.totalMl - bottles * (bottleMl as number);
  return { ...solution(basis, pct, d, exact), bottles, leftoverMl };
}

// ------------------------------------------------------------------ mode c
export interface Adjustment {
  basis: Basis;
  from: number; // percent
  to: number; // percent
  /** What to add: never a removal. */
  add: { material: "oil" | "ethanol" | null; grams: number; ml: number };
  result: Amounts;
  /** False when a limit (capacity, oil on hand) stops the target being reached. */
  reachable: boolean;
  /** When unreachable: the closest concentration within the limit, in percent. */
  closest: number | null;
  limit: "capacity" | "oil" | null;
}

/**
 * An existing blend at A% → B%, only ever by adding: more oil raises the
 * concentration, more alcohol lowers it. The handbook says not to correct by
 * removing material, so without limits every target is reachable; a bottle's
 * capacity (mL) or the oil you have left (g) can make it unreachable, and then
 * the closest reachable concentration is given instead.
 */
export function adjustConcentration(
  current: Amounts,
  targetPct: number,
  basis: Basis,
  d: Densities,
  limits: { capacityMl?: number; oilAvailableG?: number } = {},
): Adjustment {
  const B = targetPct / 100;
  const fromPct = concentrationOf(current, basis) * 100;
  if (!(B > 0 && B < 1)) {
    // 0% and 100% can only be approached, never reached, by adding.
    return { basis, from: fromPct, to: targetPct, add: { material: null, grams: 0, ml: 0 }, result: current, reachable: false, closest: null, limit: null };
  }
  const vol = basis === "volume";
  const oil = vol ? current.oilMl : current.oilG;
  const total = vol ? current.totalMl : current.totalG;
  const toMl = (material: "oil" | "ethanol", amount: number) => (vol ? amount : amount / d[material]);
  const toG = (material: "oil" | "ethanol", amount: number) => (vol ? amount * d[material] : amount);

  let material: "oil" | "ethanol" | null = null;
  let amount = 0; // in the basis unit (mL by volume, g by weight)
  if (B > oil / total) {
    material = "oil";
    amount = (B * total - oil) / (1 - B);
  } else if (B < oil / total) {
    material = "ethanol";
    amount = oil / B - total;
  }

  // Limits: how much of the material may be added at most.
  let max = Infinity;
  let limit: Adjustment["limit"] = null;
  if (material && limits.capacityMl != null) {
    const roomMl = Math.max(limits.capacityMl - current.totalMl, 0);
    const byCapacity = vol ? roomMl : roomMl * d[material];
    if (byCapacity < max) { max = byCapacity; limit = "capacity"; }
  }
  if (material === "oil" && limits.oilAvailableG != null) {
    const byOil = vol ? limits.oilAvailableG / d.oil : limits.oilAvailableG;
    if (byOil < max) { max = byOil; limit = "oil"; }
  }

  const reachable = amount <= max + 1e-9;
  const added = reachable ? amount : max;
  const grams = material ? toG(material, added) : 0;
  const result = fromWeights(
    current.oilG + (material === "oil" ? grams : 0),
    current.ethanolG + (material === "ethanol" ? grams : 0),
    d,
  );
  return {
    basis,
    from: fromPct,
    to: targetPct,
    add: { material, grams, ml: material ? toMl(material, added) : 0 },
    result,
    reachable,
    closest: reachable ? null : concentrationOf(result, basis) * 100,
    limit: reachable ? null : limit,
  };
}

// ------------------------------------------------------------------ mode d
export interface RunLine {
  sizeMl: number;
  count: number;
}

export interface Run extends Solution {
  lines: RunLine[];
  /** Nominal volume of all bottles, before overfill. */
  bottlesMl: number;
  overfillPct: number;
  /** Each bottle's pour of the mixed blend, by volume and weight. */
  perBottle: { sizeMl: number; count: number; ml: number; g: number }[];
}

/**
 * Several bottles from one mix (e.g. 3 × 50 mL + 2 × 10 mL), with an optional
 * overfill percentage to cover what is lost in transfer.
 */
export function solveRun(lines: RunLine[], pct: number, d: Densities, overfillPct = 0): Run {
  const clean = lines.filter((l) => l.sizeMl > 0 && l.count > 0);
  const bottlesMl = clean.reduce((s, l) => s + l.sizeMl * l.count, 0);
  const mixMl = bottlesMl * (1 + overfillPct / 100);
  const sol = solveBottle(mixMl, "ml", pct, d);
  const gPerMl = sol.exact.totalMl > 0 ? sol.exact.totalG / sol.exact.totalMl : 0;
  return {
    ...sol,
    lines: clean,
    bottlesMl,
    overfillPct,
    perBottle: clean.map((l) => ({ sizeMl: l.sizeMl, count: l.count, ml: l.sizeMl, g: l.sizeMl * gPerMl })),
  };
}

// ---------------------------------------------------------------- warnings
export interface Limits {
  /** Recommended concentration range for the family, percent; null if none. */
  range?: readonly [number, number] | null;
  /** Plausible density bounds, g/mL. */
  oilDensity: readonly [number, number];
  ethanolDensity: readonly [number, number];
}

/**
 * Anything worth saying before the user pours. Quiet in normal use: an empty
 * list means nothing looks off.
 */
export function checkInputs(amount: number, pct: number, d: Densities, limits: Limits): Warning[] {
  const w: Warning[] = [];
  if (!(amount > 0)) w.push({ code: "amount_not_positive" });
  if (!(pct > 0) || pct >= 100) w.push({ code: "concentration_out_of_bounds", pct });
  else if (limits.range && (pct < limits.range[0] || pct > limits.range[1])) {
    w.push({ code: "outside_family_range", pct, min: limits.range[0], max: limits.range[1] });
  }
  if (!(d.oil >= limits.oilDensity[0] && d.oil <= limits.oilDensity[1])) {
    w.push({ code: "oil_density_implausible", density: d.oil, min: limits.oilDensity[0], max: limits.oilDensity[1] });
  }
  if (!(d.ethanol >= limits.ethanolDensity[0] && d.ethanol <= limits.ethanolDensity[1])) {
    w.push({ code: "ethanol_density_implausible", density: d.ethanol, min: limits.ethanolDensity[0], max: limits.ethanolDensity[1] });
  }
  return w;
}

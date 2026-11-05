// A blend: several materials make up the concentrate, each as a share of the
// concentrate by weight. The concentrate then takes the place of the single
// oil in every batch calculation, with the blend's density as the oil
// density, so the oil/ethanol split stays exact.
//
// The densities per material type are typical bench starting points, not
// handbook values (owner's decision, 2026-11-05): labelled as estimates in
// the UI, the same way the family densities are. A measured density wins.

export type IngredientType = "eo" | "aroma" | "absolute" | "fixative" | "dpg";

/** Typical density per material type, g/mL. */
export const INGREDIENT_TYPES: Readonly<Record<IngredientType, { density: number }>> = Object.freeze({
  eo: { density: 0.9 }, // essential oil
  aroma: { density: 1.0 }, // aroma chemical
  absolute: { density: 1.02 },
  fixative: { density: 1.05 },
  dpg: { density: 1.02 }, // dipropylene glycol, a diluent
});

export const INGREDIENT_KEYS = Object.keys(INGREDIENT_TYPES) as IngredientType[];

export interface Ingredient {
  id?: string | number;
  name?: string;
  type?: string;
  /** Share of the concentrate by weight, in %. Need not add up to 100. */
  pct: number | string;
  /** Price per gram, in the user's currency. */
  price?: number | string | null;
}

export interface MixPart {
  id?: string | number;
  /** Normalised weight share, 0–1. */
  w: number;
  /** Density used for this material, g/mL. */
  rho: number;
}

export interface Mix {
  /** Sum of the positive shares as entered, in %. */
  sum: number;
  /** Blend density, g/mL; null when no material has a positive share. */
  density: number | null;
  /** Weighted price per gram of concentrate; 0 when there is nothing to price. */
  avgPrice: number;
  /** The materials with a positive share, in input order. */
  parts: MixPart[];
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** The density for a material type; an unknown type counts as an essential oil. */
export function densityOf(type: unknown): number {
  return (INGREDIENT_TYPES as Record<string, { density: number }>)[String(type)]?.density ?? INGREDIENT_TYPES.eo.density;
}

/** The share each material would have once scaled to 100 %, 0–1. */
function shareOf(i: Ingredient, sum: number) {
  const p = num(i.pct);
  return sum > 0 && p > 0 ? p / sum : 0;
}

function positiveSum(list: readonly Ingredient[]) {
  return list.reduce((a, i) => a + Math.max(num(i.pct), 0), 0);
}

/**
 * Normalise the shares to 100 % and give the blend's density,
 * 1 / Σ(wᵢ / ρᵢ) (weights add, volumes add), and its price per gram,
 * Σ(wᵢ × priceᵢ). Materials at zero or below are left out. Never throws.
 */
export function blendMix(list: readonly Ingredient[] | null | undefined): Mix {
  const items = Array.isArray(list) ? list : [];
  const sum = positiveSum(items);
  if (!(sum > 0)) return { sum: 0, density: null, avgPrice: 0, parts: [] };
  let inverse = 0;
  let price = 0;
  const parts: MixPart[] = [];
  for (const i of items) {
    const w = shareOf(i, sum);
    if (w <= 0) continue;
    const rho = densityOf(i.type);
    inverse += w / rho;
    price += w * Math.max(num(i.price), 0);
    parts.push({ id: i.id, w, rho });
  }
  return { sum, density: 1 / inverse, avgPrice: price, parts };
}

/**
 * Grams and millilitres of each material in `concentrateG` of concentrate,
 * in input order (0 for a material with no positive share).
 */
export function ingredientAmounts(concentrateG: number, list: readonly Ingredient[] | null | undefined) {
  const items = Array.isArray(list) ? list : [];
  const sum = positiveSum(items);
  const total = Math.max(num(concentrateG), 0);
  return items.map((i) => {
    const share = shareOf(i, sum);
    const g = total * share;
    return { id: i.id, share, g, ml: g / densityOf(i.type) };
  });
}

/**
 * "Balance to 100 %": each share scaled to 100 and rounded to 0.1, with the
 * rounding remainder given to the largest share so the list adds to exactly
 * 100. Shares at zero or below become 0. A list with nothing positive comes
 * back unchanged.
 */
export function balanceShares<T extends Ingredient>(list: readonly T[]): T[] {
  const sum = positiveSum(list);
  if (!(sum > 0)) return list.slice();
  const tenth = (x: number) => Math.round(Number((x * 10).toPrecision(12))) / 10;
  const next = list.map((i) => ({ ...i, pct: tenth(shareOf(i, sum) * 100) }) as T & { pct: number });
  const total = next.reduce((a, i) => a + i.pct, 0);
  const big = next.reduce((b, i, n) => (i.pct > next[b].pct ? n : b), 0);
  next[big] = { ...next[big], pct: tenth(next[big].pct + 100 - total) };
  return next as T[];
}

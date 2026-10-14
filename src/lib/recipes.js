// Saved recipes with versions (migration 0023). A recipe is a name; every
// save of its settings is a new immutable version (v1, v2, …). Pure helpers:
// the calculator and the Journal only call these and format.
import { cleanName } from "./cleanName.js";

export const MAX_RECIPES = 50;
export const MAX_VERSIONS = 100;

const near = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;
// The densities a version was made with are stored as used (a measured
// density wins over the family's), so it restores the same grams later even
// if the presets change. Blank or invalid means "use the default".
const dens = (v) => (Number(v) > 0 ? Number(v) : null);

/** The version with the highest number, or null. */
export function latestVersion(recipe) {
  const versions = recipe?.recipe_versions ?? [];
  return versions.reduce((best, v) => (!best || v.version > best.version ? v : best), null);
}

/** What a version restores in the calculator. */
export function versionSettings(recipe, version) {
  return {
    family: recipe.family ?? null,
    size: Number(version.amount),
    unit: version.unit,
    conc: Number(version.concentration_pct),
    oilDensity: dens(version.oil_density),
    ethanolDensity: dens(version.ethanol_density),
    note: version.note ?? "",
  };
}

/** The row for a new version, from the calculator's current settings. */
export function versionRow({ amount, unit, concPct, oilDensity, ethanolDensity, note }) {
  const text = typeof note === "string" ? note.trim().slice(0, 500) : "";
  return {
    amount: Number(amount),
    unit,
    concentration_pct: Number(concPct),
    oil_density: dens(oilDensity),
    ethanol_density: dens(ethanolDensity),
    note: text || null,
  };
}

/** Whether the calculator still holds exactly what the version stored. */
export function matchesVersion(version, { amount, unit, concPct, oilDensity, ethanolDensity }) {
  if (!version) return false;
  const same = (stored, now) => (stored == null ? true : near(stored, now));
  return near(version.amount, amount) && version.unit === unit && near(version.concentration_pct, concPct)
    && same(version.oil_density, oilDensity) && same(version.ethanol_density, ethanolDensity);
}

/** versionId → { name, version } for every version of every recipe. */
export function versionIndex(recipes) {
  const out = new Map();
  for (const r of recipes || []) for (const v of r.recipe_versions ?? []) out.set(v.id, { name: r.name, version: v.version, recipeId: r.id });
  return out;
}

/** "Oud Nights v3", for the batch card and the picker. */
export function recipeLabel(entry) {
  return entry ? `${entry.name} v${entry.version}` : "";
}

/** A recipe's name as it will be saved, or null when it is empty. */
export function recipeName(raw) {
  const n = cleanName(raw);
  return n && n.length <= 80 ? n : null;
}

/** Why a new recipe or version can't be saved yet: a code for the UI, or null. */
export function recipeLimit(recipes, activeRecipe) {
  if (activeRecipe) return (activeRecipe.recipe_versions?.length ?? 0) >= MAX_VERSIONS ? "versions" : null;
  return (recipes?.length ?? 0) >= MAX_RECIPES ? "recipes" : null;
}

// Family table for the UI, derived from src/lib/formulation.ts — the single
// source of every blending number. Edit numbers there, not here.
import { FAMILIES, ML_PER_FLOZ, G_PER_OZ, ETHANOL_DENSITY } from "./formulation";

export const TIERS = Object.fromEntries(
  Object.values(FAMILIES).map((f) => [
    f.key,
    { label: f.label, sub: f.sub, note: f.note, density: f.active.density, defaultConc: f.active.defaultConc, restDays: f.active.restDays },
  ])
);

export const TIER_COLORS = {
  fresh:    '#7E9A7C',
  floral:   '#B98C93',
  woody:    '#6E6248',
  gourmand: '#A9793C',
  oriental: '#5B3A2E'
};

export const TIER_INITIAL = { fresh:'F', floral:'B', woody:'W', gourmand:'G', oriental:'A' };

export { ML_PER_FLOZ, G_PER_OZ };
export const ETHANOL_DENSITY_DEFAULT = ETHANOL_DENSITY; // g/mL for 96% ethanol

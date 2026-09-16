// Ported from the HTML tool (scent-handbook-blending-bench.html) so the
// two stay consistent instead of diverging. Structure sourced from
// Michael Edwards' Fragrance Wheel (4 main families, 14 subfamilies);
// Gourmand is a clearly-separate practical 5th tier, not part of that
// wheel — see the HTML tool's TIERS comment for the full rationale.
export const TIERS = {
  fresh:    { label:'Fresh',   sub:'Aromatic · Citrus · Water · Green · Fruity',  density:0.87, defaultConc:20,
              note:'Rest 1–2 weeks in a cool, dark place — light citrus and aromatic tops settle fastest.' },
  floral:   { label:'Floral',  sub:'Floral · Soft Floral · Floral Amber',         density:0.95, defaultConc:25,
              note:'Rest 2–3 weeks in a cool, dark place before wearing — the classic all-purpose strength.' },
  woody:    { label:'Woody',   sub:'Woods · Mossy Woods · Dry Woods',             density:0.93, defaultConc:22,
              note:'Rest 3–4 weeks in a cool, dark place — dry woods and mosses need time to round out.' },
  oriental: { label:'Amber (Oriental)', sub:'Soft Amber · Amber · Woody Amber',   density:1.02, defaultConc:30,
              note:'Rest 4–6 weeks in a cool, dark place — dense resins need the longest maceration.' },
  gourmand: { label:'Gourmand',  sub:'Vanilla · Praline · Tobacco-Honey — practical addition, not part of the classic wheel', density:1.00, defaultConc:25,
              note:'Rest 3–4 weeks — sweet resinous bases round out and lose the raw alcohol edge.' }
};

export const TIER_COLORS = {
  fresh:    '#7E9A7C',
  floral:   '#B98C93',
  woody:    '#6E6248',
  gourmand: '#A9793C',
  oriental: '#5B3A2E'
};

export const TIER_INITIAL = { fresh:'F', floral:'B', woody:'W', gourmand:'G', oriental:'A' };

// US fluid ounce (volume) and avoirdupois ounce (weight)
export const ML_PER_FLOZ = 29.5735;
export const G_PER_OZ = 28.3495;

export const ETHANOL_DENSITY_DEFAULT = 0.81; // g/mL for 96% ethanol

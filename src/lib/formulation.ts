// The one source of truth for every blending number in the app.
//
// Three sources disagreed: The Scent Handbook Vol. III Formulation, the
// family table ported from the old HTML tool (formerly tiers.js), and
// data/perfume-ratios.json. All three are recorded below, per family, as
// `sources`. The values the app USES are `active`, and they are still
// today's values (the HTML-tool table) until the owner decides each
// difference: run `npm run numbers:diff` for the list.
//
// The handbook's rule stands regardless: reference densities are starting
// points, and a measured density always wins.

export type TierKey = "fresh" | "floral" | "woody" | "oriental" | "gourmand";
export type Range = readonly [number, number];

export interface FamilyValues {
  /** Oil density, g/mL. */
  density: number;
  /** Concentration the calculator starts at, % oil. */
  defaultConc: number;
  /** Maceration, [min, max] days. */
  restDays: Range;
  /** Recommended concentration range, % oil; null where no source gives one. */
  range: Range | null;
}

export interface Family {
  key: TierKey;
  label: string;
  sub: string;
  note: string;
  /** What the app uses today. */
  active: FamilyValues;
  /** What each source says; a missing key means that source is silent. */
  sources: {
    handbook: Partial<FamilyValues>;
    htmlTool: Partial<FamilyValues>;
    ratiosJson: Partial<FamilyValues> & { name?: string };
  };
}

/** Vol. III Formulation, Section 01: bench starting points, not constants. */
export const REFERENCE = {
  oilDensity: 0.95,
  ethanolDensity: 0.81,
  source: "The Scent Handbook, Vol. III Formulation, Section 01",
} as const;

/** 96% ethanol density the app uses (all sources agree). */
export const ETHANOL_DENSITY = REFERENCE.ethanolDensity;

/** Vol. III Formulation, Sections 02–03. */
export const STRENGTHS = [
  { pct: 15, name: "EDT" },
  { pct: 20, name: "EDP" },
  { pct: 25, name: "EDP Intense" },
  { pct: 30, name: "Extrait" },
] as const;

// US fluid ounce (volume) and avoirdupois ounce (weight).
export const ML_PER_FLOZ = 29.5735;
export const G_PER_OZ = 28.3495;

const handbookOil = { density: REFERENCE.oilDensity } as const;

export const FAMILIES: Record<TierKey, Family> = {
  fresh: {
    key: "fresh",
    label: "Fresh",
    sub: "Aromatic · Citrus · Water · Green · Fruity",
    note: "Rest 1–2 weeks in a cool, dark place — light citrus and aromatic tops settle fastest.",
    active: { density: 0.87, defaultConc: 20, restDays: [7, 14], range: null },
    sources: {
      handbook: handbookOil,
      htmlTool: { density: 0.87, defaultConc: 20, restDays: [7, 14] },
      ratiosJson: { name: "Citrus / Fresh / Hesperidic", range: [15, 18] },
    },
  },
  floral: {
    key: "floral",
    label: "Floral",
    sub: "Floral · Soft Floral · Floral Amber",
    note: "Rest 2–3 weeks in a cool, dark place before wearing — the classic all-purpose strength.",
    active: { density: 0.95, defaultConc: 25, restDays: [14, 21], range: null },
    sources: {
      handbook: handbookOil,
      htmlTool: { density: 0.95, defaultConc: 25, restDays: [14, 21] },
      // The JSON splits Floral in two: Light/Soft/White 18–22, Gourmand/Amber 20–25.
      ratiosJson: { name: "Floral (Light / Soft / White) + Floral (Gourmand / Amber)", range: [18, 25] },
    },
  },
  woody: {
    key: "woody",
    label: "Woody",
    sub: "Woods · Mossy Woods · Dry Woods",
    note: "Rest 3–4 weeks in a cool, dark place — dry woods and mosses need time to round out.",
    active: { density: 0.93, defaultConc: 22, restDays: [21, 28], range: null },
    sources: {
      handbook: handbookOil,
      htmlTool: { density: 0.93, defaultConc: 22, restDays: [21, 28] },
      ratiosJson: { name: "Woody / Chypre / Leather", range: [20, 24] },
    },
  },
  oriental: {
    key: "oriental",
    label: "Amber (Oriental)",
    sub: "Soft Amber · Amber · Woody Amber",
    note: "Rest 4–6 weeks in a cool, dark place — dense resins need the longest maceration.",
    active: { density: 1.02, defaultConc: 30, restDays: [28, 42], range: null },
    sources: {
      handbook: handbookOil,
      htmlTool: { density: 1.02, defaultConc: 30, restDays: [28, 42] },
      ratiosJson: { name: "Amber / Oriental / Spice", range: [22, 28] },
    },
  },
  gourmand: {
    key: "gourmand",
    label: "Gourmand",
    sub: "Vanilla · Praline · Tobacco-Honey — practical addition, not part of the classic wheel",
    note: "Rest 3–4 weeks — sweet resinous bases round out and lose the raw alcohol edge.",
    active: { density: 1.0, defaultConc: 25, restDays: [21, 28], range: null },
    sources: {
      handbook: handbookOil,
      htmlTool: { density: 1.0, defaultConc: 25, restDays: [21, 28] },
      ratiosJson: { name: "Gourmand / Vanilla", range: [20, 25] },
    },
  },
};

export const TIER_KEYS = Object.keys(FAMILIES) as TierKey[];

export interface Difference {
  family: TierKey;
  field: keyof FamilyValues;
  active: unknown;
  handbook: unknown;
  htmlTool: unknown;
  ratiosJson: unknown;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Every family value where a source says something other than what's active. */
export function differences(): Difference[] {
  const out: Difference[] = [];
  for (const f of Object.values(FAMILIES)) {
    for (const field of ["density", "defaultConc", "restDays", "range"] as const) {
      const vals = [f.sources.handbook[field], f.sources.htmlTool[field], f.sources.ratiosJson[field]];
      if (vals.some((v) => v !== undefined && !same(v, f.active[field]))) {
        out.push({
          family: f.key,
          field,
          active: f.active[field],
          handbook: f.sources.handbook[field],
          htmlTool: f.sources.htmlTool[field],
          ratiosJson: f.sources.ratiosJson[field],
        });
      }
    }
  }
  return out;
}

/** A plain-text guide to the families, e.g. for AI system prompts. */
export function familyGuide(): string {
  return Object.values(FAMILIES)
    .map((f) => {
      const a = f.active;
      return `${f.key} — ${f.label} (${f.sub.split(" — ")[0].replace(/ · /g, ", ")}). Oil density ${a.density} g/mL, default ${a.defaultConc}%, rest ${a.restDays[0] / 7}–${a.restDays[1] / 7} weeks.`;
    })
    .join("\n");
}

// Scent Selector: vocabulary, weights and the SOURCE -> DERIVED mappings.
//
// SOURCE DATA is what the catalog stores per fragrance: accords (ranked by
// strength), top/middle/base notes, olfactory_family text. DERIVED SELECTOR
// DATA is computed from those through the tables below. The catalog has no
// sensory, mood or occasion data, so those values are conventions: each
// accord carries a rough sensory signature on a 0-100 scale, and a
// fragrance's values are the rank-weighted average over its accords. They
// are ordering aids for a recommendation, not measurements; every table is
// here so they can be reviewed and tuned in one place.

export const FAMILY_KEYS = ["fresh", "floral", "fruity", "woody", "amber", "gourmand", "chypre", "musky"] as const;
export type FamilyKey = (typeof FAMILY_KEYS)[number];

export const SENSORY_KEYS = [
  "freshness", "sweetness", "density", "darkness", "cleanliness",
  "intensity", "novelty", "warmth", "dryness", "sensuality",
] as const;
export type SensoryKey = (typeof SENSORY_KEYS)[number];

export const MOOD_KEYS = ["energy", "presence", "warmth", "sensuality", "novelty"] as const;
export type MoodKey = (typeof MOOD_KEYS)[number];

export const CONTEXT_KEYS = ["office", "casual", "date", "evening", "formal", "outdoor", "home"] as const;
export type ContextKey = (typeof CONTEXT_KEYS)[number];

export type FamilyProfile = Record<FamilyKey, number>; // proportions, sum 1 (or all 0)
export type SensoryProfile = Record<SensoryKey, number>; // 0-100
export type MoodProfile = Record<MoodKey, number>; // 0-100
export type ContextProfile = Record<ContextKey, number>; // 0-1 suitability

export const SCORE_COMPONENTS = ["family", "sensory", "knownFragrance", "mood", "occasion", "climate", "intensity"] as const;
export type ScoreComponent = (typeof SCORE_COMPONENTS)[number];

export const SELECTOR_WEIGHTS: Record<ScoreComponent, number> = {
  family: 0.3,
  sensory: 0.25,
  knownFragrance: 0.2,
  mood: 0.1,
  occasion: 0.075,
  climate: 0.05,
  intensity: 0.025,
};

export const SCORING = {
  /** Mean absolute difference (0-100) at which a sensory/mood match reads 0. */
  zeroAtDiff: 50,
  /** Cosine similarity mapped to 0 and 1 for the known-fragrance component. */
  similarityFloor: 0.55,
  similarityCeil: 0.95,
  /** Loved fragrances averaged (nearest first). */
  lovedTopN: 3,
  dislikeWeight: 0.7,
  /** Base for "only dislikes were given": unrelated to them scores this. */
  dislikeOnlyBase: 0.7,
  /** Largest cut for a fragrance that breaks the climate/projection limit. */
  constraintMaxPenalty: 0.25,
  /** Largest cut for avoided traits (combined over all of them). */
  avoidMaxPenalty: 0.35,
  /** An avoided trait is mentioned as a caution above this strength. */
  cautionAt: 0.35,
  /** Accord rank weight: the n-th accord counts rankDecay^n. */
  rankDecay: 0.82,
  /** Share of the family text blended into accord-derived families. */
  familyTextShare: 0.25,
  /** Candidates with less source data than this are not ranked. */
  minConfidence: 0.5,
  candidateLimit: 700,
  resultLimit: 5,
  /** Weight of an explicit scale answer vs a picked option. */
  scaleWeight: 2,
};

// Accord -> family weights. Accords not listed contribute nothing.
export const ACCORD_FAMILY: Record<string, Partial<FamilyProfile>> = {
  Woody: { woody: 1 }, Citrus: { fresh: 1 }, Powdery: { musky: 0.6, floral: 0.4 }, Floral: { floral: 1 },
  Sweet: { gourmand: 0.6, amber: 0.4 }, Aromatic: { fresh: 0.7, woody: 0.3 }, Amber: { amber: 1 },
  "Warm Spicy": { amber: 0.8, woody: 0.2 }, Fruity: { fruity: 1 }, "Fresh Spicy": { fresh: 0.7, woody: 0.3 },
  Musky: { musky: 1 }, "White Floral": { floral: 1 }, Vanilla: { gourmand: 0.5, amber: 0.5 }, Fresh: { fresh: 1 },
  Green: { fresh: 0.8, chypre: 0.2 }, Rose: { floral: 1 }, Earthy: { woody: 0.5, chypre: 0.5 },
  Patchouli: { woody: 0.4, chypre: 0.4, amber: 0.2 }, Balsamic: { amber: 1 }, Animalic: { musky: 0.6, amber: 0.4 },
  "Soft Spicy": { amber: 0.6, floral: 0.2, gourmand: 0.2 }, Leather: { woody: 0.5, amber: 0.5 }, Aquatic: { fresh: 1 },
  Lavender: { fresh: 0.6, woody: 0.4 }, Herbal: { fresh: 0.8, chypre: 0.2 }, Violet: { floral: 0.7, musky: 0.3 },
  Iris: { floral: 0.6, musky: 0.4 }, Mossy: { chypre: 1 }, Oud: { woody: 0.5, amber: 0.5 }, "Yellow Floral": { floral: 1 },
  Smoky: { woody: 0.6, amber: 0.4 }, Tropical: { fruity: 1 }, Ozonic: { fresh: 1 }, Lactonic: { gourmand: 0.6, musky: 0.4 },
  Cinnamon: { amber: 0.7, gourmand: 0.3 }, Tuberose: { floral: 1 }, Tobacco: { amber: 0.6, woody: 0.4 }, Marine: { fresh: 1 },
  Honey: { gourmand: 0.6, amber: 0.4 }, Caramel: { gourmand: 1 }, Nutty: { gourmand: 0.7, woody: 0.3 }, Almond: { gourmand: 1 },
  Aldehydic: { floral: 0.5, fresh: 0.5 }, Coconut: { gourmand: 0.6, fruity: 0.4 }, Salty: { fresh: 0.7, musky: 0.3 },
  Metallic: { fresh: 1 }, Cacao: { gourmand: 1 }, Coffee: { gourmand: 0.8, woody: 0.2 }, Anis: { gourmand: 0.5, amber: 0.5 },
  Chocolate: { gourmand: 1 }, Cherry: { fruity: 0.6, gourmand: 0.4 }, Conifer: { woody: 0.5, fresh: 0.5 },
  Rum: { gourmand: 0.7, amber: 0.3 }, Soapy: { fresh: 0.6, musky: 0.4 }, Sour: { fruity: 0.5, fresh: 0.5 }, Mineral: { fresh: 1 },
  Camphor: { fresh: 1 }, Gourmand: { gourmand: 1 }, Whiskey: { gourmand: 0.5, amber: 0.5 }, Bitter: { chypre: 0.5, fresh: 0.5 },
  Savory: { gourmand: 0.5, woody: 0.5 }, Spicy: { amber: 0.7, woody: 0.3 }, Beeswax: { amber: 0.6, gourmand: 0.4 },
  Cannabis: { woody: 0.5, fresh: 0.5 }, Champagne: { fruity: 0.5, fresh: 0.5 }, Terpenic: { fresh: 1 },
  Sand: { musky: 0.6, woody: 0.4 }, Wine: { fruity: 0.5, gourmand: 0.5 }, Pear: { fruity: 1 },
};

// Accord -> sensory signature (0-100). Short keys: f freshness, s sweetness,
// d density, k darkness, c cleanliness, i intensity, n novelty, w warmth,
// y dryness, x sensuality. A dimension an accord doesn't define is ignored
// for that accord.
type Sig = Partial<Record<"f" | "s" | "d" | "k" | "c" | "i" | "n" | "w" | "y" | "x", number>>;
export const SIG_DIM = { f: "freshness", s: "sweetness", d: "density", k: "darkness", c: "cleanliness", i: "intensity", n: "novelty", w: "warmth", y: "dryness", x: "sensuality" } as const;
export const ACCORD_SENSORY: Record<string, Sig> = {
  Woody: { w: 55, y: 75, d: 60, k: 55, x: 40 }, Citrus: { f: 95, s: 30, d: 15, k: 10, c: 85, w: 15, i: 45, n: 20, y: 60 },
  Powdery: { c: 70, s: 45, d: 50, w: 60, x: 45, y: 65, n: 30 }, Floral: { f: 40, s: 50, d: 45, c: 60, w: 45, x: 55, n: 35, k: 25 },
  Sweet: { s: 95, d: 65, w: 75, f: 15, y: 10, x: 55, k: 35 }, Aromatic: { f: 70, y: 70, d: 40, c: 60, w: 35, n: 40, k: 30, s: 15 },
  Amber: { w: 95, d: 85, s: 65, k: 75, x: 70, y: 40, f: 5, i: 70 }, "Warm Spicy": { w: 90, d: 75, s: 45, k: 65, x: 65, i: 70, y: 55, n: 50 },
  Fruity: { s: 75, f: 60, d: 35, c: 50, w: 35, n: 35, k: 10, y: 15 }, "Fresh Spicy": { f: 65, w: 40, d: 45, y: 65, i: 55, n: 45, k: 30 },
  Musky: { c: 85, d: 55, w: 60, x: 75, s: 35, y: 55, k: 35, i: 35 }, "White Floral": { f: 30, s: 55, d: 60, w: 60, x: 75, k: 35, i: 65, c: 45 },
  Vanilla: { s: 95, w: 90, d: 70, k: 45, x: 70, y: 5, f: 5, i: 55 }, Fresh: { f: 95, c: 90, d: 15, w: 15, k: 5, s: 20, i: 40, y: 55 },
  Green: { f: 85, y: 70, d: 25, c: 60, w: 25, k: 15, s: 10, n: 40 }, Rose: { f: 35, s: 50, d: 55, w: 55, x: 70, k: 35, i: 55, y: 40, c: 45 },
  Earthy: { x: 35, d: 65, k: 80, y: 85, w: 50, f: 20, c: 20, n: 55, s: 10 }, Patchouli: { k: 80, d: 75, w: 65, y: 70, x: 60, s: 30, n: 50, i: 65, c: 15 },
  Balsamic: { w: 90, d: 85, s: 60, k: 70, y: 30, x: 60, i: 60 }, Animalic: { k: 95, d: 80, x: 95, w: 75, c: 5, n: 85, i: 80, s: 25 },
  "Soft Spicy": { w: 75, d: 55, s: 50, k: 45, x: 55, y: 45 }, Leather: { k: 85, d: 75, y: 80, w: 60, n: 55, i: 70, c: 20, s: 15, x: 65 },
  Aquatic: { f: 95, c: 90, d: 10, w: 5, k: 10, s: 10, i: 40, y: 40 }, Lavender: { f: 60, c: 75, y: 65, d: 35, w: 35, k: 25, s: 10 },
  Herbal: { f: 75, y: 80, d: 35, c: 55, n: 45, k: 30, s: 5 }, Violet: { f: 35, s: 55, d: 45, c: 55, w: 35, x: 30, y: 45, k: 25 },
  Iris: { f: 25, c: 65, d: 55, y: 75, w: 35, x: 35, k: 40, n: 45, s: 25 }, Mossy: { k: 75, y: 85, d: 60, f: 35, c: 25, n: 55, w: 35, s: 5 },
  Oud: { k: 95, d: 95, w: 80, y: 60, x: 75, n: 90, i: 90, s: 25, c: 5 }, "Yellow Floral": { s: 60, w: 60, d: 55, f: 30, x: 65, i: 60, k: 30 },
  Smoky: { k: 95, d: 80, y: 90, w: 60, n: 80, i: 75, s: 5, c: 10 }, Tropical: { s: 80, f: 55, d: 45, w: 50, n: 55, k: 10, y: 10 },
  Ozonic: { f: 95, c: 95, d: 5, w: 0, k: 5, i: 35, n: 40, s: 5 }, Lactonic: { s: 70, d: 60, w: 65, c: 50, x: 55, k: 20, y: 20 },
  Cinnamon: { w: 95, d: 70, s: 55, k: 60, i: 75, x: 55, y: 40 }, Tuberose: { s: 55, d: 85, w: 70, x: 90, i: 90, k: 40, c: 25, f: 10 },
  Tobacco: { k: 85, d: 75, w: 85, y: 55, s: 50, x: 65, n: 60, i: 70 }, Marine: { f: 90, c: 90, d: 10, w: 5, k: 15, s: 5, y: 50, n: 40 },
  Honey: { s: 95, w: 85, d: 80, k: 55, x: 75, y: 5, i: 65 }, Caramel: { s: 100, w: 90, d: 75, k: 45, y: 5, x: 65 },
  Nutty: { s: 60, w: 75, d: 65, k: 60, y: 55, n: 50 }, Almond: { s: 75, w: 75, d: 60, k: 40, y: 30, x: 50 },
  Aldehydic: { f: 75, c: 90, d: 30, w: 15, k: 10, s: 10, y: 55, n: 50, i: 60 }, Coconut: { s: 85, w: 70, d: 50, f: 30, c: 40, k: 10, x: 50 },
  Salty: { f: 75, c: 60, d: 35, w: 35, s: 5, y: 70, n: 60 }, Metallic: { f: 75, c: 70, d: 20, w: 10, k: 45, y: 85, n: 85, s: 0, i: 55 },
  Cacao: { s: 70, w: 80, d: 75, k: 75, y: 35, x: 65 }, Coffee: { s: 45, w: 80, d: 75, k: 85, y: 60, x: 60, n: 55, i: 65 },
  Anis: { s: 65, w: 70, d: 55, n: 60, k: 45, f: 30 }, Chocolate: { s: 85, w: 85, d: 75, k: 70, y: 15, x: 70 },
  Cherry: { s: 90, f: 35, d: 55, w: 55, k: 35, x: 55, y: 10 }, Conifer: { f: 75, y: 85, d: 40, k: 45, c: 60, w: 25, n: 45, s: 5 },
  Rum: { s: 75, w: 85, d: 70, k: 70, x: 65, y: 25, i: 65 }, Soapy: { c: 100, f: 65, d: 30, w: 35, s: 20, x: 15, k: 0, y: 45 },
  Sour: { f: 65, s: 20, y: 70, n: 70, d: 20 }, Mineral: { f: 70, c: 75, y: 95, d: 25, w: 10, n: 70, s: 0, k: 30 },
  Camphor: { f: 85, y: 85, c: 60, d: 30, n: 65, k: 35, s: 0, i: 70 }, Gourmand: { s: 95, w: 85, d: 75, k: 40, y: 10, x: 60 },
  Whiskey: { s: 50, w: 85, d: 70, k: 80, y: 55, x: 70, i: 65, n: 55 }, Bitter: { y: 90, d: 45, k: 70, s: 0, n: 70, c: 25 },
  Savory: { y: 70, d: 60, w: 65, k: 70, n: 80, s: 20 }, Spicy: { w: 75, d: 60, k: 50, y: 60, i: 65, x: 45 },
  Beeswax: { s: 60, w: 80, d: 75, k: 45, y: 30, x: 45, n: 55 }, Cannabis: { k: 80, y: 75, n: 90, f: 40, d: 55, w: 40 },
  Champagne: { f: 70, s: 55, d: 20, c: 70, w: 20, n: 60, y: 30 }, Terpenic: { f: 85, y: 90, n: 70, c: 50, d: 25 },
  Sand: { y: 90, w: 55, d: 40, c: 50, k: 40, n: 65 }, Wine: { s: 60, w: 70, d: 60, k: 65, y: 40, x: 55, n: 65 },
  Pear: { s: 60, f: 65, d: 30, c: 55, w: 30 },
};

// Fallbacks when a fragrance has no accords. Notes are matched by pattern
// (first match per note), olfactory_family text word by word. Both produce
// pseudo-accords from the vocabulary above, so one pipeline handles all.
export const NOTE_PATTERNS: [RegExp, string][] = [
  [/bergamot|lemon|orange(?! blossom)|mandarin|grapefruit|lime|citrus|tangerine|petitgrain|yuzu/i, "Citrus"],
  [/orange blossom|jasmine|neroli|ylang|gardenia|magnolia|freesia|lily|orchid|tuberose|osmanthus|mimosa/i, "White Floral"],
  [/rose|peony|geranium|carnation|cyclamen|heliotrope|lotus|honeysuckle/i, "Floral"],
  [/violet|iris|orris/i, "Violet"],
  [/oud|agarwood/i, "Oud"], [/leather/i, "Leather"], [/tobacco/i, "Tobacco"],
  [/oakmoss|moss/i, "Mossy"], [/patchouli/i, "Patchouli"], [/vetiver|sandalwood|cedar|guaiac|wood|cypress/i, "Woody"],
  [/amber|labdanum|benzoin|ambergris|incense|olibanum|myrrh|ambroxan/i, "Amber"],
  [/vanilla|vanille|tonka|praline|honey|caramel/i, "Vanilla"], [/coffee/i, "Coffee"], [/coconut/i, "Coconut"], [/almond/i, "Almond"],
  [/musk|cashmeran/i, "Musky"], [/lavender|sage|rosemary|basil|thyme|mint|artemisia|juniper/i, "Aromatic"],
  [/cardamom|cinnamon|clove|nutmeg|pepper|ginger|saffron|coriander|spice/i, "Warm Spicy"],
  [/apple|pear|peach|raspberry|plum|apricot|pineapple|currant|cassis|melon|litchi|fruit/i, "Fruity"],
  [/green|galbanum|grass|leaf/i, "Green"], [/sea|marine|aquatic|ozon/i, "Marine"], [/aldehyde/i, "Aldehydic"],
];
export const FAMILY_TEXT_ACCORD: [RegExp, string][] = [
  [/floral/i, "Floral"], [/fruity/i, "Fruity"], [/amber/i, "Amber"], [/woody/i, "Woody"], [/aromatic|fougère|fougere/i, "Aromatic"],
  [/citrus/i, "Citrus"], [/chypre/i, "Mossy"], [/leather/i, "Leather"], [/gourmand/i, "Gourmand"], [/musk/i, "Musky"],
  [/green/i, "Green"], [/aquatic/i, "Aquatic"], [/aldehyd/i, "Aldehydic"], [/spicy/i, "Warm Spicy"], [/tobacco/i, "Tobacco"],
];

// Traits a user can say they avoid. `accords` count by their share of the
// fragrance's accord weight (x3, so a lead accord reads near full strength);
// sweetness and the floral/fruity/gourmand families use the derived values.
export const AVOID_TRAITS = ["aquatic", "powdery", "sweet", "smoky", "animalic", "leather", "green", "spicy", "floral", "fruity", "gourmand", "musky"] as const;
export type AvoidTrait = (typeof AVOID_TRAITS)[number];
export const TRAIT_ACCORDS: Partial<Record<AvoidTrait, string[]>> = {
  aquatic: ["Aquatic", "Marine", "Ozonic"], powdery: ["Powdery", "Iris", "Violet"], smoky: ["Smoky", "Oud", "Tobacco"],
  animalic: ["Animalic"], leather: ["Leather"], green: ["Green", "Herbal"], spicy: ["Warm Spicy", "Fresh Spicy", "Spicy", "Cinnamon"],
  musky: ["Musky"],
};

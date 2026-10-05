// The assessment: question schema + what each answer means. Copy (prompts,
// option labels) lives in the i18n catalogs under selector.q.<id>; this file
// holds ids and effects only. An effect adds family affinity (weights),
// sensory/mood targets (0-100, averaged over the answers given), or context.
import type { ContextKey, FamilyKey, MoodKey, SensoryKey } from "./config";

export interface Effect {
  families?: Partial<Record<FamilyKey, number>>;
  sensory?: Partial<Record<SensoryKey, number>>;
  mood?: Partial<Record<MoodKey, number>>;
}
export interface Option { id: string; effect: Effect }

export type Question =
  | { id: string; section: SectionId; kind: "single" | "multi"; max?: number; options: Option[] }
  | { id: string; section: SectionId; kind: "scale"; sensory?: SensoryKey[]; inverse?: SensoryKey[]; mood?: MoodKey[] }
  | { id: string; section: SectionId; kind: "known" };

export type SectionId = "instinct" | "families" | "sensory" | "intent" | "context" | "known";
export const SECTIONS: SectionId[] = ["instinct", "families", "sensory", "intent", "context", "known"];

const o = (id: string, effect: Effect): Option => ({ id, effect });
const fam = (key: FamilyKey): Option => o(key, { families: { [key]: 1 } });

export const USE_CONTEXT: Record<string, Partial<Record<ContextKey, number>>> = {
  everyday: { casual: 1 }, work: { office: 1 }, date: { date: 1 }, evening: { evening: 1 }, formal: { formal: 1 },
  outdoor: { outdoor: 1 }, home: { home: 1 }, special: { formal: 1, evening: 0.6 },
};
/** Weather as a 0 (hot) - 1 (cold) position. */
export const CLIMATE_LEVEL: Record<string, number> = { hot: 0, warm: 0.25, mild: 0.5, cool: 0.75, cold: 1 };
/** Highest comfortable intensity (0-1) for the people around the wearer. */
export const SOCIAL_CAP: Record<string, number> = { close: 0.4, office: 0.5, outdoor: 0.7, event: 1 };
/** Wanted projection as an intensity position, 0-1. */
export const PROJECTION_LEVEL: Record<string, number> = { skin: 0.15, bubble: 0.35, noticeable: 0.55, strong: 0.8, room: 1 };
export const PROJECTION_ORDER = ["skin", "bubble", "noticeable", "strong", "room"];

export const QUESTIONS: Question[] = [
  { id: "atmosphere", section: "instinct", kind: "single", options: [
    o("coldAir", { families: { fresh: 1, musky: 0.3 }, sensory: { freshness: 90, warmth: 15, cleanliness: 85, density: 20, darkness: 15 }, mood: { energy: 70, warmth: 15 } }),
    o("citrus", { families: { fresh: 1, fruity: 0.4 }, sensory: { freshness: 95, sweetness: 35, cleanliness: 80, density: 15, warmth: 25 }, mood: { energy: 85, warmth: 30 } }),
    o("woodRoom", { families: { woody: 1, amber: 0.6 }, sensory: { warmth: 80, density: 65, dryness: 70, darkness: 55, freshness: 20 }, mood: { warmth: 80, presence: 60 } }),
    o("dessert", { families: { gourmand: 1, amber: 0.6 }, sensory: { sweetness: 90, warmth: 90, density: 75, darkness: 50, sensuality: 70, freshness: 10 }, mood: { warmth: 90, sensuality: 70, energy: 35 } }),
  ] },
  { id: "material", section: "instinct", kind: "single", options: [
    o("linen", { families: { fresh: 0.7, musky: 0.5 }, sensory: { cleanliness: 90, freshness: 70, dryness: 65, density: 20, sweetness: 15 } }),
    o("suede", { families: { musky: 0.6, woody: 0.5, amber: 0.3 }, sensory: { density: 55, dryness: 60, warmth: 60, sensuality: 60, darkness: 45 } }),
    o("wood", { families: { woody: 1 }, sensory: { dryness: 80, density: 60, darkness: 50, cleanliness: 55, warmth: 55 } }),
    o("cashmere", { families: { musky: 0.8, amber: 0.4, gourmand: 0.2 }, sensory: { warmth: 75, density: 55, sweetness: 45, sensuality: 65, cleanliness: 70, darkness: 30 } }),
    o("cotton", { families: { fresh: 0.6, musky: 0.7 }, sensory: { cleanliness: 95, freshness: 65, density: 15, sweetness: 20, warmth: 35, darkness: 5 } }),
    o("leather", { families: { woody: 0.5, amber: 0.5, chypre: 0.3 }, sensory: { darkness: 85, dryness: 80, density: 75, sensuality: 70, warmth: 60, novelty: 60 }, mood: { presence: 75 } }),
  ] },
  { id: "families", section: "families", kind: "multi", max: 3, options: (["fresh", "floral", "fruity", "woody", "amber", "gourmand", "chypre", "musky"] as FamilyKey[]).map(fam) },
  { id: "pleasures", section: "families", kind: "multi", max: 3, options: [
    o("seaAir", { families: { fresh: 1 }, sensory: { freshness: 95, cleanliness: 85 } }),
    o("greenGrass", { families: { fresh: 0.8, chypre: 0.3 }, sensory: { freshness: 85, cleanliness: 60 } }),
    o("roseGarden", { families: { floral: 1 } }),
    o("ripeFruit", { families: { fruity: 1 }, sensory: { sweetness: 70 } }),
    o("vanillaBean", { families: { gourmand: 0.8, amber: 0.5 }, sensory: { sweetness: 90 } }),
    o("sandalwood", { families: { woody: 1 }, sensory: { density: 55, warmth: 60 } }),
    o("blackPepper", { families: { woody: 0.4, amber: 0.4, fresh: 0.3 }, sensory: { dryness: 70, novelty: 55 } }),
    o("incense", { families: { amber: 0.8, woody: 0.4 }, sensory: { darkness: 80, novelty: 60, density: 70 } }),
    o("cleanSkin", { families: { musky: 1 }, sensory: { cleanliness: 90 } }),
    o("forestFloor", { families: { chypre: 1, woody: 0.4 }, sensory: { darkness: 65, dryness: 80 } }),
  ] },
  { id: "sweetness", section: "sensory", kind: "scale", sensory: ["sweetness"] },
  { id: "warmth", section: "sensory", kind: "scale", sensory: ["warmth"], inverse: ["freshness"] },
  { id: "darkness", section: "sensory", kind: "scale", sensory: ["darkness"], inverse: ["cleanliness"] },
  { id: "avoid", section: "sensory", kind: "multi", options: [
    "aquatic", "powdery", "sweet", "smoky", "animalic", "leather", "green", "spicy", "floral", "fruity", "gourmand", "musky",
  ].map((t) => o(t, {})) },
  { id: "intent", section: "intent", kind: "multi", max: 3, options: [
    o("calm", { mood: { energy: 20, warmth: 55, presence: 30 } }),
    o("confident", { mood: { presence: 80, energy: 65 } }),
    o("energized", { mood: { energy: 90 } }),
    o("sophisticated", { mood: { presence: 65, novelty: 50 }, sensory: { dryness: 60 } }),
    o("sensual", { mood: { sensuality: 90, warmth: 75 } }),
    o("comforted", { mood: { warmth: 90, energy: 25, presence: 35, sensuality: 50 } }),
    o("mysterious", { mood: { novelty: 75, sensuality: 70, presence: 60, energy: 35 }, sensory: { darkness: 80 } }),
    o("invigorated", { mood: { energy: 95, warmth: 20 } }),
    o("grounded", { mood: { energy: 30, warmth: 65, presence: 55 } }),
    o("playful", { mood: { energy: 80, novelty: 70, warmth: 55 } }),
  ] },
  { id: "presence", section: "intent", kind: "scale", mood: ["presence"] },
  { id: "novelty", section: "intent", kind: "scale", mood: ["novelty"], sensory: ["novelty"] },
  { id: "use", section: "context", kind: "single", options: Object.keys(USE_CONTEXT).map((u) => o(u, {})) },
  { id: "climate", section: "context", kind: "single", options: Object.keys(CLIMATE_LEVEL).map((u) => o(u, {})) },
  { id: "social", section: "context", kind: "single", options: Object.keys(SOCIAL_CAP).map((u) => o(u, {})) },
  { id: "projection", section: "context", kind: "single", options: PROJECTION_ORDER.map((u) => o(u, {})) },
  { id: "known", section: "known", kind: "known" },
];

export const QUESTION_COUNT = QUESTIONS.length;

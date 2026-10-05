import { describe, expect, it } from "vitest";
import { FAMILY_KEYS, SCORE_COMPONENTS, SELECTOR_WEIGHTS } from "./config";
import { profileFromRow, type CatalogRow } from "./profiles";
import { buildUserProfile, type KnownFragrance } from "./userProfile";
import {
  calculateClimateCompatibility, calculateFamilyCompatibility, calculateIntensityCompatibility,
  calculateKnownFragranceSimilarity, calculateMoodCompatibility, calculateOccasionCompatibility, calculateOverallScore,
  calculateSensoryCompatibility, calculateComponents, avoidSeverity, type Components,
} from "./scoring";
import { profilesFromRows, recommend, targetAccords } from "./index";
import { identityOf, signatureOf } from "./naming";
import { QUESTIONS } from "./questions";
import en from "../../i18n/messages/en";

const row = (name: string, accords: string[], extra: CatalogRow = {}): CatalogRow => ({ id: name, name, brand: "House", accords, ...extra });
const P = (name: string, accords: string[], extra: CatalogRow = {}) => profileFromRow(row(name, accords, extra))!;

const woodyAmber = P("Dark Amber", ["Amber", "Woody", "Vanilla", "Warm Spicy", "Balsamic"]);
const citrusFresh = P("Citrus Air", ["Citrus", "Fresh", "Aquatic", "Aromatic", "Green"]);
const sweetGourmand = P("Sugar", ["Sweet", "Vanilla", "Caramel", "Gourmand"]);
const all = [woodyAmber, citrusFresh, sweetGourmand];
const loved = (p: typeof woodyAmber): KnownFragrance => ({ status: "loved", profile: p });
const disliked = (p: typeof woodyAmber): KnownFragrance => ({ status: "disliked", profile: p });

describe("weights", () => {
  it("sum to 100% and cover every component", () => {
    expect(SCORE_COMPONENTS.reduce((a, c) => a + SELECTOR_WEIGHTS[c], 0)).toBeCloseTo(1, 10);
    expect(Object.keys(SELECTOR_WEIGHTS).sort()).toEqual([...SCORE_COMPONENTS].sort());
  });
});

describe("fragrance profiles", () => {
  it("weights families by accord rank and sums to 1", () => {
    const f = woodyAmber.families;
    expect(FAMILY_KEYS.reduce((a, k) => a + f[k], 0)).toBeCloseTo(1, 10);
    expect(f.amber).toBeGreaterThan(f.fresh);
    expect(woodyAmber.sensory.warmth).toBeGreaterThan(citrusFresh.sensory.warmth);
    expect(citrusFresh.sensory.freshness).toBeGreaterThan(woodyAmber.sensory.freshness);
  });
  it("falls back to notes, then family text, then drops tier-only rows", () => {
    expect(profileFromRow({ id: "n", name: "N", all_notes: ["Bergamot", "Cedar"] })?.basis).toBe("notes");
    expect(profileFromRow({ id: "f", name: "F", olfactory_family: "Amber Woody" })?.basis).toBe("family");
    const tierOnly = profileFromRow({ id: "t", name: "T", tier: "woody" });
    expect(tierOnly?.basis).toBe("tier");
    expect(profilesFromRows([{ id: "t", name: "T", tier: "woody" }])).toEqual([]);
  });
  it("survives missing and malformed fields", () => {
    expect(profileFromRow(null)).toBeNull();
    expect(profileFromRow({})).toBeNull();
    expect(profileFromRow({ id: 1, name: " ", accords: ["Woody"] })).toBeNull();
    const p = profileFromRow({ id: 1, name: "X", accords: ["Woody", 5, null, "Nonsense"], top_notes: "no", brand: 3 })!;
    expect(p.brand).toBeNull();
    expect(p.accords).toEqual(["Woody"]);
    expect(Number.isFinite(p.sensory.density)).toBe(true);
  });
  it("blends the family text into accord families", () => {
    const withText = P("A", ["Citrus"], { olfactory_family: "Amber" });
    expect(withText.families.amber).toBeGreaterThan(0);
  });
});

describe("question schema", () => {
  it("has 14-16 steps, unique ids, copy in the catalog", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(14);
    expect(QUESTIONS.length).toBeLessThanOrEqual(16);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    const q = (en as any).selector.q;
    for (const question of QUESTIONS) {
      expect(typeof q[question.id].title, question.id).toBe("string");
      if ("options" in question) for (const o of question.options) expect(typeof q[question.id].options[o.id], `${question.id}.${o.id}`).toBe("string");
      if (question.kind === "scale") expect(q[question.id].levels).toHaveLength(5);
    }
  });
});

describe("user profile", () => {
  it("is empty and valid with nothing answered", () => {
    const u = buildUserProfile({}, []);
    expect(u.answered).toBe(0);
    expect(FAMILY_KEYS.every((k) => u.families[k] === 0)).toBe(true);
    expect(identityOf(u)).toBeNull();
    expect(buildUserProfile(undefined as never)).toBeTruthy();
  });
  it("normalises families and keeps only answered dimensions", () => {
    const u = buildUserProfile({ families: ["woody", "amber"], sweetness: 5 });
    expect(FAMILY_KEYS.reduce((a, k) => a + u.families[k], 0)).toBeCloseTo(1, 10);
    expect(u.sensory.sweetness).toBe(100);
    expect(Object.keys(u.sensory)).toEqual(["sweetness"]);
  });
  it("inverts paired scales and ignores malformed answers", () => {
    const u = buildUserProfile({ warmth: 5, darkness: "x" as never, novelty: 9, families: "woody" as never, use: "nope", climate: 7 as never });
    expect(u.sensory.warmth).toBe(100);
    expect(u.sensory.freshness).toBe(0);
    expect(u.sensory.darkness).toBeUndefined();
    expect(u.mood.novelty).toBeUndefined();
    expect(u.useKey).toBeNull();
    expect(u.climate).toBeNull();
  });
  it("caps multi picks and lets the latest known status win", () => {
    const u = buildUserProfile({ families: ["fresh", "floral", "fruity", "woody"] });
    expect(FAMILY_KEYS.filter((k) => u.families[k] > 0)).toHaveLength(3);
    const k = buildUserProfile({}, [loved(woodyAmber), disliked(woodyAmber), loved(citrusFresh), loved(citrusFresh)]);
    expect(k.loved.map((p) => p.id)).toEqual(["Citrus Air"]);
    expect(k.disliked.map((p) => p.id)).toEqual(["Dark Amber"]);
  });
});

describe("family scoring", () => {
  const fam = (...f: string[]) => buildUserProfile({ families: f });
  it("perfect, partial and opposing", () => {
    expect(calculateFamilyCompatibility(fam("amber"), P("A", ["Amber"]))).toBeCloseTo(1, 5);
    const partial = calculateFamilyCompatibility(fam("amber"), P("B", ["Amber", "Citrus"]))!;
    const opposing = calculateFamilyCompatibility(fam("amber"), P("C", ["Citrus", "Aquatic"]))!;
    expect(partial).toBeGreaterThan(opposing);
    expect(partial).toBeLessThan(1);
    expect(opposing).toBe(0);
  });
  it("is null without a family signal", () => expect(calculateFamilyCompatibility(buildUserProfile({}), woodyAmber)).toBeNull());
});

describe("sensory and mood scoring", () => {
  it("exact, opposite and mixed values", () => {
    const exact = { ...buildUserProfile({}), sensory: { ...woodyAmber.sensory } };
    expect(calculateSensoryCompatibility(exact, woodyAmber)).toBe(1);
    const opposite = { ...buildUserProfile({}), sensory: Object.fromEntries(Object.entries(woodyAmber.sensory).map(([k, v]) => [k, v > 50 ? 0 : 100])) };
    expect(calculateSensoryCompatibility(opposite, woodyAmber)).toBeLessThan(0.45);
    const mixed = buildUserProfile({ sweetness: 3, warmth: 4 });
    const s = calculateSensoryCompatibility(mixed, woodyAmber)!;
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
    expect(calculateSensoryCompatibility(buildUserProfile({}), woodyAmber)).toBeNull();
  });
  it("mood follows the derived mood of the fragrance", () => {
    const energized = buildUserProfile({ intent: ["energized", "invigorated"] });
    expect(calculateMoodCompatibility(energized, citrusFresh)!).toBeGreaterThan(calculateMoodCompatibility(energized, woodyAmber)!);
    expect(calculateMoodCompatibility(buildUserProfile({}), woodyAmber)).toBeNull();
  });
});

describe("known fragrances", () => {
  it("a loved fragrance raises similar ones above unlike ones", () => {
    const u = buildUserProfile({}, [loved(woodyAmber)]);
    const near = P("Near", ["Amber", "Woody", "Balsamic", "Vanilla"]);
    expect(calculateKnownFragranceSimilarity(u, near)!).toBeGreaterThan(calculateKnownFragranceSimilarity(u, citrusFresh)!);
  });
  it("a disliked fragrance lowers similar ones", () => {
    const u = buildUserProfile({}, [disliked(woodyAmber)]);
    const near = P("Near", ["Amber", "Woody", "Balsamic", "Vanilla"]);
    expect(calculateKnownFragranceSimilarity(u, near)!).toBeLessThan(calculateKnownFragranceSimilarity(u, citrusFresh)!);
  });
  it("is null with none; ignores the fragrance itself", () => {
    expect(calculateKnownFragranceSimilarity(buildUserProfile({}), woodyAmber)).toBeNull();
    const u = buildUserProfile({}, [loved(woodyAmber), disliked(sweetGourmand)]);
    expect(calculateKnownFragranceSimilarity(u, woodyAmber)).not.toBeNull();
  });
});

describe("context", () => {
  it("climate: heavy fragrances suit cold, light ones suit heat", () => {
    const hot = buildUserProfile({ climate: "hot" }), cold = buildUserProfile({ climate: "cold" });
    expect(calculateClimateCompatibility(hot, citrusFresh)!).toBeGreaterThan(calculateClimateCompatibility(hot, woodyAmber)!);
    expect(calculateClimateCompatibility(cold, woodyAmber)!).toBeGreaterThan(calculateClimateCompatibility(cold, citrusFresh)!);
    expect(calculateClimateCompatibility(buildUserProfile({}), woodyAmber)).toBeNull();
  });
  it("occasion and projection", () => {
    const evening = buildUserProfile({ use: "evening" });
    expect(calculateOccasionCompatibility(evening, woodyAmber)!).toBeGreaterThan(calculateOccasionCompatibility(evening, citrusFresh)!);
    const skin = buildUserProfile({ projection: "skin", social: "close" });
    expect(calculateIntensityCompatibility(skin, citrusFresh)!).toBeGreaterThan(calculateIntensityCompatibility(skin, P("Oud", ["Oud", "Animalic", "Tuberose"]))!);
    expect(calculateIntensityCompatibility(buildUserProfile({}), woodyAmber)).toBeNull();
    expect(calculateIntensityCompatibility(buildUserProfile({ social: "office" }), woodyAmber)).not.toBeNull();
  });
  it("a hot, close-contact context ranks dense amber below its family match", () => {
    const base = { families: ["amber", "woody"] };
    const free = recommend(buildUserProfile(base), all);
    const bound = recommend(buildUserProfile({ ...base, climate: "hot", social: "close", projection: "skin", use: "work" }), all);
    const amber = (r: ReturnType<typeof recommend>) => r.matches.find((m) => m.profile.id === "Dark Amber")!;
    expect(amber(bound).score).toBeLessThan(amber(free).score - 0.2);
    expect(amber(bound).cautions.map((c) => c.key)).toContain("heavyForClimate");
  });
});

describe("avoided traits", () => {
  it("penalise fragrances that carry them", () => {
    const u = buildUserProfile({ families: ["fresh"], avoid: ["aquatic", "sweet"] });
    expect(avoidSeverity(u, citrusFresh)).toBeGreaterThan(0.3);
    expect(avoidSeverity(u, woodyAmber)).toBeLessThan(avoidSeverity(u, sweetGourmand));
    const plain = buildUserProfile({ families: ["fresh"] });
    const a = recommend(plain, [citrusFresh]).matches[0].score, b = recommend(u, [citrusFresh]).matches[0].score;
    expect(b).toBeLessThan(a);
    expect(recommend(u, [citrusFresh]).matches[0].cautions.some((c) => c.key === "avoidTrait")).toBe(true);
  });
  it("covers every avoidable trait without throwing", () => {
    const u = buildUserProfile({ avoid: ["aquatic", "powdery", "sweet", "smoky", "animalic", "leather", "green", "spicy", "floral", "fruity", "gourmand", "musky"] });
    expect(u.avoid).toHaveLength(12);
    for (const p of all) expect(avoidSeverity(u, p)).toBeGreaterThanOrEqual(0);
  });
});

describe("overall score", () => {
  const none: Components = { family: null, sensory: null, knownFragrance: null, mood: null, occasion: null, climate: null, intensity: null };
  it("renormalises over applicable components and stays within 0-1", () => {
    expect(calculateOverallScore({ ...none, family: 1 }).score).toBe(1);
    expect(calculateOverallScore({ ...none, family: 1, sensory: 0 }).base).toBeCloseTo(0.3 / 0.55, 10);
    expect(calculateOverallScore(none).score).toBe(0);
    expect(calculateOverallScore({ ...none, family: 5 as number }, { constraint: 9, avoid: 9 }).score).toBeGreaterThanOrEqual(0);
    expect(calculateOverallScore({ ...none, family: NaN }).score).toBe(0);
  });
  it("is deterministic", () => {
    const u = buildUserProfile({ families: ["woody"], sweetness: 4, use: "date" }, [loved(woodyAmber)]);
    const a = recommend(u, all), b = recommend(u, [...all].reverse());
    expect(a).toEqual(b);
    for (const m of a.matches) { expect(m.score).toBeGreaterThanOrEqual(0); expect(m.score).toBeLessThanOrEqual(1); }
  });
  it("applies every component together", () => {
    const u = buildUserProfile({ families: ["amber"], sweetness: 5, intent: ["sensual"], use: "date", climate: "cool", social: "event", projection: "strong" }, [loved(sweetGourmand)]);
    const c = calculateComponents(u, woodyAmber);
    expect(SCORE_COMPONENTS.every((k) => typeof c[k] === "number")).toBe(true);
  });
});

describe("recommend", () => {
  it("reports no signal for an empty quiz and empty for an empty catalog", () => {
    expect(recommend(buildUserProfile({}), all).status).toBe("no-signal");
    expect(recommend(buildUserProfile({ families: ["woody"] }), []).status).toBe("empty");
    expect(profilesFromRows(null)).toEqual([]);
    expect(profilesFromRows(undefined)).toEqual([]);
  });
  it("works with only dislikes, and keeps known fragrances out of the results", () => {
    const r = recommend(buildUserProfile({}, [disliked(woodyAmber)]), all);
    expect(r.status).toBe("ok");
    expect(r.matches.map((m) => m.profile.id)).not.toContain("Dark Amber");
    expect(r.matches[0].profile.id).toBe("Citrus Air");
  });
  it("collapses duplicates (same id, or same name and house) and respects the limit", () => {
    const rows = [row("Dup", ["Woody"]), row("Dup", ["Woody"], { id: "other" }), row("Solo", ["Woody", "Amber"])];
    const profiles = profilesFromRows(rows);
    expect(profiles).toHaveLength(2);
    expect(recommend(buildUserProfile({ families: ["woody"] }), profiles, 1).matches).toHaveLength(1);
  });
  it("shows one fragrance once when the catalog files it under several names", () => {
    const v = (name: string, id: string, popularity = 900) => row(name, ["Woody", "Amber"], { id, brand: "Mugler", year: 1992, rating: 4.1, popularity });
    const profiles = profilesFromRows([v("Thierry Mugler Angel", "a"), v("Angel", "b"), v("Other", "c", 50)]);
    expect(profiles.map((p) => p.name)).toEqual(["Angel", "Other"]);
    const loved = buildUserProfile({}, [{ status: "loved", profile: profiles[0] }]);
    const out = recommend(loved, profilesFromRows([v("Angel", "z"), v("Different", "d", 7)]));
    expect(out.matches.map((m) => m.profile.id)).not.toContain("z");
  });
  it("explains each match from its components", () => {
    const u = buildUserProfile({ families: ["amber", "woody"], sweetness: 4, warmth: 5, use: "evening" }, [loved(woodyAmber)]);
    const top = recommend(u, [P("Close", ["Amber", "Woody", "Vanilla", "Balsamic"]), citrusFresh]).matches[0];
    expect(top.profile.id).toBe("Close");
    const keys = top.reasons.map((r) => r.key);
    expect(keys).toContain("familyStrong");
    expect(keys).toContain("likeLoved");
    expect(keys).toContain("occasionFit");
  });
  it("targets accords that carry the user's leanings", () => {
    const u = buildUserProfile({ families: ["woody", "amber"] }, [loved(citrusFresh)]);
    const t = targetAccords(u, 8);
    expect(t).toHaveLength(8);
    expect(t).toContain("Citrus");
    expect(t.some((a) => ["Woody", "Amber"].includes(a))).toBe(true);
    expect(targetAccords(buildUserProfile({}), 3)).toHaveLength(3);
  });
});

describe("naming", () => {
  it("builds identity and signature from the profile", () => {
    const u = buildUserProfile({ families: ["woody", "amber", "gourmand"], warmth: 5, sweetness: 5 });
    const id = identityOf(u)!;
    expect(id.families[0]).toBeTruthy();
    expect(id.modifier).not.toBeNull();
    expect(signatureOf(u).find((w) => w.dim === "warmth")?.high).toBe(true);
    expect(signatureOf(u).find((w) => w.dim === "freshness")?.high).toBe(false);
    expect(signatureOf(buildUserProfile({ warmth: 1 })).find((w) => w.dim === "warmth")).toEqual({ dim: "warmth", high: false });
  });
});

describe("copy", () => {
  it("avoids the words the brief rules out and personality labels", () => {
    const text = JSON.stringify((en as any).selector).toLowerCase();
    for (const w of ["amazing", "best", "cheap", "trendy", "fast", "easy", "quick", "affordable", "stunning", "package", "deal", "alpha", "introvert", "extrovert", "seducer"]) {
      expect(new RegExp(`\\b${w}\\b`).test(text), w).toBe(false);
    }
  });
});

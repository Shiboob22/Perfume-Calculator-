// The scoring functions. Pure and deterministic. Each component returns a
// number in [0, 1], or null when the user's answers say nothing about it
// (the overall score then renormalises over the components that apply, so
// skipped questions never count against a fragrance).
import {
  FAMILY_KEYS, SCORE_COMPONENTS, SCORING, SELECTOR_WEIGHTS, SENSORY_KEYS,
  type ContextKey, type MoodKey, type ScoreComponent, type SensoryKey,
} from "./config";
import { heaviness, traitStrength, type FragranceProfile } from "./profiles";
import type { UserProfile } from "./userProfile";

export const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/** 1 - mean |difference| over the dimensions the user set, 0 at `zeroAtDiff`. */
function closeness<K extends string>(wanted: Partial<Record<K, number>>, have: Record<K, number>): number | null {
  const keys = (Object.keys(wanted) as K[]).filter((k) => typeof wanted[k] === "number");
  if (!keys.length) return null;
  const diff = keys.reduce((a, k) => a + Math.abs((wanted[k] as number) - (have[k] ?? 50)), 0) / keys.length;
  return clamp01(1 - diff / SCORING.zeroAtDiff);
}

export function calculateFamilyCompatibility(user: UserProfile, f: FragranceProfile): number | null {
  const a = FAMILY_KEYS.map((k) => user.families[k]);
  if (a.every((v) => v === 0)) return null;
  return clamp01(cosine(a, FAMILY_KEYS.map((k) => f.families[k])));
}

export function calculateSensoryCompatibility(user: UserProfile, f: FragranceProfile): number | null {
  return closeness<SensoryKey>(user.sensory, f.sensory);
}

export function calculateMoodCompatibility(user: UserProfile, f: FragranceProfile): number | null {
  return closeness<MoodKey>(user.mood, f.mood);
}

/** Mean-centred sensory + family vectors compared by cosine, 0-1. */
export function profileSimilarity(a: FragranceProfile, b: FragranceProfile): number {
  const fam = cosine(FAMILY_KEYS.map((k) => a.families[k]), FAMILY_KEYS.map((k) => b.families[k]));
  const sens = cosine(SENSORY_KEYS.map((k) => a.sensory[k] - 50), SENSORY_KEYS.map((k) => b.sensory[k] - 50));
  return clamp01(0.5 * fam + 0.5 * ((sens + 1) / 2));
}
const affinity = (sim: number) => clamp01((sim - SCORING.similarityFloor) / (SCORING.similarityCeil - SCORING.similarityFloor));

/** Similarity to the loved fragrances (nearest few), minus closeness to the disliked. */
export function calculateKnownFragranceSimilarity(user: UserProfile, f: FragranceProfile): number | null {
  const loved = user.loved.filter((p) => p.id !== f.id);
  const disliked = user.disliked.filter((p) => p.id !== f.id);
  if (!user.loved.length && !user.disliked.length) return null;
  const pos = loved.map((p) => affinity(profileSimilarity(f, p))).sort((a, b) => b - a).slice(0, SCORING.lovedTopN);
  const neg = disliked.length ? Math.max(...disliked.map((p) => affinity(profileSimilarity(f, p)))) : 0;
  const base = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : SCORING.dislikeOnlyBase;
  return clamp01(base - SCORING.dislikeWeight * neg);
}

export function calculateOccasionCompatibility(user: UserProfile, f: FragranceProfile): number | null {
  if (!user.use) return null;
  const entries = Object.entries(user.use) as [ContextKey, number][];
  const total = entries.reduce((a, [, w]) => a + w, 0);
  return total > 0 ? clamp01(entries.reduce((a, [k, w]) => a + w * f.context[k], 0) / total) : null;
}

/** Heavy fragrances read worse in heat (1.5x), light ones in the cold (0.8x). */
export function calculateClimateCompatibility(user: UserProfile, f: FragranceProfile): number | null {
  if (user.climate === null) return null;
  const diff = heaviness(f.sensory) - user.climate;
  return clamp01(1 - (diff > 0 ? 1.5 * diff : -0.8 * diff));
}

export function calculateIntensityCompatibility(user: UserProfile, f: FragranceProfile): number | null {
  const wanted = user.projection ?? user.socialCap;
  if (wanted === null) return null;
  const have = f.sensory.intensity / 100;
  const over = user.socialCap !== null ? Math.max(0, have - user.socialCap) * 0.5 : 0;
  return clamp01(1 - 1.2 * Math.abs(wanted - have) - over);
}

/** Context as a limit: how far a fragrance breaks the weather/closeness it must live in, 0-1. */
export function constraintSeverity(user: UserProfile, f: FragranceProfile): number {
  const climate = user.climate === null ? 0 : clamp01((heaviness(f.sensory) - user.climate - 0.25) / 0.35);
  const intensity = user.socialCap === null ? 0 : clamp01((f.sensory.intensity / 100 - user.socialCap - 0.15) / 0.35);
  return Math.max(climate, intensity);
}

/** Combined 0-1 strength of the traits the user avoids (noisy-or). */
export function avoidSeverity(user: UserProfile, f: FragranceProfile): number {
  return 1 - user.avoid.reduce((rest, t) => rest * (1 - traitStrength(f, t)), 1);
}

export type Components = Record<ScoreComponent, number | null>;

export function calculateComponents(user: UserProfile, f: FragranceProfile): Components {
  return {
    family: calculateFamilyCompatibility(user, f),
    sensory: calculateSensoryCompatibility(user, f),
    knownFragrance: calculateKnownFragranceSimilarity(user, f),
    mood: calculateMoodCompatibility(user, f),
    occasion: calculateOccasionCompatibility(user, f),
    climate: calculateClimateCompatibility(user, f),
    intensity: calculateIntensityCompatibility(user, f),
  };
}

export interface Overall {
  /** 0-1, after the context constraint and avoided-trait penalties. */
  score: number;
  /** Weighted mean of the applicable components, before penalties. */
  base: number;
  constraint: number;
  avoidPenalty: number;
}

export function calculateOverallScore(components: Components, penalties: { constraint?: number; avoid?: number } = {}, weights = SELECTOR_WEIGHTS): Overall {
  let sum = 0, used = 0;
  for (const c of SCORE_COMPONENTS) {
    const v = components[c];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    sum += weights[c] * clamp01(v);
    used += weights[c];
  }
  const base = used > 0 ? sum / used : 0;
  const constraint = 1 - SCORING.constraintMaxPenalty * clamp01(penalties.constraint ?? 0);
  const avoidPenalty = SCORING.avoidMaxPenalty * clamp01(penalties.avoid ?? 0);
  return { score: clamp01(base * constraint - avoidPenalty), base, constraint, avoidPenalty };
}

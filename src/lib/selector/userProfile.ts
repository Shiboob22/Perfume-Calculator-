// Quiz answers (+ known fragrances) -> the user's profile. Pure.
import { FAMILY_KEYS, MOOD_KEYS, SENSORY_KEYS, SCORING, type ContextKey, type FamilyProfile, type MoodKey, type MoodProfile, type SensoryKey, type SensoryProfile } from "./config";
import { isAvoidTrait, normalizeFamilies, type FragranceProfile } from "./profiles";
import { CLIMATE_LEVEL, PROJECTION_LEVEL, QUESTIONS, SOCIAL_CAP, USE_CONTEXT, type Effect } from "./questions";
import type { AvoidTrait } from "./config";

/** single: option id · multi: option ids · scale: 1-5. Missing = unanswered. */
export type Answers = Record<string, string | string[] | number | undefined>;
export type KnownStatus = "loved" | "disliked" | "unsure";
export interface KnownFragrance { status: KnownStatus; profile: FragranceProfile }

export interface UserProfile {
  /** Proportions (sum 1), or all 0 when no family signal was given. */
  families: FamilyProfile;
  /** Only the dimensions the answers speak to. */
  sensory: Partial<SensoryProfile>;
  mood: Partial<MoodProfile>;
  use: Partial<Record<ContextKey, number>> | null;
  useKey: string | null;
  /** 0 hot - 1 cold. */
  climate: number | null;
  climateKey: string | null;
  /** Highest comfortable intensity, 0-1. */
  socialCap: number | null;
  /** Wanted projection, 0-1. */
  projection: number | null;
  projectionKey: string | null;
  avoid: AvoidTrait[];
  intents: string[];
  loved: FragranceProfile[];
  disliked: FragranceProfile[];
  /** Fragrances the user is unsure about: only kept out of the results. */
  unsure: FragranceProfile[];
  answered: number;
}

type Acc = Record<string, { sum: number; weight: number }>;
const addTarget = (acc: Acc, key: string, value: number, weight: number) => {
  const a = (acc[key] ??= { sum: 0, weight: 0 });
  a.sum += value * weight;
  a.weight += weight;
};
const finish = <K extends string>(acc: Acc): Partial<Record<K, number>> =>
  Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, a.sum / a.weight])) as Partial<Record<K, number>>;

const asList = (v: Answers[string]): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const asLevel = (v: Answers[string]): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 5 ? Math.round(v) : null);

export function buildUserProfile(answers: Answers = {}, known: KnownFragrance[] = []): UserProfile {
  const fam: FamilyProfile = Object.fromEntries(FAMILY_KEYS.map((k) => [k, 0])) as FamilyProfile;
  const sensory: Acc = {}, mood: Acc = {};
  let answered = 0, avoid: AvoidTrait[] = [], intents: string[] = [];
  const apply = (e: Effect, weight: number) => {
    for (const [k, w] of Object.entries(e.families ?? {})) fam[k as keyof FamilyProfile] += (w ?? 0) * weight;
    for (const [k, v] of Object.entries(e.sensory ?? {})) addTarget(sensory, k, v ?? 0, weight);
    for (const [k, v] of Object.entries(e.mood ?? {})) addTarget(mood, k, v ?? 0, weight);
  };

  for (const q of QUESTIONS) {
    const a = answers?.[q.id];
    if (q.kind === "known") continue;
    if (q.kind === "scale") {
      const level = asLevel(a);
      if (level === null) continue;
      answered++;
      const target = (level - 1) * 25;
      for (const k of q.sensory ?? []) addTarget(sensory, k, target, SCORING.scaleWeight);
      for (const k of q.inverse ?? []) addTarget(sensory, k, 100 - target, SCORING.scaleWeight);
      for (const k of q.mood ?? []) addTarget(mood, k, target, SCORING.scaleWeight);
      continue;
    }
    const ids = q.kind === "multi" ? asList(a) : typeof a === "string" ? [a] : [];
    const picked = q.options.filter((o) => ids.includes(o.id)).slice(0, q.kind === "multi" ? q.max ?? q.options.length : 1);
    if (!picked.length) continue;
    answered++;
    for (const opt of picked) apply(opt.effect, 1);
    if (q.id === "avoid") avoid = picked.map((p) => p.id).filter(isAvoidTrait);
    if (q.id === "intent") intents = picked.map((p) => p.id);
  }

  const one = (id: string) => (typeof answers?.[id] === "string" ? (answers[id] as string) : null);
  const useKey = one("use") && one("use")! in USE_CONTEXT ? one("use") : null;
  const climateKey = one("climate") && one("climate")! in CLIMATE_LEVEL ? one("climate") : null;
  const socialKey = one("social") && one("social")! in SOCIAL_CAP ? one("social") : null;
  const projectionKey = one("projection") && one("projection")! in PROJECTION_LEVEL ? one("projection") : null;
  for (const k of [useKey, climateKey, socialKey, projectionKey]) if (k) answered++;

  const byStatus = (s: KnownStatus) => dedupe(known.filter((k) => k.status === s).map((k) => k.profile));
  const profile: UserProfile = {
    families: normalizeFamilies(fam),
    sensory: finish<SensoryKey>(sensory),
    mood: finish<MoodKey>(mood),
    use: useKey ? USE_CONTEXT[useKey] : null, useKey,
    climate: climateKey ? CLIMATE_LEVEL[climateKey] : null, climateKey,
    socialCap: socialKey ? SOCIAL_CAP[socialKey] : null,
    projection: projectionKey ? PROJECTION_LEVEL[projectionKey] : null, projectionKey,
    avoid, intents,
    loved: byStatus("loved"), disliked: byStatus("disliked"), unsure: byStatus("unsure"),
    answered,
  };
  // A fragrance can't be both loved and disliked: the latest pick wins (the
  // list is in pick order), so drop earlier contradictions.
  const lastStatus = new Map(known.map((k) => [k.profile.id, k.status]));
  profile.loved = profile.loved.filter((p) => lastStatus.get(p.id) === "loved");
  profile.disliked = profile.disliked.filter((p) => lastStatus.get(p.id) === "disliked");
  profile.unsure = profile.unsure.filter((p) => lastStatus.get(p.id) === "unsure");
  return profile;
}

/**
 * The catalog files one fragrance under several names ("Angel", "Thierry
 * Mugler Angel"): same house, year, rating and vote count. Null when there
 * are no votes, as then nothing tells a variant from a different fragrance.
 */
export function variantKey(p: FragranceProfile): string | null {
  const r = p.row;
  if (!r.popularity) return null;
  return [p.brand, r.year, r.rating, r.popularity].map((v) => String(v ?? "").trim().toLowerCase()).join("|");
}

/** Same fragrance picked twice (same id, or same name and house) counts once. */
export const fragranceKey = (p: FragranceProfile) => `${p.name}|${p.brand ?? ""}`.toLowerCase().replace(/\s+/g, " ");
export function dedupe(list: FragranceProfile[]): FragranceProfile[] {
  const ids = new Set<string>(), names = new Set<string>();
  return list.filter((p) => {
    const key = fragranceKey(p);
    if (ids.has(p.id) || names.has(key)) return false;
    ids.add(p.id); names.add(key);
    return true;
  });
}

/** True when the answers (and picks) give the engine something to rank by. */
export function hasSignal(u: UserProfile): boolean {
  return FAMILY_KEYS.some((k) => u.families[k] > 0) || Object.keys(u.sensory).length > 0 || Object.keys(u.mood).length > 0 ||
    u.loved.length > 0 || u.disliked.length > 0 || u.use !== null || u.climate !== null || u.projection !== null;
}

export { MOOD_KEYS, SENSORY_KEYS };

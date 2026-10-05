// Explanations are built from the scoring components, never invented: each
// reason names a component that scored well, with the data behind it.
import { FAMILY_KEYS, SENSORY_KEYS, type FamilyKey, type SensoryKey } from "./config";
import { profileSimilarity, type Components } from "./scoring";
import type { FragranceProfile } from "./profiles";
import { traitStrength } from "./profiles";
import { SCORING } from "./config";
import type { UserProfile } from "./userProfile";

export type ReasonKey =
  | "familyStrong" | "familyGood" | "sensoryDim" | "likeLoved" | "awayFromDisliked"
  | "moodFit" | "occasionFit" | "climateFit" | "intensityFit";
/** `arg`: a family, sensory dimension, use, climate, projection or fragrance name, per key. */
export interface Reason { key: ReasonKey; arg?: string }
export interface Caution { key: "avoidTrait" | "heavyForClimate" | "strongForCloseContact" | "thinData"; arg?: string }

const STRONG = 0.8, GOOD = 0.65, SENSORY_TOL = 12, LIKE_SIM = 0.75;

export function explain(user: UserProfile, f: FragranceProfile, c: Components): { reasons: Reason[]; cautions: Caution[] } {
  const reasons: Reason[] = [];
  if (c.family !== null) {
    const shared = [...FAMILY_KEYS].sort((a, b) => user.families[b] * f.families[b] - user.families[a] * f.families[a])[0] as FamilyKey;
    if (user.families[shared] * f.families[shared] > 0) {
      if (c.family >= STRONG) reasons.push({ key: "familyStrong", arg: shared });
      else if (c.family >= GOOD) reasons.push({ key: "familyGood", arg: shared });
    }
  }
  if (c.sensory !== null) {
    const matched = (Object.keys(user.sensory) as SensoryKey[])
      .filter((k) => SENSORY_KEYS.includes(k) && Math.abs((user.sensory[k] as number) - f.sensory[k]) <= SENSORY_TOL)
      .sort((a, b) => Math.abs((user.sensory[b] as number) - 50) - Math.abs((user.sensory[a] as number) - 50));
    for (const k of matched.slice(0, 2)) reasons.push({ key: "sensoryDim", arg: k });
  }
  if (c.knownFragrance !== null) {
    const near = user.loved.filter((p) => p.id !== f.id)
      .map((p) => ({ p, s: profileSimilarity(f, p) })).sort((a, b) => b.s - a.s)[0];
    if (near && near.s >= LIKE_SIM && c.knownFragrance >= GOOD) reasons.push({ key: "likeLoved", arg: near.p.name });
    else if (!user.loved.length && c.knownFragrance >= GOOD) reasons.push({ key: "awayFromDisliked" });
  }
  if (c.mood !== null && c.mood >= GOOD) reasons.push({ key: "moodFit" });
  if (c.occasion !== null && c.occasion >= GOOD && user.useKey) reasons.push({ key: "occasionFit", arg: user.useKey });
  if (c.climate !== null && c.climate >= STRONG && user.climateKey) reasons.push({ key: "climateFit", arg: user.climateKey });
  if (c.intensity !== null && c.intensity >= STRONG && user.projectionKey) reasons.push({ key: "intensityFit", arg: user.projectionKey });

  const cautions: Caution[] = [];
  for (const t of user.avoid) if (traitStrength(f, t) >= SCORING.cautionAt) cautions.push({ key: "avoidTrait", arg: t });
  if (c.climate !== null && c.climate < 0.5 && user.climate !== null) cautions.push({ key: "heavyForClimate", arg: user.climateKey ?? undefined });
  if (c.intensity !== null && c.intensity < 0.5 && user.socialCap !== null && f.sensory.intensity / 100 > user.socialCap) cautions.push({ key: "strongForCloseContact" });
  if (f.basis !== "accords") cautions.push({ key: "thinData", arg: f.basis });
  return { reasons: reasons.slice(0, 5), cautions };
}

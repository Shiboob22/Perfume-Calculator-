// The three result lines, built from the profile (never from a personality
// type): olfactory identity, sensory signature, current scent intent.
import { FAMILY_KEYS, SENSORY_KEYS, type FamilyKey, type SensoryKey } from "./config";
import type { UserProfile } from "./userProfile";

export interface Identity { families: FamilyKey[]; modifier: { dim: SensoryKey; high: boolean } | null }
export interface SignatureWord { dim: SensoryKey; high: boolean }

/** Up to three families within 60% of the strongest; null with no family signal. */
export function identityOf(u: UserProfile): Identity | null {
  const ranked = [...FAMILY_KEYS].sort((a, b) => u.families[b] - u.families[a] || FAMILY_KEYS.indexOf(a) - FAMILY_KEYS.indexOf(b));
  const top = u.families[ranked[0]];
  if (!(top > 0)) return null;
  const families = ranked.filter((k) => u.families[k] >= 0.6 * top).slice(0, 3);
  const mod = signatureOf(u, 25, ["warmth", "freshness", "darkness", "cleanliness", "density", "sweetness", "dryness"])[0] ?? null;
  return { families, modifier: mod };
}

/** Sensory dimensions the user leans on, strongest first (deviation from neutral 50). */
export function signatureOf(u: UserProfile, minDeviation = 15, only: readonly SensoryKey[] = SENSORY_KEYS, limit = 6): SignatureWord[] {
  return only
    .filter((k) => typeof u.sensory[k] === "number" && Math.abs((u.sensory[k] as number) - 50) >= minDeviation)
    .sort((a, b) => Math.abs((u.sensory[b] as number) - 50) - Math.abs((u.sensory[a] as number) - 50) || SENSORY_KEYS.indexOf(a) - SENSORY_KEYS.indexOf(b))
    .slice(0, limit)
    .map((dim) => ({ dim, high: (u.sensory[dim] as number) > 50 }));
}

/** Family bars scaled so the strongest reads 100 (display only). */
export function familyBars(u: UserProfile): { key: FamilyKey; value: number }[] {
  const top = Math.max(...FAMILY_KEYS.map((k) => u.families[k]));
  return FAMILY_KEYS.map((key) => ({ key, value: top > 0 ? Math.round((u.families[key] / top) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
}

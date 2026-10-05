// Scent Selector engine: answers + candidate catalog rows -> ranked, explained matches.
import { ACCORD_FAMILY, ACCORD_SENSORY, FAMILY_KEYS, SCORING, SENSORY_KEYS } from "./config";
import { profileFromRow, type CatalogRow, type FragranceProfile } from "./profiles";
import { avoidSeverity, calculateComponents, calculateOverallScore, constraintSeverity, type Components } from "./scoring";
import { explain, type Caution, type Reason } from "./explain";
import { dedupe, fragranceKey, hasSignal, variantKey, type UserProfile } from "./userProfile";

export interface Match {
  profile: FragranceProfile;
  /** Whole percent, 0-100. */
  percent: number;
  score: number;
  components: Components;
  reasons: Reason[];
  cautions: Caution[];
}
export type RecommendOutcome = { status: "ok"; matches: Match[] } | { status: "no-signal" | "empty"; matches: [] };

/** Rows -> profiles: unidentifiable rows and rows resting on a tier alone are dropped, duplicates collapsed. */
export function profilesFromRows(rows: readonly (CatalogRow | null | undefined)[] | null | undefined): FragranceProfile[] {
  const out: FragranceProfile[] = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const p = profileFromRow(row);
    if (p && p.confidence >= SCORING.minConfidence) out.push(p);
  }
  return collapseVariants(dedupe(out));
}

/** One profile per fragrance, in order seen, keeping the shortest name. */
function collapseVariants(list: FragranceProfile[]): FragranceProfile[] {
  const best = new Map<string, FragranceProfile>();
  for (const p of list) {
    const k = variantKey(p) ?? `solo:${best.size}`;
    const cur = best.get(k);
    if (!cur || p.name.length < cur.name.length) best.set(k, p);
  }
  return [...best.values()];
}

export function recommend(user: UserProfile, candidates: readonly FragranceProfile[], limit = SCORING.resultLimit): RecommendOutcome {
  if (!hasSignal(user)) return { status: "no-signal", matches: [] };
  const seen = new Set([...user.loved, ...user.disliked, ...user.unsure].flatMap((p) => [p.id, fragranceKey(p), variantKey(p) ?? p.id]));
  const matches = dedupe([...candidates])
    .filter((p) => !seen.has(p.id) && !seen.has(fragranceKey(p)) && !seen.has(variantKey(p) ?? p.id))
    .map((profile): Match => {
      const components = calculateComponents(user, profile);
      const overall = calculateOverallScore(components, { constraint: constraintSeverity(user, profile), avoid: avoidSeverity(user, profile) });
      // Thin source data (notes/family text only) shades the score slightly.
      const score = overall.score * (0.9 + 0.1 * profile.confidence);
      return { profile, score, percent: Math.round(score * 100), components, ...explain(user, profile, components) };
    })
    .sort((a, b) => b.score - a.score || a.profile.name.localeCompare(b.profile.name) || a.profile.id.localeCompare(b.profile.id))
    .slice(0, Math.max(0, limit));
  return matches.length ? { status: "ok", matches } : { status: "empty", matches: [] };
}

/**
 * Accords worth pulling candidates for: those carrying the user's families
 * and sensory leanings, plus the loved fragrances' own lead accords. One
 * catalog query on these replaces scanning every row.
 */
export function targetAccords(user: UserProfile, count = 12): string[] {
  const wantedSensory = Object.entries(user.sensory) as [(typeof SENSORY_KEYS)[number], number][];
  const score = new Map<string, number>();
  for (const accord of Object.keys(ACCORD_FAMILY)) {
    const fam = FAMILY_KEYS.reduce((a, k) => a + user.families[k] * (ACCORD_FAMILY[accord][k] ?? 0), 0);
    let sens = 0;
    if (wantedSensory.length) {
      const sig = ACCORD_SENSORY[accord] ?? {};
      const short = { freshness: "f", sweetness: "s", density: "d", darkness: "k", cleanliness: "c", intensity: "i", novelty: "n", warmth: "w", dryness: "y", sensuality: "x" } as const;
      sens = wantedSensory.reduce((a, [k, v]) => a + (1 - Math.abs(v - (sig[short[k]] ?? 50)) / 100), 0) / wantedSensory.length;
    }
    score.set(accord, fam * 2 + sens * 0.5);
  }
  const loved = user.loved.flatMap((p) => p.accords.slice(0, 3));
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([a]) => a);
  return [...new Set([...loved, ...ranked])].slice(0, count);
}

export { SELECTOR_WEIGHTS } from "./config";
export { buildUserProfile, hasSignal } from "./userProfile";
export type { Answers, KnownFragrance, KnownStatus, UserProfile } from "./userProfile";
export { profileFromRow } from "./profiles";
export type { FragranceProfile, CatalogRow } from "./profiles";
export { identityOf, signatureOf, familyBars } from "./naming";

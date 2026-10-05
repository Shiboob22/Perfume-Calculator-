// SOURCE catalog row -> DERIVED selector profile. Pure; no fabricated data:
// accords/notes/family text in, a profile (with how much source data it had)
// out. A row with only a tier gets confidence 0.25 and is never ranked.
import {
  ACCORD_FAMILY, ACCORD_SENSORY, CONTEXT_KEYS, FAMILY_KEYS, FAMILY_TEXT_ACCORD, MOOD_KEYS, NOTE_PATTERNS, SCORING,
  SENSORY_KEYS, SIG_DIM, TRAIT_ACCORDS, AVOID_TRAITS,
  type AvoidTrait, type ContextProfile, type FamilyProfile, type MoodProfile, type SensoryProfile,
} from "./config";

/** The catalog columns the selector reads (all optional: rows vary). */
export interface CatalogRow {
  id?: unknown;
  name?: unknown;
  brand?: unknown;
  tier?: unknown;
  accords?: unknown;
  top_notes?: unknown;
  middle_notes?: unknown;
  base_notes?: unknown;
  all_notes?: unknown;
  olfactory_family?: unknown;
  [key: string]: unknown;
}

export type ProfileBasis = "accords" | "notes" | "family" | "tier";

export interface FragranceProfile {
  id: string;
  name: string;
  brand: string | null;
  basis: ProfileBasis;
  /** 1 accords, 0.7 notes, 0.6 family text, 0.25 tier only. */
  confidence: number;
  families: FamilyProfile;
  sensory: SensoryProfile;
  mood: MoodProfile;
  context: ContextProfile;
  /** Share of accord weight per accord (sums to 1), for trait checks. */
  accordShare: Record<string, number>;
  accords: string[];
  /** The original row, handed back to the app (e.g. the calculator). */
  row: CatalogRow;
}

/** Fewer listed accords than this are topped up from the notes. */
const THIN_ACCORDS = 4;
const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const emptyFamilies = (): FamilyProfile => Object.fromEntries(FAMILY_KEYS.map((k) => [k, 0])) as FamilyProfile;

/** A text array from an untrusted value: strings only, trimmed, non-empty. */
export function textList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : [];
}

function notesOf(row: CatalogRow): string[] {
  const all = textList(row.all_notes);
  return all.length ? all : [...textList(row.top_notes), ...textList(row.middle_notes), ...textList(row.base_notes)];
}

/** Ranked pseudo-accords from notes, first occurrence kept. */
function accordsFromNotes(notes: string[]): string[] {
  const out: string[] = [];
  for (const note of notes) {
    const hit = NOTE_PATTERNS.find(([re]) => re.test(note));
    if (hit && !out.includes(hit[1])) out.push(hit[1]);
  }
  return out;
}

function accordsFromFamilyText(text: string): string[] {
  const out: string[] = [];
  for (const [re, accord] of FAMILY_TEXT_ACCORD) if (re.test(text) && !out.includes(accord)) out.push(accord);
  return out;
}

/** Rank-weighted share per accord (known accords only), summing to 1. */
function sharesOf(accords: string[]): Record<string, number> {
  const known = accords.filter((a) => a in ACCORD_FAMILY || a in ACCORD_SENSORY);
  const raw = known.map((_, i) => SCORING.rankDecay ** i);
  const total = raw.reduce((a, b) => a + b, 0);
  const share: Record<string, number> = {};
  known.forEach((a, i) => { share[a] = (share[a] ?? 0) + raw[i] / total; });
  return share;
}

function familiesFromShares(share: Record<string, number>): FamilyProfile {
  const f = emptyFamilies();
  for (const [accord, s] of Object.entries(share)) {
    for (const [k, w] of Object.entries(ACCORD_FAMILY[accord] ?? {})) f[k as keyof FamilyProfile] += s * (w ?? 0);
  }
  return normalizeFamilies(f);
}

export function normalizeFamilies(f: FamilyProfile): FamilyProfile {
  const total = FAMILY_KEYS.reduce((a, k) => a + (Number.isFinite(f[k]) ? Math.max(0, f[k]) : 0), 0);
  const out = emptyFamilies();
  if (total > 0) for (const k of FAMILY_KEYS) out[k] = Math.max(0, f[k]) / total;
  return out;
}

function sensoryFromShares(share: Record<string, number>): SensoryProfile {
  const out = {} as SensoryProfile;
  for (const [short, dim] of Object.entries(SIG_DIM)) {
    let sum = 0, weight = 0;
    for (const [accord, s] of Object.entries(share)) {
      const v = ACCORD_SENSORY[accord]?.[short as keyof typeof SIG_DIM];
      if (v !== undefined) { sum += s * v; weight += s; }
    }
    out[dim] = weight > 0 ? sum / weight : 50; // no evidence: neutral
  }
  return out;
}

// Mood and occasion are derived from the sensory profile with fixed rules
// (documented in config.ts as conventions, not measurements).
export function moodFromSensory(s: SensoryProfile): MoodProfile {
  return {
    energy: clamp((0.5 * s.freshness + 0.3 * (100 - s.density) + 0.2 * (100 - s.darkness)) / 100) * 100,
    presence: clamp((0.6 * s.intensity + 0.4 * s.density) / 100) * 100,
    warmth: s.warmth,
    sensuality: s.sensuality,
    novelty: s.novelty,
  };
}

export function contextFromSensory(s: SensoryProfile): ContextProfile {
  const n = (x: number) => x / 100;
  return {
    office: clamp(0.4 * n(s.cleanliness) + 0.3 * n(100 - s.intensity) + 0.2 * n(100 - s.darkness) + 0.1 * n(100 - s.sweetness)),
    casual: clamp(0.4 * n(s.freshness) + 0.3 * n(s.cleanliness) + 0.3 * n(100 - s.density)),
    date: clamp(0.4 * n(s.sensuality) + 0.3 * n(s.warmth) + 0.2 * n(s.sweetness) + 0.1 * n(s.intensity)),
    evening: clamp(0.35 * n(s.darkness) + 0.3 * n(s.density) + 0.2 * n(s.warmth) + 0.15 * n(s.intensity)),
    formal: clamp(0.3 * n(s.dryness) + 0.3 * n(100 - s.sweetness) + 0.2 * n(s.cleanliness) + 0.2 * n(s.density)),
    outdoor: clamp(0.5 * n(s.freshness) + 0.3 * n(100 - s.density) + 0.2 * n(s.dryness)),
    home: clamp(0.4 * n(s.warmth) + 0.3 * n(s.sweetness) + 0.3 * n(100 - s.intensity)),
  };
}

/** How heavy a fragrance reads for the weather, 0 (light) - 1 (heavy). */
export function heaviness(s: SensoryProfile): number {
  return clamp((0.35 * s.warmth + 0.3 * s.density + 0.2 * s.sweetness + 0.15 * s.darkness - 0.2 * s.freshness) / 100);
}

/** 0-1 strength of an avoided trait in a fragrance. */
export function traitStrength(p: FragranceProfile, trait: AvoidTrait): number {
  const names = TRAIT_ACCORDS[trait];
  if (names) return clamp(3 * names.reduce((a, n) => a + (p.accordShare[n] ?? 0), 0));
  if (trait === "sweet") return clamp((p.sensory.sweetness - 55) / 35);
  const fam = trait === "floral" ? "floral" : trait === "fruity" ? "fruity" : "gourmand";
  return clamp((p.families[fam] - 0.2) / 0.4);
}

export const isAvoidTrait = (v: unknown): v is AvoidTrait => AVOID_TRAITS.includes(v as AvoidTrait);

/**
 * Derive a profile from a catalog row. Returns null when the row can't be
 * identified (no id or name). Missing or malformed fields are treated as
 * absent; the profile then says how little it rests on (`basis`).
 */
export function profileFromRow(row: CatalogRow | null | undefined): FragranceProfile | null {
  if (!row || typeof row !== "object") return null;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const id = row.id == null || row.id === "" ? name : String(row.id);
  if (!name || !id) return null;

  const accords = textList(row.accords);
  const familyText = typeof row.olfactory_family === "string" ? row.olfactory_family : "";
  let basis: ProfileBasis = "tier";
  let used: string[] = [];
  if (accords.length) {
    basis = "accords"; used = accords;
    // A short accord list is thin: add what the notes show, after the listed accords.
    if (accords.length < THIN_ACCORDS) used = [...accords, ...accordsFromNotes(notesOf(row)).filter((a) => !accords.includes(a))];
  }
  else {
    const fromNotes = accordsFromNotes(notesOf(row));
    if (fromNotes.length) { basis = "notes"; used = fromNotes; }
    else {
      const fromText = accordsFromFamilyText(familyText);
      if (fromText.length) { basis = "family"; used = fromText; }
    }
  }
  const share = sharesOf(used);
  if (!Object.keys(share).length) basis = "tier";

  // The family text is real source data too: blended into accord families.
  let families = familiesFromShares(share);
  const textShare = sharesOf(accordsFromFamilyText(familyText));
  if (basis === "accords" && Object.keys(textShare).length) {
    const text = familiesFromShares(textShare);
    const mix = emptyFamilies();
    for (const k of FAMILY_KEYS) mix[k] = (1 - SCORING.familyTextShare) * families[k] + SCORING.familyTextShare * text[k];
    families = normalizeFamilies(mix);
  }
  const sensory = sensoryFromShares(share);
  return {
    id, name,
    brand: typeof row.brand === "string" && row.brand.trim() ? row.brand.trim() : null,
    basis,
    confidence: { accords: 1, notes: 0.7, family: 0.6, tier: 0.25 }[basis],
    families, sensory,
    mood: moodFromSensory(sensory),
    context: contextFromSensory(sensory),
    accordShare: share,
    accords: Object.keys(share),
    row,
  };
}

export { SENSORY_KEYS, MOOD_KEYS, CONTEXT_KEYS, FAMILY_KEYS };

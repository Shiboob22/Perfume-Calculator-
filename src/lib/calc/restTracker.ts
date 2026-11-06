// The Journal room's rest tracker (Bench SaaS Phase 5): every batch rests
// 90 days, noted at five milestones. Notes are the batch's journal
// check-ins (batch_checkins, 0012 + tags 0031); this module only decides
// which check-in belongs to which milestone and how far along a batch is.
// Days are whole rest days from restDay() (0 on the day it was poured).

/** Days until a batch counts as ready in the Journal. */
export const REST_DAYS = 90;
/** A batch logged this recently, with no note yet, is "New". */
export const FRESH_HOURS = 48;

export const MILESTONES = Object.freeze([
  { k: "d1", days: 0 },
  { k: "w1", days: 7 },
  { k: "w2", days: 14 },
  { k: "m1", days: 30 },
  { k: "m3", days: 90 },
] as const);

export type MilestoneKey = (typeof MILESTONES)[number]["k"];

export interface JournalNote {
  id: string;
  day: number;
  scheduled_day?: number | null;
  note?: string | null;
  rating?: number | null;
  tags?: string[] | null;
  skipped?: boolean | null;
  created_at?: string | null;
}

/** The milestone a rest day falls under: the last one reached (index). */
export function milestoneIndex(day: number): number {
  let i = 0;
  for (let n = 0; n < MILESTONES.length; n++) if (day >= MILESTONES[n].days) i = n;
  return i;
}

/**
 * Each milestone's note. A check-in made for that milestone's day wins;
 * otherwise the latest note written in its stretch (from its day to the
 * next milestone's), so notes from the older family schedule (day 1, the
 * family's rest days) still show. Skips are not notes.
 */
export function notesByMilestone(checkins: readonly JournalNote[] | null | undefined): Partial<Record<MilestoneKey, JournalNote>> {
  const out: Partial<Record<MilestoneKey, JournalNote>> = {};
  const exact = new Set<MilestoneKey>();
  for (const c of checkins ?? []) {
    if (c.skipped) continue;
    const m = MILESTONES.find((x) => x.days === c.scheduled_day);
    if (m) { out[m.k] = c; exact.add(m.k); continue; }
    const k = MILESTONES[milestoneIndex(c.scheduled_day ?? c.day)].k;
    if (exact.has(k)) continue;
    const prev = out[k];
    if (!prev || String(c.created_at ?? "") >= String(prev.created_at ?? "")) out[k] = c;
  }
  return out;
}

export type Dot = "note" | "reached" | "future";

/** ● a note, ○ reached without one, · still ahead: one per milestone. */
export function milestoneDots(checkins: readonly JournalNote[] | null | undefined, day: number): Dot[] {
  const notes = notesByMilestone(checkins);
  return MILESTONES.map((m) => (notes[m.k] ? "note" : m.days <= day ? "reached" : "future"));
}

export const DOT_GLYPH: Readonly<Record<Dot, string>> = Object.freeze({ note: "●", reached: "○", future: "·" });

/** How far into the 90 days a batch is. */
export function restProgress(day: number) {
  const d = Math.max(0, Math.floor(day));
  return { day: Math.min(d, REST_DAYS), left: Math.max(0, REST_DAYS - d), ready: d >= REST_DAYS, fraction: Math.min(1, d / REST_DAYS) };
}

/**
 * Where today sits on the timeline, 0–1, with the five milestones evenly
 * spaced: piecewise between the two milestones today falls between.
 */
export function trackPosition(day: number): number {
  const M = MILESTONES;
  const last = M.length - 1;
  if (day >= M[last].days) return 1;
  const i = milestoneIndex(Math.max(0, day));
  return (i + (Math.max(0, day) - M[i].days) / (M[i + 1].days - M[i].days)) / last;
}

/** "Ready soon": nearest first, ready batches last (stable otherwise). */
export function readySoonOrder<T extends { day: number }>(items: readonly T[]): T[] {
  return items
    .map((x, i) => ({ x, i, left: REST_DAYS - x.day }))
    .sort((a, b) => Number(a.left <= 0) - Number(b.left <= 0) || (a.left <= 0 ? 0 : a.left - b.left) || a.i - b.i)
    .map((e) => e.x);
}

/** "New": logged in the last FRESH_HOURS and not noted yet. */
export function isFresh(createdAt: string | null | undefined, checkins: readonly JournalNote[] | null | undefined, now: Date): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  const age = now.getTime() - t;
  return age >= 0 && age < FRESH_HOURS * 3600 * 1000 && !(checkins ?? []).some((c) => !c.skipped);
}

/**
 * The milestone a batch owes a note for, or null: the one it has reached
 * (older missed milestones don't count) when that milestone has no note.
 * `left` is the days until the next milestone closes its window
 * (Infinity at the last one, which never closes).
 */
export function needsNote(checkins: readonly JournalNote[] | null | undefined, day: number): { k: MilestoneKey; left: number } | null {
  const i = milestoneIndex(Math.max(0, day));
  const m = MILESTONES[i];
  if (notesByMilestone(checkins)[m.k]) return null;
  const next = MILESTONES[i + 1];
  return { k: m.k, left: next ? next.days - Math.max(0, day) : Infinity };
}

/** The Journal list's sorts (journal sort brief v1). The first is the default. */
export const JOURNAL_SORTS = Object.freeze(["note", "new", "rest", "size"] as const);
export type JournalSort = (typeof JOURNAL_SORTS)[number];

/** A known sort key, else the default. */
export function journalSortKey(v: unknown): JournalSort {
  return (JOURNAL_SORTS as readonly unknown[]).includes(v) ? (v as JournalSort) : JOURNAL_SORTS[0];
}

export interface SortItem {
  /** Rest day today. */ day: number;
  /** Batch number. */ no: number;
  /** Total volume in mL, as logged. */ ml: number;
  /** When the rest started, ms since the epoch. */ start: number;
  checkins?: readonly JournalNote[] | null;
}

/**
 * The Journal list in one of its four orders. Every order ends on batch
 * number, newest first, so it is stable.
 * - note: batches owing a note first, the window closing soonest leading;
 *   then the rest.
 * - new: newest first.
 * - rest: started earliest first (closest to ready, ready ones on top).
 * - size: largest total volume first.
 */
export function journalSort<T extends SortItem>(items: readonly T[], key: unknown): T[] {
  const k = journalSortKey(key);
  const rows = items.map((x) => ({ x, due: k === "note" ? needsNote(x.checkins, x.day) : null }));
  const byNo = (a: T, b: T) => b.no - a.no;
  const num = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);
  const cmp: Record<JournalSort, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
    note: (a, b) => Number(!a.due) - Number(!b.due) || (a.due && b.due ? a.due.left - b.due.left || 0 : 0),
    new: () => 0,
    rest: (a, b) => num(a.x.start, Infinity) - num(b.x.start, Infinity),
    size: (a, b) => num(b.x.ml, -Infinity) - num(a.x.ml, -Infinity),
  };
  return rows.sort((a, b) => cmp[k](a, b) || byNo(a.x, b.x)).map((r) => r.x);
}

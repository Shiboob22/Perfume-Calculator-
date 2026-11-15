// The maturation curve (Journal J3): a batch's own ratings drawn against rest
// day. Pure geometry, no drawing: the component turns these numbers into SVG.
// Only the user's own notes count, worded as their history; nothing here
// claims anything about maceration.
import { MILESTONES, milestoneIndex, type MilestoneKey, type JournalNote } from "./restTracker";

/** Notes with a rating needed before a curve is drawn; fewer show a plain line. */
export const MIN_CURVE_NOTES = 3;
/** The curve always spans at least the full rest. */
export const CURVE_DAYS = 90;

export interface CurveBox {
  width: number;
  height: number;
  /** Space kept free on each side for the points and their labels. */
  pad?: { top: number; right: number; bottom: number; left: number };
}

export interface CurvePoint {
  id: string;
  /** Rest day the note was written. */
  day: number;
  rating: number;
  tags: readonly string[];
  /** The milestone that day falls under. */
  k: MilestoneKey;
  x: number;
  y: number;
}

export interface Curve {
  /** Rated, non-skipped notes by day, as points. */
  points: CurvePoint[];
  /** Enough points (MIN_CURVE_NOTES) to draw the line; fewer is a plain line. */
  enough: boolean;
  /** SVG path through the points ("M x y L x y …"), empty with fewer than two. */
  path: string;
  /** The earliest day that reached the best rating (see peakOf), else null. */
  peak: { day: number; rating: number; k: MilestoneKey; id: string } | null;
  /** Milestone ticks along the day axis. */
  ticks: Array<{ k: MilestoneKey; days: number; x: number }>;
  /** Days the axis spans. */
  span: number;
}

const DEFAULT_PAD = { top: 12, right: 14, bottom: 22, left: 14 };

/**
 * The day a batch rated best: the EARLIEST day that reached its best rating
 * (a 4, 5, 5, 5 run "peaks" on the first 5: the day it got as good as it
 * gets, not later because the user kept checking). Same rule as peakDay() in
 * journal.ts; null with fewer than two ratings.
 */
export function peakOf(points: readonly Pick<CurvePoint, "day" | "rating" | "k" | "id">[]) {
  if (points.length < 2) return null;
  const best = Math.max(...points.map((p) => p.rating));
  const first = [...points].filter((p) => p.rating === best).sort((a, b) => a.day - b.day)[0];
  return { day: first.day, rating: first.rating, k: first.k, id: first.id };
}

/** x for a rest day inside the box (day 0 at the left padding, `span` at the right). */
function xOf(day: number, span: number, w: number, pad: { left: number; right: number }): number {
  const inner = Math.max(1, w - pad.left - pad.right);
  return round(pad.left + (Math.min(Math.max(day, 0), span) / span) * inner);
}

/** y for a rating 1–5 (5 at the top padding, 1 at the bottom). */
function yOf(rating: number, h: number, pad: { top: number; bottom: number }): number {
  const inner = Math.max(1, h - pad.top - pad.bottom);
  return round(pad.top + ((5 - Math.min(Math.max(rating, 1), 5)) / 4) * inner);
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * A batch's curve from its notes. Several notes on one day keep the latest
 * written; skips and unrated notes are left out. The axis spans the full
 * rest, longer when a note was written past it.
 */
export function buildCurve(checkins: readonly JournalNote[] | null | undefined, box: CurveBox): Curve {
  const pad = { ...DEFAULT_PAD, ...box.pad };
  const byDay = new Map<number, JournalNote>();
  for (const c of checkins ?? []) {
    if (c.skipped || c.rating == null || c.rating < 1 || c.rating > 5) continue;
    const prev = byDay.get(c.day);
    if (!prev || String(c.created_at ?? "") >= String(prev.created_at ?? "")) byDay.set(c.day, c);
  }
  const notes = [...byDay.values()].sort((a, b) => a.day - b.day);
  const span = Math.max(CURVE_DAYS, ...notes.map((n) => n.day));
  const points: CurvePoint[] = notes.map((n) => ({
    id: n.id, day: n.day, rating: n.rating as number, tags: n.tags ?? [],
    k: MILESTONES[milestoneIndex(n.day)].k,
    x: xOf(n.day, span, box.width, pad), y: yOf(n.rating as number, box.height, pad),
  }));
  const path = points.length >= 2 ? points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ") : "";
  return {
    points,
    enough: points.length >= MIN_CURVE_NOTES,
    path,
    peak: peakOf(points),
    ticks: MILESTONES.map((m) => ({ k: m.k, days: m.days, x: xOf(m.days, span, box.width, pad) })),
    span,
  };
}

/** A rest range in days, [earliest wearable, fully rested]. */
export type RestRange = readonly [number, number];

// The Resting Journal: when a resting batch is due a check-in, and the
// personal "peak" pattern drawn from a user's own ratings. The rest range
// comes from the caller (the family's restDays in formulation.ts), so this
// module holds no numbers of its own.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days after the last scheduled point during which it is still due. */
export const LAST_POINT_WINDOW = 7;
/** Days after the end of the rest range for the follow-up check-in. */
export const FOLLOW_UP_AFTER_REST = 14;
/** At most this many check-ins on one batch (scheduled + ad hoc). */
export const MAX_CHECKINS_PER_BATCH = 20;
/** Batches with a usable peak needed before a family shows a pattern. */
export const MIN_BATCHES_FOR_PATTERN = 3;

export interface CheckIn {
  batch_id: string;
  day: number;
  scheduled_day?: number | null;
  rating?: number | null;
  skipped?: boolean;
}

export interface CheckInPoint {
  /** Rest day the point opens on. */
  day: number;
  /** First rest day it is no longer due (exclusive). */
  until: number;
}

/** Whole days of rest from `start` to `at` (0 on the day it was made). */
export function restDay(start: Date, at: Date): number {
  return Math.max(0, Math.floor((at.getTime() - start.getTime()) / DAY_MS));
}

/**
 * The scheduled check-ins for a rest range [lo, hi]: day 1 (baseline), lo
 * (earliest wearable), hi (fully rested) and hi + 14 (past it, so a peak can
 * show as a peak). Each stays due until the next one opens; the last for a
 * week.
 */
export function checkInSchedule(rest: RestRange): CheckInPoint[] {
  const days = [...new Set([1, rest[0], rest[1], rest[1] + FOLLOW_UP_AFTER_REST])]
    .filter((d) => d >= 1)
    .sort((a, b) => a - b);
  return days.map((day, i) => ({ day, until: days[i + 1] ?? day + LAST_POINT_WINDOW }));
}

export interface RestingBatch {
  id: string;
  startedAt: Date | null;
  rest: RestRange | null | undefined;
}

export interface DueCheckIn {
  batchId: string;
  /** The scheduled point being answered. */
  scheduledDay: number;
  /** Today's rest day (what the check-in records as `day`). */
  day: number;
}

/**
 * Check-ins due now: for each batch, the scheduled point whose window
 * contains today, unless that point was already answered or skipped.
 * Windows don't overlap, so a batch has at most one due point; a point
 * whose window has passed is simply missed.
 */
export function dueCheckIns(batches: RestingBatch[], checkins: CheckIn[], now: Date): DueCheckIn[] {
  const answered = new Set(
    checkins.filter((c) => c.scheduled_day != null).map((c) => `${c.batch_id}:${c.scheduled_day}`)
  );
  const due: DueCheckIn[] = [];
  for (const b of batches) {
    if (!b.startedAt || !b.rest) continue;
    const day = restDay(b.startedAt, now);
    const point = checkInSchedule(b.rest).find((p) => day >= p.day && day < p.until);
    if (point && !answered.has(`${b.id}:${point.day}`)) {
      due.push({ batchId: b.id, scheduledDay: point.day, day });
    }
  }
  return due;
}

/**
 * The rest day one batch rated best, from its own check-ins; null when the
 * batch can't say yet.
 *
 * Proposed rule (for the owner's review):
 *   - only rated, non-skipped check-ins count, scheduled or ad hoc;
 *   - at least two ratings, and at least one after day 1, so the answer
 *     compares the rested blend with something;
 *   - the peak is the EARLIEST day that reached the batch's best rating.
 *     A blend rated 4, 5, 5, 5 "peaks" on the first 5: the day it got as
 *     good as it gets, which is what "when is it ready" asks. Taking the
 *     latest or the middle of a plateau would push the answer later just
 *     because the user kept checking.
 */
export function peakDay(checkins: CheckIn[]): number | null {
  const rated = checkins.filter((c) => !c.skipped && c.rating != null && c.rating >= 1);
  if (rated.length < 2 || !rated.some((c) => c.day > 1)) return null;
  const best = Math.max(...rated.map((c) => c.rating as number));
  return Math.min(...rated.filter((c) => c.rating === best).map((c) => c.day));
}

export interface PeakPattern {
  /** Median of the batches' peak days, whole days. */
  day: number;
  min: number;
  max: number;
  /** Batches it was drawn from. */
  batches: number;
}

/**
 * A family's pattern from the user's own batches (each given as its list of
 * check-ins): the median peak day, its spread and how many batches it rests
 * on. Null until MIN_BATCHES_FOR_PATTERN batches have a peak.
 */
export function peakPattern(batchCheckIns: CheckIn[][]): PeakPattern | null {
  const peaks = batchCheckIns.map(peakDay).filter((d): d is number => d !== null).sort((a, b) => a - b);
  if (peaks.length < MIN_BATCHES_FOR_PATTERN) return null;
  const mid = peaks.length >> 1;
  const median = peaks.length % 2 ? peaks[mid] : (peaks[mid - 1] + peaks[mid]) / 2;
  return { day: Math.round(median), min: peaks[0], max: peaks[peaks.length - 1], batches: peaks.length };
}

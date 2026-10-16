// The Resting Journal in the app: logged batches (as /api/batches returns
// them, with their check-ins) turned into the calc core's inputs. The
// schedule and pattern rules themselves live in src/lib/calc/journal.ts.
import { TIERS } from "./tiers";
import { batchStartedAt } from "./batchTiming";
import { dueCheckIns, restDay, peakDay } from "./calc";

export function restingBatch(batch) {
  return { id: batch.id, startedAt: batchStartedAt(batch), rest: TIERS[batch.tier]?.restDays ?? null };
}

/** Check-ins due now across the batches, each with its batch. */
export function dueNow(batches, now = new Date()) {
  const checkins = batches.flatMap((b) => (b.batch_checkins || []).map((c) => ({ ...c, batch_id: b.id })));
  const byId = new Map(batches.map((b) => [b.id, b]));
  return dueCheckIns(batches.map(restingBatch), checkins, now).map((d) => ({ ...d, batch: byId.get(d.batchId) }));
}

/** Today's rest day for a batch (what an ad-hoc check-in records). */
export function todayFor(batch, now = new Date()) {
  const start = batchStartedAt(batch);
  return start ? restDay(start, now) : 0;
}

// Tells the app header to recount due check-ins after one is saved.
export const JOURNAL_CHANGED = "sh-journal-changed";

/**
 * Days to offer as "rested before wearing" when sharing: the day the batch
 * rated best, else its latest check-in, else the end of its family's rest.
 */
export function suggestedRestDays(batch) {
  const checkins = (batch.batch_checkins || []).filter((c) => !c.skipped);
  const peak = peakDay(checkins.map((c) => ({ ...c, batch_id: batch.id })));
  if (peak != null) return peak;
  if (checkins.length) return Math.max(...checkins.map((c) => c.day));
  return TIERS[batch.tier]?.restDays?.[1] ?? null;
}

/** A batch's share state from the batch list (one-to-one embed). */
export function shareOf(batch) {
  const s = batch.shared_recipes;
  return (Array.isArray(s) ? s[0] : s) || null;
}

/**
 * A batch's rest at a glance, for the journal panel: today's rest day, the
 * family's full rest (the target), whether it is ready, and one bar per day
 * (at least 30) marked past / today / future, with the days that have a
 * check-in. Null when the batch has no start time.
 */
export function restTimeline(batch, now = new Date()) {
  const start = batchStartedAt(batch);
  if (!start) return null;
  const day = restDay(start, now);
  const target = TIERS[batch.tier]?.restDays?.[1] ?? null;
  const span = Math.max(30, target ?? 0, day + 1);
  const noted = new Set((batch.batch_checkins || []).filter((c) => !c.skipped).map((c) => c.day));
  const bars = Array.from({ length: span }, (_, d) => ({
    day: d,
    state: d < day ? "past" : d === day ? "today" : "future",
    checkIn: noted.has(d),
    height: (d + 1) / span,
  }));
  return { day, target, ready: target != null && day >= target, bars };
}

/**
 * The batch that will finish resting soonest, for the quiet line on the
 * Bench: { batch, day, target, left } with `left` days to go, or null when
 * nothing is resting (every batch ready, or no family rest to count to).
 */
export function nextReady(batches, now = new Date()) {
  let best = null;
  for (const batch of batches) {
    const tl = restTimeline(batch, now);
    if (!tl || tl.target == null || tl.ready) continue;
    const left = tl.target - tl.day;
    if (!best || left < best.left) best = { batch, day: tl.day, target: tl.target, left };
  }
  return best;
}

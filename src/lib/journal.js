// The Resting Journal in the app: logged batches (as /api/batches returns
// them, with their check-ins) turned into the calc core's inputs. The
// schedule and pattern rules themselves live in src/lib/calc/journal.ts.
import { TIERS } from "./tiers";
import { batchStartedAt } from "./batchTiming";
import { dueCheckIns, restDay } from "./calc";

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

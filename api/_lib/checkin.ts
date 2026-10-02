// @ts-ignore: plain JS shared with the browser
import { cleanText } from '../../src/lib/publicText.js';
import { UUID } from './http.js';

export interface CheckInRow {
  id: string;
  batch_id: string;
  day: number;
  scheduled_day: number | null;
  note: string | null;
  rating: number | null;
  skipped: boolean;
}

const isDay = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 730;

/**
 * A check-in from a request body, checked against the same rules as the
 * table (0012), or the reason it can't be stored. The note is private, but
 * cleaned like public text all the same.
 */
export function parseCheckIn(body: any): { row: CheckInRow } | { error: string } {
  const b = body ?? {};
  if (typeof b.id !== 'string' || !UUID.test(b.id)) return { error: 'A check-in needs an id.' };
  if (typeof b.batch_id !== 'string' || !UUID.test(b.batch_id)) return { error: 'A check-in needs its batch.' };
  if (!isDay(b.day)) return { error: 'The rest day must be a whole number from 0 to 730.' };
  const scheduled = b.scheduled_day ?? null;
  if (scheduled !== null && !isDay(scheduled)) return { error: 'The scheduled day must be a whole number from 0 to 730.' };
  const skipped = b.skipped === true;
  const note = skipped ? null : cleanText(b.note, 280);
  const rating = skipped || b.rating == null ? null : b.rating;
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    return { error: 'The rating must be a whole number from 1 to 5.' };
  }
  if (skipped && scheduled === null) return { error: 'Only a scheduled check-in can be skipped.' };
  if (!skipped && note === null && rating === null) return { error: 'Write a line or give a rating.' };
  return { row: { id: b.id, batch_id: b.batch_id, day: b.day, scheduled_day: scheduled, note, rating, skipped } };
}

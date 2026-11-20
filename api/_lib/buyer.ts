// The QR buyer page's server rules (0040, order queue P1b). Pure, so the
// handler in api/batches.ts stays a thin router and every rule has a test.
// The buyer is anonymous: the order's code is the only key they hold, so
// nothing here ever returns the seller's price, batch weights or the name
// on the original order.

import { LASTS, TAGS } from '../../src/lib/noteTags.js';

export const BUYER_CODE = /^[0-9a-f]{32}$/;
/** A buyer may change their answer for this long after first sending it. */
export const FEEDBACK_EDIT_DAYS = 30;
/** Most "Order again" requests one seller may have waiting, a runaway guard. */
export const REQUESTED_CAP = 50;
/** Orders a buyer page answers for; a cancelled or requested order is "not found". */
export const SHOWN = ['queued', 'planned', 'resting', 'ready', 'bottled', 'handed_over'];

type Result = { row: Record<string, unknown> } | { error: string; field: string };
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

/** A buyer's answer: any of rating, one line, how it lasts, tags; at least one. */
export function feedbackRow(input: unknown): Result {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const row: Record<string, unknown> = { rating: null, note: null, lasts: null, tags: [] };
  if (b.rating != null && b.rating !== '') {
    const n = Number(b.rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) return { error: 'Rating must be 1 to 5.', field: 'rating' };
    row.rating = n;
  }
  row.note = text(b.note, 280) || null;
  if (b.lasts != null && b.lasts !== '') {
    if (!LASTS.includes(b.lasts as string)) return { error: 'Unknown answer.', field: 'lasts' };
    row.lasts = b.lasts;
  }
  if (b.tags != null) {
    if (!Array.isArray(b.tags) || !b.tags.every((t) => TAGS.includes(t))) return { error: 'Unknown tag.', field: 'tags' };
    row.tags = TAGS.filter((t) => (b.tags as unknown[]).includes(t));
  }
  if (row.rating == null && row.note == null && row.lasts == null && (row.tags as string[]).length === 0) {
    return { error: 'Nothing to send.', field: 'feedback' };
  }
  return { row };
}

const PHONE = /^\+?[0-9][0-9 ()\-.]{5,30}$/;

/** "Order again": the buyer's name and phone (both needed to reach them). */
export function reorderRow(input: unknown): Result {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = text(b.name, 120);
  if (!name) return { error: 'Your name is needed.', field: 'name' };
  const phone = text(b.phone, 40);
  if (!PHONE.test(phone) || phone.replace(/\D/g, '').length < 6) return { error: 'A phone number is needed.', field: 'phone' };
  return { row: { buyer_name: name, buyer_contact: phone } };
}

/** The new order an "Order again" makes: the same bottle, waiting for the seller. */
export function requestedOrder(from: Record<string, any>, who: { buyer_name: string; buyer_contact: string }) {
  return {
    user_id: from.user_id,
    buyer_name: who.buyer_name,
    buyer_contact: who.buyer_contact,
    recipe_version_id: from.recipe_version_id ?? null,
    fragrance_id: from.fragrance_id ?? null,
    scent_text: from.scent_text,
    family: from.family ?? null,
    size_ml: from.size_ml,
    strength_pct: from.strength_pct,
    price: from.price ?? null,
    list_price: from.list_price ?? null,
    currency: from.currency ?? null,
    group_mode: from.group_mode ?? 'mix',
    note: null,
    status: 'requested',
    requested_from: from.id,
  };
}

/** True while the buyer may still change the answer they sent first at `createdAt`. */
export function feedbackOpen(createdAt: string | null | undefined, now = new Date()): boolean {
  if (!createdAt) return true;
  const t = Date.parse(createdAt);
  return !Number.isFinite(t) || now.getTime() - t < FEEDBACK_EDIT_DAYS * 86400000;
}

/** What the buyer page may show about one order: the bottle, the shop, their own answer. */
export function publicOrder(order: Record<string, any>, shopName: string | null | undefined, feedback: Record<string, any> | null, now = new Date()) {
  return {
    shop: shopName?.trim() || null,
    scent: order.scent_text,
    family: order.family ?? null,
    size_ml: Number(order.size_ml),
    strength_pct: Number(order.strength_pct),
    bottled_on: order.bottled_at ? String(order.bottled_at).slice(0, 10) : null,
    feedback: feedback ? { rating: feedback.rating, note: feedback.note, lasts: feedback.lasts, tags: feedback.tags ?? [] } : null,
    can_edit: feedbackOpen(feedback?.created_at, now),
  };
}

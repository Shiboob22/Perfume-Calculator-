// The order queue's server rules (0035, Phase A): what an order may hold and
// which fields a client may change. Pure, so the handler stays a thin
// router and every rule has a test. The batch plan itself is computed in the
// browser (src/lib/calc/orderPlan.ts); the server stores orders only.

import { UUID } from './http.js';

/** Most orders one user may keep (any status), a runaway guard. */
export const ORDER_CAP = 1000;
export const FAMILIES = ['fresh', 'floral', 'woody', 'oriental', 'gourmand'];
export const GROUP_MODES = ['mix', 'separate'];

/** Columns a client may write; everything else is the server's. */
const EDITABLE = [
  'buyer_name', 'buyer_contact', 'recipe_version_id', 'fragrance_id', 'scent_text', 'family',
  'size_ml', 'strength_pct', 'price', 'currency', 'wanted_by', 'note', 'group_mode',
] as const;

const REQUIRED: readonly string[] = ['buyer_name', 'scent_text', 'size_ml', 'strength_pct'];

type Result = { row: Record<string, unknown> } | { error: string; field: string };

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function field(name: (typeof EDITABLE)[number], v: unknown): { value: unknown } | { error: string } {
  switch (name) {
    case 'buyer_name':
    case 'scent_text': {
      const s = text(v, 120);
      return s ? { value: s } : { error: `${name} is required.` };
    }
    case 'buyer_contact':
    case 'note': {
      const s = text(v, name === 'note' ? 500 : 120);
      return { value: s || null };
    }
    case 'recipe_version_id':
    case 'fragrance_id':
      if (v == null || v === '') return { value: null };
      return typeof v === 'string' && UUID.test(v) ? { value: v } : { error: `${name} must be an id.` };
    case 'family':
      if (v == null || v === '') return { value: null };
      return FAMILIES.includes(v as string) ? { value: v } : { error: 'Unknown family.' };
    case 'size_ml': {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 && n <= 1000 ? { value: Math.round(n * 100) / 100 } : { error: 'Size must be between 0 and 1000 mL.' };
    }
    case 'strength_pct': {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 && n < 100 ? { value: Math.round(n * 100) / 100 } : { error: 'Strength must be between 0 and 100 %.' };
    }
    case 'price': {
      if (v == null || v === '') return { value: null };
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? { value: Math.round(n * 100) / 100 } : { error: 'Price must be a positive number.' };
    }
    case 'currency': {
      if (v == null || v === '') return { value: null };
      const c = String(v).toUpperCase();
      return /^[A-Z]{3}$/.test(c) ? { value: c } : { error: 'Currency must be a 3-letter code.' };
    }
    case 'wanted_by':
      if (v == null || v === '') return { value: null };
      return typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)) ? { value: v } : { error: 'Wanted-by must be a date.' };
    case 'group_mode':
      return GROUP_MODES.includes(v as string) ? { value: v } : { error: 'Unknown grouping.' };
  }
}

/**
 * A new order (every required field) or an edit (only the fields given).
 * Unknown columns, user_id, status and timestamps are ignored.
 */
export function orderRow(input: unknown, partial = false): Result {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const row: Record<string, unknown> = {};
  for (const name of EDITABLE) {
    if (!Object.prototype.hasOwnProperty.call(b, name)) {
      if (!partial && REQUIRED.includes(name)) return { error: `${name} is required.`, field: name };
      continue;
    }
    const out = field(name, b[name]);
    if ('error' in out) return { error: out.error, field: name };
    row[name] = out.value;
  }
  if (partial && Object.keys(row).length === 0) return { error: 'Nothing to change.', field: 'edit' };
  return { row };
}

/**
 * The moves a seller makes by hand (the same table as canMove() in
 * src/lib/calc/orderPlan.ts; a test keeps the two equal). Weighing is not
 * here: an order becomes "resting" only when its batch is logged.
 */
export function canMove(from: string, to: string): boolean {
  const moves: Record<string, string[]> = {
    queued: ['cancelled'], planned: ['cancelled'], cancelled: ['queued'],
    resting: ['bottled', 'queued'], bottled: ['handed_over', 'resting'], handed_over: ['bottled'],
  };
  return (moves[from] ?? []).includes(to);
}

/** A move from `from` to `status`, with the timestamps that follow it. */
export function statusRow(status: unknown, from: string, now = new Date()): Result {
  const to = String(status);
  if (!canMove(from, to)) return { error: 'That change isn’t possible from here.', field: 'status' };
  const at = now.toISOString();
  const row: Record<string, unknown> = { status: to };
  if (to === 'cancelled') row.cancelled_at = at;
  if (to === 'queued') Object.assign(row, { cancelled_at: null, batch_id: null });
  if (to === 'bottled') Object.assign(row, { bottled_at: from === 'resting' ? at : undefined, handed_at: null });
  if (to === 'resting') row.bottled_at = null;
  if (to === 'handed_over') row.handed_at = at;
  for (const k of Object.keys(row)) if (row[k] === undefined) delete row[k];
  return { row };
}

/** Ids for a group's change (all the orders of one group), at most 200. */
export function idList(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 200) return null;
  return v.every((x) => typeof x === 'string' && UUID.test(x)) ? [...new Set(v as string[])] : null;
}

/** Open orders a logged batch may take (queued or planned, the caller's own). */
export const LINKABLE = ['queued', 'planned'];

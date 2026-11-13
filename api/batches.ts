import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadEntitlements, canLogBatch, can, lockedFeature } from './_lib/entitlements.js';
import { overLimit } from './_lib/rateLimit.js';
import { randomBytes } from 'node:crypto';
import { shareRow } from './_lib/share.js';
import { orderRow, statusRow, idList, ORDER_CAP, LINKABLE } from './_lib/orders.js';
import { setCors, serviceClient, requireUser, isTimeout, SLOW_READ, SLOW_WRITE, UUID } from './_lib/http.js';
// @ts-ignore: plain JS shared with the browser
import { recipeSlug } from '../src/lib/publicText.js';

// Every error answer carries a code the app translates (errors.<code> in
// src/i18n/messages); the English message is for logs and old clients.
// A 500 never returns database text: the detail goes to the server log.
function fail(res: VercelResponse, status: number, code: string, error: string, extra: Record<string, unknown> = {}) {
  return res.status(status).json({ error, code, ...extra });
}
function failFrom(res: VercelResponse, err: any, write: boolean, context: string) {
  if (isTimeout(err)) return fail(res, 503, write ? 'slow_write' : 'slow_read', write ? SLOW_WRITE : SLOW_READ);
  console.error(JSON.stringify({ at: 'api/batches', context, message: String(err?.message ?? err), code: err?.code }));
  return fail(res, 500, 'server_error', 'Something went wrong. Please try again.');
}

// The bottle as entered and its lot (0015). Anything malformed is dropped
// rather than refused: these fields are extras, never a reason to lose a log.
const UNITS = ['ml', 'floz', 'g', 'oz'];
export function batchRecord(b: any) {
  const lot = typeof b.lot === 'string' ? b.lot.trim().slice(0, 60) : '';
  const amount = Number(b.amount);
  const rec = {
    lot: lot || null,
    amount: amount > 0 && amount <= 100000 ? amount : null,
    unit: UNITS.includes(b.unit) ? b.unit : null,
  };
  // Only the fields given, so a log without them works on a database that
  // hasn't had 0015 yet.
  return Object.fromEntries(Object.entries(rec).filter(([, v]) => v != null));
}

// What was poured of each material of a blend (0032), one entry per
// material in pour order. Like the record fields, a malformed entry is
// dropped rather than refusing the log; nothing usable leaves it out.
const POUR_TYPES = ['eo', 'aroma', 'absolute', 'fixative', 'dpg'];
const grams = (v: unknown) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 100000 ? Math.round(n * 100) / 100 : undefined;
};
export function batchPours(b: any): { pours?: unknown[] } {
  if (!Array.isArray(b.pours)) return {};
  const pours = b.pours.slice(0, 30).flatMap((p: any) => {
    if (!p || typeof p !== 'object') return [];
    const target = grams(p.target_g);
    const actual = grams(p.actual_g);
    if (target == null || actual === undefined) return [];
    const pct = Number(p.pct);
    const name = typeof p.name === 'string' ? p.name.trim().slice(0, 120) : '';
    return [{
      name: name || null,
      type: POUR_TYPES.includes(p.type) ? p.type : null,
      pct: p.pct != null && pct > 0 && pct <= 100 ? pct : null,
      target_g: target,
      actual_g: actual,
    }];
  });
  return pours.length ? { pours } : {};
}

// What the batch cost to make and what it sells for (0022). Pro only
// (calculator.advanced): a plan without it stores none of these, and a
// malformed value is dropped rather than refusing the log. Limits match the
// table's check constraint.
const SELLER: [string, number, boolean][] = [
  ['ethanol_price_per_l', 1e6, false], ['bottle_cost', 1e6, false], ['bottles', 1e5, true],
  ['packaging_cost', 1e6, false], ['labour_minutes', 1e5, false], ['labour_rate_per_hour', 1e6, false],
  ['sale_price', 1e7, false],
];
export function sellerCosts(b: any, entitlements: any) {
  if (!can(entitlements, 'calculator.advanced')) return {};
  const out: Record<string, unknown> = {};
  for (const [k, max, whole] of SELLER) {
    const v = b[k];
    if (v == null || v === '' || typeof v === 'boolean') continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0 && n <= max && (!whole || Number.isInteger(n))) out[k] = n;
  }
  if (typeof b.currency === 'string' && /^[A-Z]{3}$/.test(b.currency)) out.currency = b.currency;
  return out;
}

// The recipe version a batch was made from (0023). Recipes are on every plan,
// but the link is stored only for a version that belongs to the caller: the
// batch row is written with the service role, so the foreign key alone would
// let anyone point at someone else's version. Anything else (malformed, not
// theirs, a database without 0023) is dropped, never a reason to lose a log.
export async function recipeLink(supabase: any, userId: string, b: any): Promise<Record<string, string>> {
  const id = b.recipe_version_id;
  if (typeof id !== 'string' || !UUID.test(id)) return {};
  try {
    const { data, error } = await supabase.from('recipe_versions').select('id').eq('id', id).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? { recipe_version_id: id } : {};
  } catch (err: any) {
    console.error(JSON.stringify({ at: 'api/batches', context: 'recipe_link', message: String(err?.message ?? err), code: err?.code }));
    return {};
  }
}

// What a user may change on a logged batch: the record around the blend,
// never the planned recipe (Make again covers a different recipe). Only the
// fields sent change; an empty value clears an optional field.
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar day, not later than tomorrow UTC (one day of slack for time zones).
function validBlendDate(d: string, now = Date.now()): boolean {
  if (!DATE.test(d)) return false;
  const t = Date.parse(`${d}T00:00:00Z`);
  return !Number.isNaN(t) && t <= now + 2 * 86_400_000 - 1;
}
export function editRow(edit: any): { row: Record<string, unknown> } | { error: string; field: string } {
  if (!edit || typeof edit !== 'object' || Array.isArray(edit)) return { error: 'Nothing to change.', field: 'edit' };
  const row: Record<string, unknown> = {};
  const textField = (k: string, max: number, required = false) => {
    if (!(k in edit)) return null;
    const v = edit[k] == null ? '' : String(edit[k]).trim();
    if (!v && required) return k;
    if (v.length > max) return k;
    row[k] = v || null;
    return null;
  };
  const gramsField = (k: string) => {
    if (!(k in edit)) return null;
    if (edit[k] === null || edit[k] === '') { row[k] = null; return null; }
    const g = Number(edit[k]);
    if (!(g > 0 && g <= 100000)) return k;
    row[k] = g;
    return null;
  };
  const bad = textField('fragrance_name', 120, true) || textField('notes', 2000) || textField('blended_by', 120)
    || textField('oil_type', 120) || textField('lot', 60) || gramsField('actual_oil_g') || gramsField('actual_ethanol_g');
  if (bad) return { error: `Check ${bad}.`, field: bad };
  if ('blend_date' in edit) {
    const d = String(edit.blend_date ?? '');
    if (!validBlendDate(d)) return { error: 'Check blend_date.', field: 'blend_date' };
    row.blend_date = d;
  }
  if (!Object.keys(row).length) return { error: 'Nothing to change.', field: 'edit' };
  return { row };
}

// The numbers and text of a new batch, checked before they reach the database.
// Anything the calculator could not have produced is refused with the field
// named: zero or negative amounts, 0 % or 100 % strength, a total far from
// oil + ethanol (display rounding only: TOTAL_SLACK_G), text past its cap.
const TOTAL_SLACK_G = 0.05;
export function batchRow(b: any): { row: Record<string, unknown> } | { error: string; field: string } {
  const row: Record<string, unknown> = {};
  const num = (k: string, min: number, max: number, inclusiveMin = true) => {
    const v = b[k];
    if (typeof v === 'string' ? !v.trim() : typeof v !== 'number') return k;
    const n = Number(v);
    if (!Number.isFinite(n) || n > max || (inclusiveMin ? n < min : n <= min)) return k;
    row[k] = n;
    return null;
  };
  const optional = (k: string, max: number) => {
    if (b[k] == null || b[k] === '') { row[k] = null; return null; }
    return num(k, 0, max);
  };
  const text = (k: string, max: number, required = false) => {
    const v = b[k] == null ? '' : String(b[k]).trim();
    if ((required && !v) || v.length > max) return k;
    row[k] = v || null;
    return null;
  };
  const bad = text('fragrance_name', 120, true) || text('tier', 40, true)
    || num('concentration_pct', 0, 100, false) || (Number(b.concentration_pct) >= 100 ? 'concentration_pct' : null)
    || num('oil_g', 0, 100000) || num('oil_ml', 0, 100000) || num('ethanol_g', 0, 100000) || num('ethanol_ml', 0, 100000)
    || num('total_g', 0, 100000, false) || num('total_ml', 0, 100000, false)
    || optional('price_per_gram', 1e6) || optional('oil_cost', 1e7)
    || optional('actual_oil_g', 100000) || optional('actual_ethanol_g', 100000)
    || text('oil_type', 120) || text('notes', 2000) || text('blended_by', 120);
  if (bad) return { error: `Check ${bad}.`, field: bad };
  const d = String(b.blend_date ?? '');
  if (!validBlendDate(d)) return { error: 'Check blend_date.', field: 'blend_date' };
  row.blend_date = d;
  if (Math.abs(Number(row.total_g) - (Number(row.oil_g) + Number(row.ethanol_g))) > TOTAL_SLACK_G) {
    return { error: 'Check total_g.', field: 'total_g' };
  }
  return { row };
}

// Stock taken out for a freshly logged batch, when the client asks with
// deduct_oil_g. Only on a new insert (a replay or a 23505 returns earlier,
// so a re-sent batch never deducts twice), only on a plan with inventory,
// only for an oil the user tracks. The batch is saved either way, so this
// never throws: it answers how the stock step went.
//   deducted | not_tracked | locked | failed | client (STOCK_ON_LOG=client:
//   the kill switch, the app deducts the old way)
async function deductOnLog(supabase: any, userId: string, entitlements: any, fragranceId: unknown, grams: unknown) {
  if (grams == null) return undefined;
  if (process.env.STOCK_ON_LOG === 'client') return 'client';
  if (!can(entitlements, 'inventory')) return 'locked';
  const g = Number(grams);
  if (typeof fragranceId !== 'string' || !UUID.test(fragranceId) || !(g > 0 && g <= 100000)) return 'not_tracked';
  try {
    const { data, error } = await supabase.rpc('restock_inventory', { p_user_id: userId, p_fragrance_id: fragranceId, p_delta: -g });
    if (error) throw error;
    // No inventory row: null, or an object of nulls (see api/inventory.ts).
    return !data || data.fragrance_id == null ? 'not_tracked' : 'deducted';
  } catch (err: any) {
    console.error(JSON.stringify({ at: 'api/batches', context: 'deduct', message: String(err?.message ?? err), code: err?.code }));
    return 'failed';
  }
}

// Batches: log (POST), list (GET), share (PATCH) and delete (DELETE), for the
// signed-in user only. Uses the service role, so every query scopes by
// user_id. CORS, the 5 s / 15 s Supabase timeouts and auth come from
// _lib/http.ts (on 2026-09-24 some Supabase calls stalled 18-153 s).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res, 'GET, POST, PATCH, DELETE');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = await requireUser(req, res);
  if (!userId) return;
  const supabase = serviceClient();

  // The order queue (0035) lives here because the Hobby plan's 12 functions
  // are all in use: /api/batches?resource=orders.
  if (req.query.resource === 'orders') return orders(req, res, supabase, userId);

  if (req.method === 'POST') {
    try {
      const b = req.body || {};
      const clientId = typeof b.id === 'string' && UUID.test(b.id) ? b.id : null;

      // A re-sent offline batch that already landed: answer before the cap
      // check, so it can't be refused as a new log.
      if (clientId) {
        const { data: existing, error: existingError } = await supabase
          .from('batches').select('*').eq('id', clientId).eq('user_id', userId).maybeSingle();
        if (existingError) throw existingError;
        if (existing) {
          const linked = await linkOrders(supabase, userId, existing.id, b.order_ids);
          return res.status(200).json({ success: true, batch: existing, duplicate: true, ...linked });
        }
      }

      if (await overLimit(supabase, res, 'batch', userId)) return;

      // Free plans stop at a batch cap. Existing batches are never touched;
      // only new logs are refused, with a code the app turns into the path
      // to Pro.
      const entitlements = await loadEntitlements(supabase, userId);
      const { count: used, error: countError } = await supabase
        .from('batches')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (countError) throw countError;
      if (!canLogBatch(entitlements, used ?? 0)) {
        return fail(res, 403, 'batch_cap', `Your ${entitlements.name} plan keeps up to ${entitlements.batchCap} batches.`,
          { cap: entitlements.batchCap, plan: entitlements.name });
      }

      // Required (NOT NULL) columns on the batches table.
      const required = [
        'fragrance_name', 'tier', 'blend_date', 'concentration_pct',
        'oil_g', 'oil_ml', 'ethanol_g', 'ethanol_ml', 'total_g', 'total_ml',
      ];
      const missing = required.filter((k) => b[k] === undefined || b[k] === null || b[k] === '');
      if (missing.length) {
        return fail(res, 400, 'missing_fields', `Missing required batch fields: ${missing.join(', ')}`, { fields: missing });
      }

      const checked = batchRow(b);
      if ('error' in checked) {
        return fail(res, 400, 'invalid_batch', checked.error, { field: checked.field });
      }

      // Whitelist only real columns; user_id + created_at are server-set.
      // A client-chosen id makes logging idempotent (see above).
      const row = {
        ...(clientId ? { id: clientId } : {}),
        user_id: userId,
        fragrance_id: b.fragrance_id ?? null,
        ...checked.row,
        basis: b.basis === 'volume' || b.basis === 'weight' ? b.basis : null,
        oil_density: Number(b.oil_density) > 0 ? Number(b.oil_density) : null,
        ethanol_density: Number(b.ethanol_density) > 0 ? Number(b.ethanol_density) : null,
        ...batchRecord(b),
        ...batchPours(b),
        ...sellerCosts(b, entitlements),
        ...(await recipeLink(supabase, userId, b)),
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('batches')
        .insert([row])
        .select();

      if (error?.code === '23505' && 'id' in row) {
        // Already logged by an earlier send of the same batch.
        const { data: existing } = await supabase.from('batches').select('*').eq('id', row.id).eq('user_id', userId).maybeSingle();
        if (existing) return res.status(200).json({ success: true, batch: existing, duplicate: true });
      }
      if (error) throw error;

      const stock = await deductOnLog(supabase, userId, entitlements, row.fragrance_id, b.deduct_oil_g);
      const linked = await linkOrders(supabase, userId, data[0].id, b.order_ids, entitlements);
      return res.status(201).json({ success: true, batch: data[0], ...(stock ? { stock } : {}), ...linked });
    } catch (err: any) {
      return failFrom(res, err, true, 'log');
    }
  }

  if (req.method === 'GET') {
    try {
      // Honour ?limit= (the Batches page asks for 100), capped so one call
      // can't pull an unbounded history; 20 when absent or not a number.
      const requested = parseInt(String(req.query.limit ?? ''), 10);
      const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 500) : 20;

      // Each batch comes with its journal check-ins (0012), oldest first,
      // and its shared recipe if it was ever shared (0013).
      let query = supabase
        .from('batches')
        .select('*, batch_checkins ( id, day, scheduled_day, note, rating, skipped, tags, created_at ), shared_recipes ( slug, published, public_note, rest_days, indexable, updated_at )')
        .eq('user_id', userId);
      // One batch (labels), or the batches of one oil (its history): by
      // catalog id, or by name for batches logged without one.
      const one = String(req.query.id ?? '');
      const oil = String(req.query.fragrance_id ?? '');
      const name = typeof req.query.name === 'string' ? req.query.name.trim().slice(0, 120) : '';
      if (one) { if (!UUID.test(one)) return fail(res, 400, 'invalid_id', 'Invalid batch ID.'); query = query.eq('id', one); }
      if (oil) { if (!UUID.test(oil)) return fail(res, 400, 'invalid_id', 'Invalid fragrance ID.'); query = query.eq('fragrance_id', oil); }
      if (name) query = query.ilike('fragrance_name', name.replace(/[\\%_]/g, (c) => `\\${c}`));
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('created_at', { referencedTable: 'batch_checkins', ascending: true })
        .limit(limit);

      if (error) throw error;

      return res.status(200).json({ batches: data || [] });
    } catch (err: any) {
      return failFrom(res, err, false, 'list');
    }
  }

  // Share a batch as a public recipe, update it, or stop sharing:
  //   PATCH /api/batches { id, share: { public_note, rest_days } }
  //   PATCH /api/batches { id, share: false }
  // The slug is made once and kept, so sharing again brings back the same URL.
  if (req.method === 'PATCH') {
    try {
      const b = req.body || {};
      const id = typeof b.id === 'string' ? b.id : '';
      if (!UUID.test(id) || (b.share === undefined && b.edit === undefined && b.remind === undefined)) return fail(res, 400, 'invalid_id', 'Missing batch ID, share, edit or remind.');

      // PATCH /api/batches { id, remind: true | false } — rest reminders are
      // Pro (journal.reminders). Turning one off is always allowed, so a
      // user whose trial ended can still silence a batch.
      // Only the preference is stored (Bench SaaS Phase 5).
      // TODO(reminders): a scheduled job (Vercel cron or Supabase pg_cron)
      // that finds batches with remind = true reaching REST_DAYS
      // (src/lib/calc/restTracker.ts) today and emails or pushes their
      // owners once; needs SMTP/Resend and a sent-at column so a reminder
      // goes out only once. Nothing is sent yet.
      if (b.remind !== undefined) {
        if (typeof b.remind !== 'boolean') return fail(res, 400, 'invalid_edit', 'remind must be true or false.', { field: 'remind' });
        if (b.remind && !can(await loadEntitlements(supabase, userId), 'reminders')) {
          return res.status(403).json(lockedFeature('journal.reminders'));
        }
        if (await overLimit(supabase, res, 'batch', userId)) return;
        const { data, error } = await supabase
          .from('batches').update({ remind: b.remind }).eq('id', id).eq('user_id', userId).select('*').maybeSingle();
        if (error) throw error;
        if (!data) return fail(res, 404, 'not_found', 'Batch not found.');
        return res.status(200).json({ batch: data });
      }

      if (b.edit !== undefined) {
        const edited = editRow(b.edit);
        if ('error' in edited) return fail(res, 400, 'invalid_edit', edited.error, { field: edited.field });
        if (await overLimit(supabase, res, 'batch', userId)) return;
        const { data, error } = await supabase
          .from('batches').update(edited.row).eq('id', id).eq('user_id', userId).select('*').maybeSingle();
        if (error) throw error;
        if (!data) return fail(res, 404, 'not_found', 'Batch not found.');
        return res.status(200).json({ batch: data });
      }

      if (await overLimit(supabase, res, 'share', userId)) return;

      const { data: batch, error: batchError } = await supabase
        .from('batches').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
      if (batchError) throw batchError;
      if (!batch) return fail(res, 404, 'not_found', 'Batch not found.');

      const { data: existing, error: existingError } = await supabase
        .from('shared_recipes').select('slug').eq('batch_id', id).eq('user_id', userId).maybeSingle();
      if (existingError) throw existingError;

      const columns = 'slug, published, public_note, rest_days, indexable, updated_at';
      if (b.share === false) {
        if (!existing) return res.status(200).json({ share: null });
        const { data, error } = await supabase
          .from('shared_recipes').update({ published: false, updated_at: new Date().toISOString() })
          .eq('batch_id', id).eq('user_id', userId).select(columns).single();
        if (error) throw error;
        return res.status(200).json({ share: data });
      }

      const built = shareRow(batch, b.share);
      if ('error' in built) return res.status(400).json(built);
      // A new slug only on the first share; retry on the (unlikely) clash.
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = existing?.slug ?? recipeSlug(batch.fragrance_name, randomBytes);
        const { data, error } = await supabase
          .from('shared_recipes')
          .upsert({ ...built.row, slug, published: true, updated_at: new Date().toISOString() }, { onConflict: 'batch_id' })
          .select(columns).single();
        if (error?.code === '23505' && !existing) continue;
        if (error) throw error;
        return res.status(200).json({ share: data });
      }
      return fail(res, 503, 'share_link_failed', 'Could not make a link — please try again.');
    } catch (err: any) {
      return failFrom(res, err, true, 'share');
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = String(req.query.id || req.body?.id || '');
      if (!UUID.test(id)) return fail(res, 400, 'invalid_id', 'Missing or invalid batch ID');
      if (await overLimit(supabase, res, 'remove', userId)) return;

      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return failFrom(res, err, true, 'delete');
    }
  }

  return fail(res, 405, 'method_not_allowed', 'Method not allowed');
}

// ------------------------------------------------------------ order queue
// GET    /api/batches?resource=orders                    → { orders }
// POST   /api/batches?resource=orders  { …order, id? }    → { order }
// PATCH  /api/batches?resource=orders  { id, edit }       → { order }
//                                      { id, status }     → { order } (queued | cancelled)
//                                      { ids, group_mode } → { orders } (one group's grouping)
// Pro only (`orders`). Writes only here: the table has no browser writes.
async function orders(req: VercelRequest, res: VercelResponse, supabase: ReturnType<typeof serviceClient>, userId: string) {
  const write = req.method !== 'GET';
  try {
    if (!['GET', 'POST', 'PATCH'].includes(req.method || '')) return fail(res, 405, 'method_not_allowed', 'Method not allowed.');
    if (!can(await loadEntitlements(supabase, userId), 'orders')) return res.status(403).json(lockedFeature('orders'));

    if (req.method === 'GET') {
      // Each order with its batch's number and blend date (Phase B), so the
      // rest window counts from the day it was really mixed, and (P1a) the
      // grams weighed and prices, for the short-mix check and the order's cost.
      const { data, error } = await supabase
        .from('seller_orders').select('*, batches ( batch_no, blend_date, total_ml, oil_g, actual_oil_g, actual_ethanol_g, ethanol_ml, oil_density, ethanol_density, price_per_gram, ethanol_price_per_l, bottle_cost, packaging_cost, labour_minutes, labour_rate_per_hour, currency )').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(ORDER_CAP);
      if (error) throw error;
      return res.status(200).json({ orders: data ?? [] });
    }

    if (await overLimit(supabase, res, 'batch', userId)) return;
    const b = req.body || {};

    if (req.method === 'POST') {
      const clientId = typeof b.id === 'string' && UUID.test(b.id) ? b.id : null;
      if (clientId) {
        const { data: existing, error } = await supabase
          .from('seller_orders').select('*').eq('id', clientId).eq('user_id', userId).maybeSingle();
        if (error) throw error;
        if (existing) return res.status(200).json({ order: existing, duplicate: true });
      }
      const built = orderRow(b);
      if ('error' in built) return fail(res, 400, 'invalid_order', built.error, { field: built.field });
      const { count, error: countError } = await supabase
        .from('seller_orders').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if (countError) throw countError;
      if ((count ?? 0) >= ORDER_CAP) return fail(res, 409, 'order_cap', `At most ${ORDER_CAP} orders.`);
      const { data, error } = await supabase
        .from('seller_orders')
        .insert({ ...built.row, ...(clientId ? { id: clientId } : {}), user_id: userId, status: 'queued' })
        .select('*').single();
      if (error) throw error;
      return res.status(201).json({ order: data });
    }

    // PATCH
    const now = new Date().toISOString();
    if (b.ids !== undefined) {
      const ids = idList(b.ids);
      if (!ids) return fail(res, 400, 'invalid_id', 'ids must be a list of order ids.');
      const built = orderRow({ group_mode: b.group_mode }, true);
      if ('error' in built) return fail(res, 400, 'invalid_order', built.error, { field: built.field });
      const changed = [];
      for (const id of ids) {
        const { data, error } = await supabase
          .from('seller_orders').update({ ...built.row, updated_at: now }).eq('id', id).eq('user_id', userId).select('*').maybeSingle();
        if (error) throw error;
        if (data) changed.push(data);
      }
      return res.status(200).json({ orders: changed });
    }

    const id = typeof b.id === 'string' ? b.id : '';
    if (!UUID.test(id)) return fail(res, 400, 'invalid_id', 'Missing order ID.');
    let built;
    if (b.status !== undefined) {
      const { data: current, error: currentError } = await supabase
        .from('seller_orders').select('status').eq('id', id).eq('user_id', userId).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return fail(res, 404, 'not_found', 'Order not found.');
      built = statusRow(b.status, current.status);
    } else {
      built = orderRow(b.edit, true);
    }
    if ('error' in built) return fail(res, 400, 'invalid_order', built.error, { field: built.field });
    const { data, error } = await supabase
      .from('seller_orders').update({ ...built.row, updated_at: now }).eq('id', id).eq('user_id', userId).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return fail(res, 404, 'not_found', 'Order not found.');
    return res.status(200).json({ order: data });
  } catch (err: any) {
    return failFrom(res, err, write, 'orders');
  }
}

// Phase B: a batch logged from the order queue carries the ids of the
// orders it was weighed for. Each of the caller's own open orders takes the
// batch and starts resting; anything else (someone else's, already weighed,
// cancelled, malformed) is skipped. Never fails the log: the batch is the
// record, the link is a convenience, so an error answers orders_linked: 0.
async function linkOrders(supabase: ReturnType<typeof serviceClient>, userId: string, batchId: string, ids: unknown, entitlements?: any) {
  if (ids === undefined) return {};
  const list = idList(ids);
  if (!list) return { orders_linked: 0 };
  try {
    if (!can(entitlements ?? (await loadEntitlements(supabase, userId)), 'orders')) return { orders_linked: 0 };
    let n = 0;
    for (const id of list) {
      const { data: order, error } = await supabase
        .from('seller_orders').select('status').eq('id', id).eq('user_id', userId).maybeSingle();
      if (error) throw error;
      if (!order || !LINKABLE.includes(order.status)) continue;
      const { error: upError } = await supabase
        .from('seller_orders').update({ batch_id: batchId, status: 'resting', updated_at: new Date().toISOString() })
        .eq('id', id).eq('user_id', userId);
      if (upError) throw upError;
      n += 1;
    }
    return { orders_linked: n };
  } catch (err: any) {
    console.error(JSON.stringify({ at: 'api/batches', context: 'link_orders', message: String(err?.message ?? err) }));
    return { orders_linked: 0 };
  }
}

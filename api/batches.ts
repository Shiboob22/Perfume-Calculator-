import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadEntitlements, canLogBatch } from './_lib/entitlements.js';
import { overLimit } from './_lib/rateLimit.js';
import { randomBytes } from 'node:crypto';
import { shareRow } from './_lib/share.js';
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
        if (existing) return res.status(200).json({ success: true, batch: existing, duplicate: true });
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

      // Whitelist only real columns; user_id + created_at are server-set.
      // A client-chosen id makes logging idempotent (see above).
      const row = {
        ...(clientId ? { id: clientId } : {}),
        user_id: userId,
        fragrance_id: b.fragrance_id ?? null,
        fragrance_name: b.fragrance_name,
        tier: b.tier,
        blend_date: b.blend_date,
        concentration_pct: b.concentration_pct,
        oil_g: b.oil_g,
        oil_ml: b.oil_ml,
        ethanol_g: b.ethanol_g,
        ethanol_ml: b.ethanol_ml,
        total_g: b.total_g,
        total_ml: b.total_ml,
        oil_type: b.oil_type ?? null,
        price_per_gram: b.price_per_gram ?? null,
        oil_cost: b.oil_cost ?? null,
        notes: b.notes ?? null,
        blended_by: b.blended_by ?? null,
        actual_oil_g: b.actual_oil_g ?? null,
        actual_ethanol_g: b.actual_ethanol_g ?? null,
        basis: b.basis === 'volume' || b.basis === 'weight' ? b.basis : null,
        oil_density: Number(b.oil_density) > 0 ? Number(b.oil_density) : null,
        ethanol_density: Number(b.ethanol_density) > 0 ? Number(b.ethanol_density) : null,
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

      return res.status(201).json({ success: true, batch: data[0] });
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
      const { data, error } = await supabase
        .from('batches')
        .select('*, batch_checkins ( id, day, scheduled_day, note, rating, skipped, created_at ), shared_recipes ( slug, published, public_note, rest_days, indexable, updated_at )')
        .eq('user_id', userId)
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
      if (!UUID.test(id) || b.share === undefined) return fail(res, 400, 'invalid_id', 'Missing batch ID or share.');
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

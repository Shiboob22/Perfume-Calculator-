import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadEntitlements, can, lockedFeature } from './_lib/entitlements.js';
import { overLimit } from './_lib/rateLimit.js';
import { setCors, serviceClient, requireUser, isTimeout, SLOW_READ, SLOW_WRITE, UUID } from './_lib/http.js';

// Same answer shape as api/batches.ts: a code the app translates, and a 500
// never carries database text (the detail goes to the server log).
function fail(res: VercelResponse, status: number, code: string, error: string) {
  return res.status(status).json({ error, code });
}
function failFrom(res: VercelResponse, err: any, write: boolean, context: string) {
  if (isTimeout(err)) return fail(res, 503, write ? 'slow_write' : 'slow_read', write ? SLOW_WRITE : SLOW_READ);
  console.error(JSON.stringify({ at: 'api/inventory', context, message: String(err?.message ?? err), code: err?.code }));
  return fail(res, 500, 'server_error', 'Something went wrong. Please try again.');
}

// Inventory: the signed-in user's stock of each oil (Pro: inventory). Uses the
// service role, so every query scopes by user_id.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res, 'GET, POST, PATCH, DELETE');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = await requireUser(req, res);
  if (!userId) return;
  const supabase = serviceClient();

  try {
    if (!can(await loadEntitlements(supabase, userId), 'inventory')) {
      return res.status(403).json(lockedFeature('inventory'));
    }
  } catch (err: any) {
    return failFrom(res, err, false, 'entitlements');
  }

  // Writes are rate limited; reads are not.
  if (req.method !== 'GET' && req.method !== 'OPTIONS' && await overLimit(supabase, res, 'inventory', userId)) return;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          fragrance_id,
          stock_g,
          low_stock_threshold_g,
          updated_at,
          fragrances ( name, tier )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const items = (data || []).map((item: any) => ({
        id: item.fragrance_id,
        fragrance_id: item.fragrance_id,
        name: item.fragrances?.name || 'Unnamed Fragrance',
        tier: item.fragrances?.tier || 'General',
        stock_g: Number(item.stock_g || 0),
        low_threshold_g: Number(item.low_stock_threshold_g || 10),
      }));

      return res.status(200).json({ items });
    } catch (err: any) {
      return failFrom(res, err, false, 'list');
    }
  }

  if (req.method === 'POST') {
    try {
      const { fragrance_id, stock_g, low_stock_threshold_g } = req.body || {};
      // Stock and thresholds are grams on a bench scale: finite, never negative.
      const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1_000_000;
      if (typeof fragrance_id !== 'string' || !UUID.test(fragrance_id)) {
        return fail(res, 400, 'invalid_id', 'Invalid fragrance ID.');
      }
      if ((stock_g !== undefined && !isNum(stock_g))
        || (low_stock_threshold_g !== undefined && !isNum(low_stock_threshold_g))) {
        return fail(res, 400, 'invalid_payload', 'Invalid payload');
      }

      // Only the fields sent are written. On an existing row the others keep
      // their values (PostgREST merges only the columns in the payload); a new
      // row takes the column defaults. So "track this oil" (no fields) never
      // resets stock, and a threshold edit never touches stock.
      const row: Record<string, unknown> = {
        user_id: userId,
        fragrance_id,
        updated_at: new Date().toISOString(),
      };
      if (stock_g !== undefined) row.stock_g = stock_g;
      if (low_stock_threshold_g !== undefined) row.low_stock_threshold_g = low_stock_threshold_g;

      const { data, error } = await supabase
        .from('inventory')
        .upsert(row, { onConflict: 'user_id, fragrance_id' })
        .select();

      if (error) throw error;
      return res.status(200).json({ item: data[0] });
    } catch (err: any) {
      return failFrom(res, err, true, req.method!.toLowerCase());
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, restock_g } = req.body || {};
      const targetId = id || req.body?.fragrance_id;

      if (typeof targetId !== 'string' || !UUID.test(targetId)) return fail(res, 400, 'invalid_id', 'Invalid fragrance ID.');
      if (typeof restock_g !== 'number' || !Number.isFinite(restock_g) || Math.abs(restock_g) > 1_000_000) {
        return fail(res, 400, 'invalid_payload', 'Invalid payload');
      }

      // Atomic increment via the restock_inventory() DB function: the add
      // happens inside one UPDATE under a row lock, so concurrent restocks
      // cannot lose each other's writes (the old read-modify-write here could).
      const { data, error } = await supabase.rpc('restock_inventory', {
        p_user_id: userId,
        p_fragrance_id: targetId,
        p_delta: restock_g,
      });

      if (error) throw error;
      // No row for this oil: depending on the PostgREST version the function's
      // composite result arrives as null or as an object of nulls.
      if (!data || data.fragrance_id == null) {
        return res.status(404).json({ error: 'Inventory item not found', code: 'not_tracked' });
      }
      return res.status(200).json({ item: data });
    } catch (err: any) {
      return failFrom(res, err, true, req.method!.toLowerCase());
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = String(req.query.id ?? '');
      if (!UUID.test(id)) return fail(res, 400, 'invalid_id', 'Missing or invalid item ID');

      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('fragrance_id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return failFrom(res, err, true, req.method!.toLowerCase());
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

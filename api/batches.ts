import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

// Reflect the request Origin only when it is one of the app's own domains.
// Same-origin requests (the app calling its own /api) ignore CORS entirely, so
// this does not affect the app — it just stops arbitrary cross-origin sites
// from scripting these authenticated endpoints, which the previous `*` allowed.
const ALLOWED_ORIGINS = [
  'https://scent-handbook-app.vercel.app',
  'https://scent-handbook-app-shiboob22s-projects.vercel.app',
];

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

// Supabase calls must never hang a request: on 2026-09-24 some calls stalled
// 18-153 s on the network path before reaching Supabase. Reads get 5 s per
// try (PostgREST retries GETs on its own); writes get 15 s and are not
// retried, because a stalled write can still land later.
function timedFetch(input: Parameters<typeof fetch>[0], init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase();
  const ms = method === 'GET' || method === 'HEAD' ? 5_000 : 15_000;
  // Nothing here passes its own abort signal; if something ever does, keep it.
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(ms) });
}

function isTimeout(err: any) {
  return /TimeoutError/.test(String(err?.message ?? ''));
}

const SLOW_READ = 'Database is slow to respond — please try again.';
const SLOW_WRITE = 'Database is slow to respond. The change may still save — refresh before trying again.';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: timedFetch } });
  
  let userId: string | null = null;
  if (token) {
    const { data: { user }, error: authError } = await createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: timedFetch }
    }).auth.getUser();

    // A network failure is not a bad token — don't report it as 401.
    if (authError && isAuthRetryableFetchError(authError)) {
      return res.status(503).json({ error: SLOW_READ });
    }
    if (user) userId = user.id;
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid session token.' });
  }

  if (req.method === 'POST') {
    try {
      const b = req.body || {};

      // Required (NOT NULL) columns on the batches table.
      const required = [
        'fragrance_name', 'tier', 'blend_date', 'concentration_pct',
        'oil_g', 'oil_ml', 'ethanol_g', 'ethanol_ml', 'total_g', 'total_ml',
      ];
      const missing = required.filter((k) => b[k] === undefined || b[k] === null || b[k] === '');
      if (missing.length) {
        return res.status(400).json({ error: `Missing required batch fields: ${missing.join(', ')}` });
      }

      // Whitelist only real columns; user_id + created_at are server-set.
      const row = {
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
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('batches')
        .insert([row])
        .select();

      if (error) throw error;

      return res.status(201).json({ success: true, batch: data[0] });
    } catch (err: any) {
      if (isTimeout(err)) return res.status(503).json({ error: SLOW_WRITE });
      return res.status(500).json({ error: err.message || 'Failed to log batch' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return res.status(200).json({ batches: data || [] });
    } catch (err: any) {
      if (isTimeout(err)) return res.status(503).json({ error: SLOW_READ });
      return res.status(500).json({ error: err.message || 'Failed to fetch batches' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'Missing batch ID' });

      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id as string)
        .eq('user_id', userId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err: any) {
      if (isTimeout(err)) return res.status(503).json({ error: SLOW_WRITE });
      return res.status(500).json({ error: err.message || 'Failed to delete batch' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { loadEntitlements } from './_lib/entitlements.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

function timedFetch(input: Parameters<typeof fetch>[0], init: RequestInit = {}) {
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(5_000) });
}

// The signed-in user's plan and usage: what the app needs to decide what to
// show (Ask tab, inventory, "18 of 25 batches"). The server re-checks every
// gated action itself; this only drives the UI.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'private, no-store');

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing or invalid session token.' });

  try {
    const { data: { user }, error: authError } = await createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: timedFetch },
    }).auth.getUser();
    if (authError && isAuthRetryableFetchError(authError)) {
      return res.status(503).json({ error: 'Database is slow to respond — please try again.' });
    }
    if (!user) return res.status(401).json({ error: 'Unauthorized: Missing or invalid session token.' });

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: timedFetch } });
    const entitlements = await loadEntitlements(supabase, user.id);
    const { count, error } = await supabase
      .from('batches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (error) throw error;

    return res.status(200).json({ ...entitlements, batchesUsed: count ?? 0 });
  } catch (err: any) {
    if (/TimeoutError/.test(String(err?.message ?? ''))) {
      return res.status(503).json({ error: 'Database is slow to respond — please try again.' });
    }
    return res.status(500).json({ error: err.message || 'Could not load your plan.' });
  }
}

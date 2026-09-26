import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Read-only catalog lookups: 5 s per try, like the reads in search.ts.
function timedFetch(input: Parameters<typeof fetch>[0], init: RequestInit = {}) {
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(5_000) });
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: timedFetch } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id || '');
  if (!UUID.test(id)) return res.status(400).json({ error: 'Missing or invalid id' });

  try {
    // Candidates are scored in the database (supabase-similar-rpc.sql): one
    // round trip that returns only the cards the page shows.
    const { data, error } = await supabase.rpc('similar_fragrances', { p_id: id });
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Fragrance not found' });

    // Catalog data changes rarely; let the CDN serve repeats.
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(data);
  } catch (err: any) {
    if (/TimeoutError/.test(String(err?.message ?? ''))) {
      return res.status(503).json({ error: 'Database is slow to respond — please try again.' });
    }
    return res.status(500).json({ error: err.message || 'Similar lookup failed' });
  }
}

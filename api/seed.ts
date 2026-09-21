import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { CATALOG } from '../data/catalog';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Only an authenticated caller may seed. The catalog is curated/idempotent so
// this is low-risk, but gating on a valid session keeps the service-role write
// path closed to anonymous callers (same posture as /api/search).
async function getUserId(req: VercelRequest): Promise<string | null> {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;
  if (!token) return null;
  try {
    const { data: { user } } = await createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in required to seed the catalog.' });

  try {
    // ignoreDuplicates: true → never clobber an existing row's curated
    // notes/accords (e.g. the already-enriched Naxos). New names are inserted
    // with name/tier/source; their note columns fill later via search enrichment.
    let inserted = 0;
    const CHUNK = 200;
    for (let i = 0; i < CATALOG.length; i += CHUNK) {
      const batch = CATALOG.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from('fragrances')
        .upsert(batch, { onConflict: 'name', ignoreDuplicates: true })
        .select('id');
      if (error) throw error;
      inserted += data?.length ?? 0;
    }

    const { count } = await supabase
      .from('fragrances')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({ ok: true, catalog: CATALOG.length, inserted, total: count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Seed failed' });
  }
}

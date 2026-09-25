import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Read-only catalog lookups: 5 s per try, like the reads in search.ts.
function timedFetch(input: Parameters<typeof fetch>[0], init: RequestInit = {}) {
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(5_000) });
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: timedFetch } });

type Row = {
  id: string;
  name: string;
  brand: string | null;
  tier: string;
  accords: string[] | null;
  top_notes: string[] | null;
  middle_notes: string[] | null;
  base_notes: string[] | null;
  popularity: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Accords are listed strongest first: weight them 8..1 and compare perfumes
// by cosine similarity of those weighted vectors.
function accordVector(accords: string[] | null) {
  const v = new Map<string, number>();
  (accords || []).slice(0, 8).forEach((a, i) => v.set(a.toLowerCase(), 8 - i));
  return v;
}

function cosine(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, x] of a) { na += x * x; const y = b.get(k); if (y) dot += x * y; }
  for (const y of b.values()) nb += y * y;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function noteSet(r: Row) {
  return new Set([...(r.top_notes || []), ...(r.middle_notes || []), ...(r.base_notes || [])].map((n) => n.toLowerCase()));
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id || '');
  if (!UUID.test(id)) return res.status(400).json({ error: 'Missing or invalid id' });

  try {
    const { data: base, error } = await supabase.from('fragrances').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!base) return res.status(404).json({ error: 'Fragrance not found' });

    const accords: string[] = base.accords || [];
    let similar: Row[] = [];
    let basis: 'accords' | 'family' = 'accords';

    if (accords.length > 0) {
      // Candidates share the lead accord(s); scored in JS. Other houses only —
      // the same house's line-up is its own "More from" shelf.
      const fetchCandidates = async (lead: string[]) => {
        let q = supabase.from('fragrances').select('*').contains('accords', lead).neq('id', id);
        if (base.brand) q = q.neq('brand', base.brand);
        const { data, error: cErr } = await q
          .order('popularity', { ascending: false, nullsFirst: false })
          .limit(300);
        if (cErr) throw cErr;
        return (data || []) as Row[];
      };
      // Top two accords first; if that pair is rare (e.g. Parfumo's accord
      // words on a curated row), widen to the lead accord alone.
      let cands = await fetchCandidates(accords.slice(0, 2));
      if (cands.length < 20 && accords.length > 1) cands = await fetchCandidates(accords.slice(0, 1));

      const bv = accordVector(accords);
      const bn = noteSet(base);
      similar = cands
        .map((c) => ({
          row: c,
          score: 0.75 * cosine(bv, accordVector(c.accords))
            + 0.25 * jaccard(bn, noteSet(c))
            + 0.02 * Math.log10(1 + (c.popularity || 0)),
        }))
        .sort((x, y) => y.score - x.score)
        .slice(0, 8)
        .map((x) => x.row);
    }

    if (similar.length === 0) {
      // No accords recorded: fall back to well-known perfumes of the same family.
      basis = 'family';
      let q = supabase.from('fragrances').select('*').eq('tier', base.tier).neq('id', id);
      if (base.brand) q = q.neq('brand', base.brand);
      const { data, error: fErr } = await q
        .not('image_url', 'is', null)
        .order('popularity', { ascending: false, nullsFirst: false })
        .limit(8);
      if (fErr) throw fErr;
      similar = data || [];
    }

    let sameBrand: Row[] = [];
    if (base.brand) {
      const { data, error: bErr } = await supabase
        .from('fragrances')
        .select('*')
        .eq('brand', base.brand)
        .neq('id', id)
        .order('popularity', { ascending: false, nullsFirst: false })
        .limit(12);
      if (bErr) throw bErr;
      sameBrand = data || [];
    }

    // Catalog data changes rarely; let the CDN serve repeats.
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ basis, similar, sameBrand });
  } catch (err: any) {
    if (/TimeoutError/.test(String(err?.message ?? ''))) {
      return res.status(503).json({ error: 'Database is slow to respond — please try again.' });
    }
    return res.status(500).json({ error: err.message || 'Similar lookup failed' });
  }
}

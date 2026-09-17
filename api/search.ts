import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // 1. Search local Supabase v2 schema ('fragrances' table) by name or brand
    const { data, error } = await supabase
      .from('fragrances')
      .select('*')
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(10);

    if (error) throw error;

    if (data && data.length > 0) {
      return res.status(200).json({ source: 'database', results: data });
    }

    // 2. Web fallback query if local database yields no matches
    const webRes = await fetch(`https://api.parfumo.net/v1/search?q=${encodeURIComponent(q)}`);
    if (webRes.ok) {
      const webData = await webRes.json();
      if (webData?.results?.length > 0) {
        return res.status(200).json({ source: 'live', results: webData.results });
      }
    }

    return res.status(200).json({ source: 'database', results: [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

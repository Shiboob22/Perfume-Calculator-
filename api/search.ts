import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = (req.query.q as string || '').trim().toLowerCase();

  if (!query || query.length < 2) {
    return res.status(200).json({ source: 'database', results: [] });
  }

  try {
    const { data, error } = await supabase
      .from('fragrances')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) throw error;

    return res.status(200).json({
      source: 'database',
      results: data || []
    });
  } catch (err: any) {
    console.error('Search query error:', err.message);
    return res.status(500).json({ error: err.message || 'Database search failed' });
  }
}

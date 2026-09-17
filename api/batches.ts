import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { fragrance_name, total_volume, concentration, oil_amount, alcohol_amount } = req.body;

      if (!fragrance_name || !total_volume || !concentration) {
        return res.status(400).json({ error: 'Missing required batch fields' });
      }

      const { data, error } = await supabase
        .from('batches')
        .insert([
          {
            fragrance_name,
            total_volume,
            concentration,
            oil_amount,
            alcohol_amount,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      return res.status(201).json({ success: true, batch: data[0] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to log batch' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return res.status(200).json({ batches: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch batches' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

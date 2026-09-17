import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return res.status(200).json({ items: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, restock_g } = req.body;
      if (!id || typeof restock_g !== 'number') {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const { data: current } = await supabase.from('inventory').select('stock_g').eq('id', id).single();
      const newStock = ((current?.stock_g || 0) + restock_g);

      const { data, error } = await supabase
        .from('inventory')
        .update({ stock_g: newStock })
        .eq('id', id)
        .select();

      if (error) throw error;
      return res.status(200).json({ item: data[0] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing item ID' });

      const { error } = await supabase.from('inventory').delete().eq('id', id as string);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

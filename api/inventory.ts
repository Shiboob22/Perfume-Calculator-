import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  let userId: string | null = null;
  if (token) {
    const { data: { user } } = await createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }).auth.getUser();
    
    if (user) userId = user.id;
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid session token.' });
  }

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
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { fragrance_id, stock_g, low_stock_threshold_g } = req.body;
      if (!fragrance_id || typeof stock_g !== 'number') {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const { data, error } = await supabase
        .from('inventory')
        .upsert({
          user_id: userId,
          fragrance_id,
          stock_g,
          low_stock_threshold_g: low_stock_threshold_g || 10,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, fragrance_id' })
        .select();

      if (error) throw error;
      return res.status(200).json({ item: data[0] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, restock_g } = req.body;
      const targetId = id || req.body.fragrance_id;

      if (!targetId || typeof restock_g !== 'number') {
        return res.status(400).json({ error: 'Invalid payload' });
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
      if (!data) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }
      return res.status(200).json({ item: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing item ID' });

      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('fragrance_id', id as string)
        .eq('user_id', userId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

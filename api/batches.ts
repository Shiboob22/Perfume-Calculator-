import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
            user_id: userId,
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
        .eq('user_id', userId)
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

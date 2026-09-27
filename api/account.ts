import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

function timedFetch(input: Parameters<typeof fetch>[0], init: RequestInit = {}) {
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(8_000) });
}

// DELETE /api/account  { confirm: "<the account's email>" }
// Deletes the signed-in user. Every table they own references auth.users
// with ON DELETE CASCADE, so removing the auth user removes their batches,
// inventory, notes, presets, profile, plan and waitlist row in one step.
// Catalog rows they added keep existing with added_by set to null.
// Admins cannot delete themselves here: losing the only admin would leave
// nobody able to approve catalog entries.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
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

    // The user types their email to confirm: a stray request can't delete.
    const confirm = String(req.body?.confirm ?? '').trim().toLowerCase();
    if (!user.email || confirm !== user.email.toLowerCase()) {
      return res.status(400).json({ error: 'Type your email to confirm.', code: 'confirm_mismatch' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: timedFetch } });
    const { data: admin, error: adminError } = await supabase
      .from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    if (adminError) throw adminError;
    if (admin) {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted from the app.', code: 'admin_cannot_delete' });
    }

    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return res.status(204).end();
  } catch (err: any) {
    if (/TimeoutError/.test(String(err?.message ?? ''))) {
      return res.status(503).json({ error: 'Database is slow to respond — please try again.' });
    }
    return res.status(500).json({ error: err.message || 'Could not delete the account.' });
  }
}

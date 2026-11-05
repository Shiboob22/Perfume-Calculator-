import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { overLimit } from './_lib/rateLimit.js';
import { startTrial } from './_lib/trial.js';

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
//
// POST /api/account  { action: "start_trial" }
// Starts the 14-day Pro trial: plan = pro, trial_ends_at = now + 14 days,
// once per user (start_pro_trial() in 0031 decides, atomically). Answers
//   201 { status: "started", trial_ends_at }
//   409 { code: "trial_used" | "already_pro" }
// An ended trial reads as Free everywhere (effective_plan()); nothing has
// to flip it back.
// TODO(payments): this is where a payment provider plugs in. When one is
// connected, start its checkout here (or after the trial) and let its
// webhook set user_plans.source = 'provider' (see docs/billing.md and
// api/_lib/billing.ts). No provider is connected; no card is asked for.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: timedFetch } });

    if (req.method === 'POST') {
      if (req.body?.action !== 'start_trial') return res.status(400).json({ error: 'Unknown action.', code: 'invalid_action' });
      if (await overLimit(supabase, res, 'trial', user.id)) return;
      const result = await startTrial(supabase, user.id);
      return res.status(result.status).json(result.body);
    }

    if (await overLimit(supabase, res, 'deleteAccount', user.id)) return;

    // The user types their email to confirm: a stray request can't delete.
    const confirm = String(req.body?.confirm ?? '').trim().toLowerCase();
    if (!user.email || confirm !== user.email.toLowerCase()) {
      return res.status(400).json({ error: 'Type your email to confirm.', code: 'confirm_mismatch' });
    }

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

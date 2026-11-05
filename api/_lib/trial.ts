import type { SupabaseClient } from '@supabase/supabase-js';

export const TRIAL_DAYS = 14;

// Starts the Pro trial through start_pro_trial() (0031), which decides in
// one transaction: once per user, never over a manual or provider Pro plan.
// TODO(payments): a payment provider's checkout would start here instead of
// (or after) the free trial; see docs/billing.md. No provider is connected.
export async function startTrial(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc('start_pro_trial', { p_user: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  switch (row?.status) {
    case 'started':
      return { status: 201, body: { status: 'started', trial_ends_at: row.ends_at, days: TRIAL_DAYS } };
    case 'trial_used':
      return { status: 409, body: { error: 'The free trial has already been used.', code: 'trial_used', trial_ends_at: row.ends_at ?? null } };
    case 'already_pro':
      return { status: 409, body: { error: 'This account is already on Pro.', code: 'already_pro' } };
    default:
      throw new Error(`start_pro_trial answered ${JSON.stringify(row)}`);
  }
}

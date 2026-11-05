import type { SupabaseClient } from '@supabase/supabase-js';
// @ts-ignore: plain JS shared with the browser
import { fromPlanRow, can, canLogBatch, batchesLeft, limit, journalOpen, planInForce, trialState, FALLBACK } from '../../src/lib/entitlements.js';

export { can, canLogBatch, batchesLeft, limit, journalOpen };

const PLAN_COLUMNS = 'id, name, features, batch_cap, formula_cap, ingredient_cap, journal_window';

// The user's plan as entitlements. No user_plans row means Free; a trial
// that has ended means Free (as effective_plan() decides in the database).
// Called with the service-role client, so it reads plans the user can't
// write. A failed read throws: callers answer 5xx (the app retries) rather
// than quietly treating a Pro user as Free for that request.
export async function loadEntitlements(supabase: SupabaseClient, userId: string) {
  const { data: own, error: ownError } = await supabase
    .from('user_plans')
    .select(`plan_id, source, trial_started_at, trial_ends_at, plans ( ${PLAN_COLUMNS} )`)
    .eq('user_id', userId)
    .maybeSingle();
  if (ownError) throw ownError;
  const trial = trialState(own);
  const inForce = planInForce(own);
  if ((own as any)?.plans && inForce !== 'free') return { ...fromPlanRow((own as any).plans), trial };

  const { data: free, error: freeError } = await supabase
    .from('plans')
    .select(PLAN_COLUMNS)
    .eq('id', 'free')
    .maybeSingle();
  if (freeError) throw freeError;
  return { ...(free ? fromPlanRow(free) : FALLBACK), trial };
}

// 403 body for a feature the plan doesn't include; the client shows the
// upgrade path when it sees this code.
export function lockedFeature(feature: string) {
  return { error: 'This feature is part of Pro.', code: 'feature_locked', feature };
}

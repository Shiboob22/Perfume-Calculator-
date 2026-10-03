import type { SupabaseClient } from '@supabase/supabase-js';
// @ts-ignore: plain JS shared with the browser
import { fromPlanRow, can, canLogBatch, batchesLeft, FALLBACK } from '../../src/lib/entitlements.js';

export { can, canLogBatch, batchesLeft };

// The user's plan as entitlements. No user_plans row means Free. Called with
// the service-role client, so it reads plans the user can't write.
// A failed read throws: callers answer 5xx (the app retries) rather than
// quietly treating a Pro user as Free for that request.
export async function loadEntitlements(supabase: SupabaseClient, userId: string) {
  const { data: own, error: ownError } = await supabase
    .from('user_plans')
    .select('plans ( id, name, features, batch_cap )')
    .eq('user_id', userId)
    .maybeSingle();
  if (ownError) throw ownError;
  if ((own as any)?.plans) return fromPlanRow((own as any).plans);

  const { data: free, error: freeError } = await supabase
    .from('plans')
    .select('id, name, features, batch_cap')
    .eq('id', 'free')
    .maybeSingle();
  if (freeError) throw freeError;
  return free ? fromPlanRow(free) : FALLBACK;
}

// 403 body for a feature the plan doesn't include; the client shows the
// upgrade path when it sees this code.
export function lockedFeature(feature: string) {
  return { error: 'This feature is part of Pro.', code: 'feature_locked', feature };
}

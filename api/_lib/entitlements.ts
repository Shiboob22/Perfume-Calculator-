import type { SupabaseClient } from '@supabase/supabase-js';
// @ts-ignore: plain JS shared with the browser
import { fromPlanRow, can, canLogBatch, batchesLeft, FALLBACK } from '../../src/lib/entitlements.js';

export { can, canLogBatch, batchesLeft };

// The user's plan as entitlements. No user_plans row means Free. Called with
// the service-role client, so it reads plans the user can't write.
export async function loadEntitlements(supabase: SupabaseClient, userId: string) {
  const { data: own } = await supabase
    .from('user_plans')
    .select('plans ( id, name, features, batch_cap )')
    .eq('user_id', userId)
    .maybeSingle();
  if ((own as any)?.plans) return fromPlanRow((own as any).plans);

  const { data: free } = await supabase
    .from('plans')
    .select('id, name, features, batch_cap')
    .eq('id', 'free')
    .maybeSingle();
  return free ? fromPlanRow(free) : FALLBACK;
}

// 403 body for a feature the plan doesn't include; the client shows the
// upgrade path when it sees this code.
export function lockedFeature(feature: string) {
  return { error: 'This feature is part of Pro.', code: 'feature_locked', feature };
}

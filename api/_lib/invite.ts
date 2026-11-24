import { randomInt } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// Bring a friend (0042). A Pro user's invite link is /bench?ref=invite-<code>;
// onboarding saves the ref as profiles.signup_ref, and the friend's first
// logged batch claims it (claim_invite() grants the months).

export const INVITE_CAP = 6;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o, 1/l/i: easy to read aloud

export const newInviteCode = (): string => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/** The invite code in a signup_ref ("invite-<8>"), or null. */
export function inviteCodeFrom(ref: unknown): string | null {
  const m = typeof ref === 'string' ? /^invite-([a-z0-9]{8})$/.exec(ref) : null;
  return m ? m[1] : null;
}

/** The caller's code (made on first ask), months earned and gifted Pro end. */
export async function inviteFor(supabase: SupabaseClient, userId: string) {
  let { data: own, error } = await supabase.from('invite_codes').select('code').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  for (let tries = 0; !own && tries < 3; tries++) {
    const { data, error: insertError } = await supabase.from('invite_codes').insert({ user_id: userId, code: newInviteCode() }).select('code').maybeSingle();
    if (insertError && insertError.code !== '23505') throw insertError;
    // 23505: another request made it first, or the code was taken; read again.
    own = data ?? (await supabase.from('invite_codes').select('code').eq('user_id', userId).maybeSingle()).data;
  }
  if (!own) throw new Error('Could not make an invite code.');
  const [{ count, error: countError }, { data: plan, error: planError }] = await Promise.all([
    supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('inviter_rewarded', true),
    supabase.from('user_plans').select('source, gift_ends_at').eq('user_id', userId).maybeSingle(),
  ]);
  if (countError) throw countError;
  if (planError) throw planError;
  const giftEnds = plan?.source === 'gift' && plan.gift_ends_at && new Date(plan.gift_ends_at) > new Date() ? plan.gift_ends_at : null;
  return { code: own.code, earned: count ?? 0, cap: INVITE_CAP, gift_ends_at: giftEnds };
}

/**
 * After a fresh log: claims the invite this user signed up with, once.
 * Never fails the log; answers the claim's status, or null when there was none.
 */
export async function claimInvite(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data: profile } = await supabase.from('profiles').select('signup_ref').eq('user_id', userId).maybeSingle();
    const code = inviteCodeFrom(profile?.signup_ref);
    if (!code) return null;
    const { data, error } = await supabase.rpc('claim_invite', { p_friend: userId, p_code: code });
    if (error) throw error;
    return typeof data === 'string' ? data : null;
  } catch (err: any) {
    console.error(JSON.stringify({ type: 'invite_claim', error: String(err?.message ?? err).slice(0, 300) }));
    return null;
  }
}

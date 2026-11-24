import { describe, it, expect, vi } from 'vitest';
import { newInviteCode, inviteCodeFrom, claimInvite, inviteFor, INVITE_CAP } from './invite.js';

// A tiny stand-in for the service-role client: each table answers what the test gives it.
function fakeDb({ profile = null as any, code = null as any, earned = 0, plan = null as any, claim = 'both', claimError = null as any } = {}) {
  const calls: any[] = [];
  const query = (table: string) => {
    const q: any = {
      select: () => q, eq: () => q, insert: (row: any) => { calls.push(['insert', table, row]); code = { code: row.code }; return q; },
      maybeSingle: async () => ({ data: table === 'profiles' ? profile : table === 'invite_codes' ? code : plan, error: null }),
      then: (ok: any) => ok({ count: earned, error: null }),
    };
    return q;
  };
  return {
    calls,
    from: (t: string) => query(t),
    rpc: vi.fn(async (name: string, args: any) => { calls.push(['rpc', name, args]); return { data: claimError ? null : claim, error: claimError }; }),
  } as any;
}

describe('Bring a friend', () => {
  it('makes 8-letter codes the database accepts, without look-alike characters', () => {
    for (let i = 0; i < 50; i++) expect(newInviteCode()).toMatch(/^[a-hj-km-np-z2-9]{8}$/);
  });
  it('reads the code only from an invite ref', () => {
    expect(inviteCodeFrom('invite-abcd2345')).toBe('abcd2345');
    expect(inviteCodeFrom('pricing')).toBeNull();
    expect(inviteCodeFrom('invite-ABCD2345')).toBeNull();
    expect(inviteCodeFrom(null)).toBeNull();
  });
  it('claims once after a log, and says nothing for other sign-ups', async () => {
    const db = fakeDb({ profile: { signup_ref: 'invite-abcd2345' } });
    expect(await claimInvite(db, 'u1')).toBe('both');
    expect(db.rpc).toHaveBeenCalledWith('claim_invite', { p_friend: 'u1', p_code: 'abcd2345' });
    const plain = fakeDb({ profile: { signup_ref: 'guide' } });
    expect(await claimInvite(plain, 'u1')).toBeNull();
    expect(plain.rpc).not.toHaveBeenCalled();
  });
  it('never fails the log when the claim errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await claimInvite(fakeDb({ profile: { signup_ref: 'invite-abcd2345' }, claimError: new Error('down') }), 'u1')).toBeNull();
    spy.mockRestore();
  });
  it('makes a code on first ask and reports months earned and the gift end', async () => {
    const ends = new Date(Date.now() + 86_400_000).toISOString();
    const db = fakeDb({ earned: 2, plan: { source: 'gift', gift_ends_at: ends } });
    const out = await inviteFor(db, 'u1');
    expect(out).toMatchObject({ earned: 2, cap: INVITE_CAP, gift_ends_at: ends });
    expect(out.code).toMatch(/^[a-z0-9]{8}$/);
    expect(db.calls.some((c: any[]) => c[0] === 'insert' && c[1] === 'invite_codes')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { startTrial, TRIAL_DAYS } from './trial.js';

// A stub of the one RPC startTrial makes; the decision itself lives in
// start_pro_trial() and is tested on staging (supabase/tests/bench_saas.sql).
function client(data: unknown, error: unknown = null) {
  const calls: unknown[] = [];
  return { calls, rpc: async (fn: string, args: unknown) => { calls.push([fn, args]); return { data, error }; } } as any;
}

describe('startTrial', () => {
  it('starts a 14-day trial through start_pro_trial for this user', async () => {
    const c = client([{ status: 'started', ends_at: '2026-11-19T12:00:00Z' }]);
    expect(await startTrial(c, 'u1')).toEqual({ status: 201, body: { status: 'started', trial_ends_at: '2026-11-19T12:00:00Z', days: TRIAL_DAYS } });
    expect(c.calls).toEqual([['start_pro_trial', { p_user: 'u1' }]]);
    expect(TRIAL_DAYS).toBe(14);
  });
  it('answers 409 once the trial was used, or when already on Pro', async () => {
    expect(await startTrial(client([{ status: 'trial_used', ends_at: '2026-10-01T00:00:00Z' }]), 'u'))
      .toMatchObject({ status: 409, body: { code: 'trial_used', trial_ends_at: '2026-10-01T00:00:00Z' } });
    expect(await startTrial(client({ status: 'already_pro', ends_at: null }), 'u'))
      .toMatchObject({ status: 409, body: { code: 'already_pro' } });
  });
  it('throws on a database error or an answer it does not know', async () => {
    const err = new Error('timeout');
    await expect(startTrial(client(null, err), 'u')).rejects.toBe(err);
    await expect(startTrial(client([]), 'u')).rejects.toThrow(/start_pro_trial answered/);
  });
});

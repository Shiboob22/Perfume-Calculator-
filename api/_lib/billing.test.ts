import { describe, expect, it } from 'vitest';
import { applyEvent, resolvePlan } from './billing.js';

const active = { status: 'active' as const, plan: 'pro' };
const ended = { status: 'ended' as const, plan: null };

describe('resolvePlan', () => {
  it('sets the plan an active subscription names', () => {
    expect(resolvePlan(null, active)).toEqual({ plan_id: 'pro', source: 'provider' });
    expect(resolvePlan({ plan_id: 'free', source: 'manual' }, active)).toEqual({ plan_id: 'pro', source: 'provider' });
  });

  it('returns a provider subscriber to Free when it ends', () => {
    expect(resolvePlan({ plan_id: 'pro', source: 'provider' }, ended)).toEqual({ plan_id: 'free', source: 'provider' });
  });

  it('never touches a plan the owner granted by hand', () => {
    const comp = { plan_id: 'pro', source: 'manual' as const };
    expect(resolvePlan(comp, active)).toBeNull();
    expect(resolvePlan(comp, ended)).toBeNull();
  });

  it('leaves Free users and unknown events alone', () => {
    expect(resolvePlan(null, ended)).toBeNull();
    expect(resolvePlan({ plan_id: 'free', source: 'provider' }, ended)).toBeNull();
    expect(resolvePlan({ plan_id: 'pro', source: 'provider' }, { status: 'other', plan: null })).toBeNull();
    expect(resolvePlan(null, { status: 'active', plan: null })).toBeNull();
  });
});

// A fake Supabase client: just enough of the query builder for applyEvent.
function fakeClient({ processed = null as string | null, upsertError = null as any } = {}) {
  const calls: string[] = [];
  const builder = (table: string) => {
    const b: any = {
      upsert: (row: any) => { calls.push(`${table}.upsert`); return Promise.resolve({ error: table === 'user_plans' ? upsertError : null, row }); },
      select: () => b, eq: () => b,
      single: () => Promise.resolve({ data: { id: 1, processed_at: processed }, error: null }),
      maybeSingle: () => Promise.resolve({ data: { plan_id: 'free', source: 'manual' }, error: null }),
      update: () => { calls.push(`${table}.update`); return { eq: () => Promise.resolve({ error: null }) }; },
    };
    return b;
  };
  return { client: { from: builder } as any, calls };
}

const event = { provider: 'test', eventId: 'e1', type: 'sub', userId: 'u1', customerId: 'c1', status: 'active' as const, plan: 'pro', periodEnd: null, raw: {} };

describe('applyEvent', () => {
  it('applies a new event and marks it processed', async () => {
    const { client, calls } = fakeClient();
    expect(await applyEvent(client, event)).toBe('applied');
    expect(calls).toEqual(['billing_events.upsert', 'user_plans.upsert', 'billing_events.update']);
  });

  it('skips an event already processed', async () => {
    const { client, calls } = fakeClient({ processed: '2026-09-28T00:00:00Z' });
    expect(await applyEvent(client, event)).toBe('duplicate');
    expect(calls).toEqual(['billing_events.upsert']);
  });

  it('closes out an event for a deleted user instead of failing forever', async () => {
    const { client, calls } = fakeClient({ upsertError: { code: '23503' } });
    expect(await applyEvent(client, event)).toBe('orphaned');
    expect(calls).toContain('billing_events.update');
  });

  it('fails (so the provider retries) on any other error', async () => {
    const { client } = fakeClient({ upsertError: { code: '57014', message: 'timeout' } });
    await expect(applyEvent(client, event)).rejects.toMatchObject({ code: '57014' });
  });
});

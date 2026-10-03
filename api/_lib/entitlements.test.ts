import { describe, it, expect } from 'vitest';
import { loadEntitlements } from './entitlements.js';

// A stub of the two reads loadEntitlements makes: user_plans, then plans.
function client(results: Record<string, { data: unknown; error: unknown }>) {
  return {
    from(table: string) {
      const q: any = { select: () => q, eq: () => q, maybeSingle: async () => results[table] };
      return q;
    },
  } as any;
}

const PRO = { id: 'pro', name: 'Pro', features: ['inventory', 'ai.ask'], batch_cap: null };
const FREE = { id: 'free', name: 'Free', features: ['cards.download'], batch_cap: 25 };

describe('loadEntitlements', () => {
  it("returns the user's plan", async () => {
    const e = await loadEntitlements(client({ user_plans: { data: { plans: PRO }, error: null } }), 'u');
    expect(e.plan).toBe('pro');
    expect(e.batchCap).toBeNull();
  });

  it('means Free when the user has no plan row', async () => {
    const e = await loadEntitlements(client({
      user_plans: { data: null, error: null }, plans: { data: FREE, error: null },
    }), 'u');
    expect(e.plan).toBe('free');
    expect(e.batchCap).toBe(25);
  });

  it('throws when the plan read fails, instead of treating the user as Free', async () => {
    const err = new Error('canceling statement due to statement timeout');
    await expect(loadEntitlements(client({ user_plans: { data: null, error: err } }), 'u')).rejects.toBe(err);
  });

  it('throws when the Free plan read fails', async () => {
    const err = new Error('connection reset');
    await expect(loadEntitlements(client({
      user_plans: { data: null, error: null }, plans: { data: null, error: err },
    }), 'u')).rejects.toBe(err);
  });
});

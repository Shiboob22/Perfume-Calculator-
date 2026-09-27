import { describe, expect, it } from 'vitest';
import { resolvePlan } from './billing.js';

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

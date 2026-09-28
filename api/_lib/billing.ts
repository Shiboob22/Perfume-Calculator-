import type { SupabaseClient } from '@supabase/supabase-js';

// The billing seam. No payment provider is connected; this is the shape one
// plugs into. See docs/billing.md.

// A provider event, reduced to what the app needs. Adapters translate their
// own payloads (Stripe, Paddle, Lemon Squeezy…) into this.
export type BillingEvent = {
  provider: string;
  eventId: string;          // the provider's id: events are stored once
  type: string;             // the provider's event type, for the record
  userId: string | null;    // our user id, from the checkout's metadata
  customerId: string | null;
  status: 'active' | 'ended' | 'other';
  plan: string | null;      // our plan id when status is 'active'
  periodEnd: string | null; // ISO timestamp
  raw: unknown;
};

export interface BillingProvider {
  name: string;
  // Check the signature on the raw request body and translate the payload.
  // Throws on a bad signature: the webhook answers 400 and stores nothing.
  verify(rawBody: string, headers: Record<string, string | string[] | undefined>): Promise<BillingEvent>;
  // A hosted checkout page for this user and plan. The user id travels in
  // the provider's metadata so the webhook can find them again.
  checkoutUrl(user: { id: string; email: string }, plan: string): Promise<string>;
}

// The provider in use, or null while billing is off. Set BILLING_PROVIDER
// and add an adapter here when one is chosen.
export function getProvider(): BillingProvider | null {
  return null;
}

type CurrentPlan = { plan_id: string; source: 'manual' | 'provider' } | null;

// What a user's plan becomes after a provider event.
//   · An active subscription sets the plan it names.
//   · An ended one returns the user to Free.
//   · A plan the owner granted by hand (source 'manual', not Free) is never
//     taken away by a provider event: ending a subscription does not cancel
//     a comp. OWNER DECISION PENDING — see docs/billing.md.
//   · Anything else leaves the plan alone (null).
export function resolvePlan(current: CurrentPlan, event: Pick<BillingEvent, 'status' | 'plan'>) {
  const manualGrant = current?.source === 'manual' && current.plan_id !== 'free';
  if (event.status === 'active' && event.plan) {
    if (manualGrant) return null;
    return { plan_id: event.plan, source: 'provider' as const };
  }
  if (event.status === 'ended') {
    if (manualGrant || !current || current.plan_id === 'free') return null;
    return { plan_id: 'free', source: 'provider' as const };
  }
  return null;
}

// Record the event once, then apply it. Providers retry until they get a
// 2xx, so the same event can arrive again: one already processed returns
// 'duplicate'; one stored but not processed (the last attempt failed
// part-way) is applied again. Applying is idempotent — it sets, never adds.
export async function applyEvent(supabase: SupabaseClient, event: BillingEvent) {
  const { error: insertError } = await supabase
    .from('billing_events')
    .upsert(
      { provider: event.provider, event_id: event.eventId, type: event.type, payload: event.raw },
      { onConflict: 'provider,event_id', ignoreDuplicates: true },
    );
  if (insertError) throw insertError;
  const { data: stored, error: readError } = await supabase
    .from('billing_events').select('id, processed_at')
    .eq('provider', event.provider).eq('event_id', event.eventId).single();
  if (readError) throw readError;
  if (stored.processed_at) return 'duplicate' as const;

  if (event.userId) {
    const { data: current, error } = await supabase
      .from('user_plans').select('plan_id, source').eq('user_id', event.userId).maybeSingle();
    if (error) throw error;
    const next = resolvePlan(current as CurrentPlan, event);
    const { error: upsertError } = await supabase.from('user_plans').upsert({
      user_id: event.userId,
      ...(next ?? { plan_id: (current as CurrentPlan)?.plan_id ?? 'free', source: (current as CurrentPlan)?.source ?? 'manual' }),
      provider_customer_id: event.customerId,
      current_period_end: event.periodEnd,
      updated_at: new Date().toISOString(),
    });
    // 23503: the user no longer exists (they deleted their account). There
    // is nothing to apply; mark the event done so the provider stops
    // retrying it forever.
    if (upsertError?.code === '23503') {
      await markProcessed(supabase, stored.id);
      return 'orphaned' as const;
    }
    if (upsertError) throw upsertError;
  }

  await markProcessed(supabase, stored.id);
  return 'applied' as const;
}

async function markProcessed(supabase: SupabaseClient, id: number) {
  const { error } = await supabase.from('billing_events').update({ processed_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { applyEvent, getProvider } from '../_lib/billing.js';

// Vercel must hand over the raw body: the signature is over exact bytes.
export const config = { api: { bodyParser: false } };

async function rawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// POST /api/billing/webhook — where a payment provider reports checkouts,
// renewals and cancellations. Billing is off until a provider is chosen, so
// this answers 501. See docs/billing.md.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const provider = getProvider();
  if (!provider) return res.status(501).json({ error: 'Billing is not enabled.', code: 'billing_disabled' });

  let event;
  try {
    event = await provider.verify(await rawBody(req), req.headers);
  } catch {
    return res.status(400).json({ error: 'Invalid signature.' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const result = await applyEvent(supabase, event);
    return res.status(200).json({ ok: true, result });
  } catch (err: any) {
    // A 5xx makes the provider retry; the stored event id keeps it once.
    return res.status(500).json({ error: err.message || 'Could not apply the event.' });
  }
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Per-action limits: [hits, window in seconds]. PROPOSED, pending the
// owner; generous enough that a real blender never meets them.
export const LIMITS = {
  ai: [30, 3600],          // Ask / tips / insights / lookups: 30 an hour
  live: [20, 600],         // live Parfumo lookups: 20 per 10 minutes
  batch: [60, 600],        // batch logs: 60 per 10 minutes
  deleteAccount: [5, 3600],
  log: [30, 600],          // client error reports per IP
} as const satisfies Record<string, readonly [number, number]>;

export type LimitName = keyof typeof LIMITS;

// The caller's IP on Vercel (the platform sets the first hop). Only used as
// a rate-limit key for requests without a signed-in user.
export function clientIp(req: Pick<VercelRequest, 'headers'>): string {
  const h = req.headers['x-vercel-forwarded-for'] ?? req.headers['x-forwarded-for'] ?? req.headers['x-real-ip'];
  const first = (Array.isArray(h) ? h[0] : h)?.split(',')[0]?.trim();
  return first || 'unknown';
}

// True when the caller is over the limit, having answered 429 already.
// Fails open: if the counter can't be reached the request goes ahead, so a
// database hiccup never locks a blender out at the bench.
export async function overLimit(
  supabase: SupabaseClient,
  res: VercelResponse,
  name: LimitName,
  who: string,
): Promise<boolean> {
  const [limit, windowSeconds] = LIMITS[name];
  const { data, error } = await supabase.rpc('hit_rate_limit', {
    p_key: `${name}:${who}`, p_limit: limit, p_window_seconds: windowSeconds,
  });
  if (error || data !== false) return false;
  res.setHeader('Retry-After', String(windowSeconds));
  res.status(429).json({ error: 'Too many requests — please wait a little and try again.', code: 'rate_limited' });
  return true;
}

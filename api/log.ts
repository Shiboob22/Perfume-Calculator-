import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { clientIp, overLimit } from './_lib/rateLimit.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch: (input: Parameters<typeof fetch>[0], init: RequestInit = {}) => fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(3_000) }) } },
);

const FIELDS = { message: 500, name: 100, stack: 4000, componentStack: 2000, path: 200, release: 40 } as const;

// POST /api/log — client error reports from src/lib/reportError.js,
// written to the Vercel runtime logs as one JSON line each. Unauthenticated
// (a crash can happen before sign-in), so fields are whitelisted and cut to
// size, and each IP is rate-limited.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (await overLimit(supabase, res, 'log', clientIp(req))) return;

  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object' || typeof body.message !== 'string') return res.status(400).end();

  const report: Record<string, string> = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    if (typeof body[key] === 'string') report[key] = body[key].slice(0, max);
  }
  report.path = (report.path || '').split(/[?#]/)[0];
  console.error(JSON.stringify({ type: 'client_error', ua: String(req.headers['user-agent'] || '').slice(0, 200), ...report }));
  return res.status(204).end();
}

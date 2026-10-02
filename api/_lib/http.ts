import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, isAuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js';

// The request plumbing every signed-in endpoint repeats (CORS, timeouts,
// the caller's user id), shared by the endpoints added from Phase 6 on.
// The older endpoints keep their own copies of the same code.

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

const ALLOWED_ORIGINS = [
  'https://scent-handbook-app.vercel.app',
  'https://scent-handbook-app-shiboob22s-projects.vercel.app',
];

export function setCors(req: VercelRequest, res: VercelResponse, methods: string) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', `${methods}, OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

// Supabase calls must never hang a request (see api/batches.ts): reads get
// 5 s, writes 15 s.
export function timedFetch(input: Parameters<typeof fetch>[0], init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase();
  const ms = method === 'GET' || method === 'HEAD' ? 5_000 : 15_000;
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(ms) });
}

export function isTimeout(err: any) {
  return /TimeoutError/.test(String(err?.message ?? ''));
}

export const SLOW_READ = 'Database is slow to respond — please try again.';
export const SLOW_WRITE = 'Database is slow to respond. The change may still save — refresh before trying again.';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The service-role client: bypasses RLS, so every query scopes by user_id. */
export function serviceClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: timedFetch } });
}

/** The anon client: RLS and grants apply exactly as for a visitor. */
export function anonClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: timedFetch } });
}

/**
 * The signed-in caller's user id, or null after answering 401 (no or bad
 * token) or 503 (auth unreachable: a network failure is not a bad token).
 */
export async function requireUser(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (token) {
    const { data: { user }, error } = await createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: timedFetch },
    }).auth.getUser();
    if (error && isAuthRetryableFetchError(error)) {
      res.status(503).json({ error: SLOW_READ });
      return null;
    }
    if (user) return user.id;
  }
  res.status(401).json({ error: 'Unauthorized: Missing or invalid session token.' });
  return null;
}

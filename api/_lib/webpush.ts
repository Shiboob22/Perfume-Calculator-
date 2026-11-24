import { createPrivateKey, sign } from 'node:crypto';

// Web Push without a library, and without a payload. A push with no body needs
// only a VAPID token (RFC 8292): a short ES256 JWT naming who sends it, signed
// with our private key. The service worker (public/push-sw.js) writes the words.
// Keys: scripts/make-vapid.mjs. Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (both
// base64url, the public key the 65-byte uncompressed point), VAPID_SUBJECT.

// (casts: the Buffer typings of the installed @types/node disagree with themselves about ArrayBufferLike)
const b64u = (b: any) => Buffer.from(b).toString('base64url');

export interface Vapid { publicKey: string; privateKey: string; subject: string }

export function vapidFromEnv(env: NodeJS.ProcessEnv = process.env): Vapid | null {
  const publicKey = env.VAPID_PUBLIC_KEY, privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: env.VAPID_SUBJECT || 'https://scent-handbook-app.vercel.app' };
}

/** The Authorization header's JWT for one push service (`audience` = its origin). */
export function vapidJwt(audience: string, v: Vapid, now = Date.now()): string {
  const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64u(JSON.stringify({ aud: audience, exp: Math.floor(now / 1000) + 12 * 3600, sub: v.subject }));
  const point = Buffer.from(v.publicKey, 'base64url'); // 0x04 || x || y
  if (point.length !== 65 || point[0] !== 4) throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 point');
  const key = createPrivateKey({
    format: 'jwk',
    key: { kty: 'EC', crv: 'P-256', d: v.privateKey, x: b64u(point.subarray(1, 33)), y: b64u(point.subarray(33)) },
  });
  const sig = sign('sha256', Buffer.from(`${header}.${claims}`) as unknown as Uint8Array, { key, dsaEncoding: 'ieee-p1363' });
  return `${header}.${claims}.${b64u(sig)}`;
}

/** Only a push service's https endpoint is stored and called. */
export function validEndpoint(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 600) return false;
  try { return new URL(v).protocol === 'https:'; } catch { return false; }
}

export type PushResult = 'sent' | 'gone' | 'failed';

/** Sends one empty push. 404 and 410 mean the subscription is gone and should be deleted. */
export async function sendPush(endpoint: string, v: Vapid, fetcher: typeof fetch = fetch): Promise<PushResult> {
  try {
    const res = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${vapidJwt(new URL(endpoint).origin, v)}, k=${v.publicKey}`,
        TTL: String(24 * 3600),
        Urgency: 'normal',
        'Content-Length': '0',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return 'gone';
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}

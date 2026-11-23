import { describe, it, expect } from 'vitest';
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { sendPush, validEndpoint, vapidFromEnv, vapidJwt, type Vapid } from './webpush.js';

function keys(): Vapid {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = privateKey.export({ format: 'jwk' }) as { x: string; y: string; d: string };
  const point = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);
  return { publicKey: point.toString('base64url'), privateKey: jwk.d, subject: 'https://example.test' };
}

describe('web push (no payload)', () => {
  it('signs a VAPID token a push service can verify with the public key', () => {
    const v = keys();
    const now = Date.UTC(2026, 10, 15);
    const jwt = vapidJwt('https://push.example', v, now);
    const [h, c, sig] = jwt.split('.');
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ typ: 'JWT', alg: 'ES256' });
    const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
    expect(claims).toEqual({ aud: 'https://push.example', exp: Math.floor(now / 1000) + 12 * 3600, sub: 'https://example.test' });
    const point = Buffer.from(v.publicKey, 'base64url');
    const pub = createPublicKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256', x: point.subarray(1, 33).toString('base64url'), y: point.subarray(33).toString('base64url') } });
    expect(verify('sha256', Buffer.from(`${h}.${c}`) as unknown as Uint8Array, { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url') as unknown as Uint8Array)).toBe(true);
    expect(Buffer.from(sig, 'base64url').length).toBe(64);
  });
  it('refuses a public key that is not an uncompressed P-256 point', () => {
    expect(() => vapidJwt('https://p', { publicKey: 'AAAA', privateKey: 'x', subject: 's' })).toThrow(/uncompressed/);
  });
  it('reads the keys from the environment, or reports push off', () => {
    expect(vapidFromEnv({})).toBeNull();
    expect(vapidFromEnv({ VAPID_PUBLIC_KEY: 'a' })).toBeNull();
    expect(vapidFromEnv({ VAPID_PUBLIC_KEY: 'a', VAPID_PRIVATE_KEY: 'b' })).toMatchObject({ publicKey: 'a', privateKey: 'b' });
  });
  it('stores and calls only https endpoints', () => {
    expect(validEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    for (const bad of ['http://x.test/a', 'ftp://x', 'not a url', '', 5, null, 'https://' + 'a'.repeat(700)]) expect(validEndpoint(bad)).toBe(false);
  });
  it('sends an empty push with the VAPID header and reads the answer', async () => {
    const v = keys();
    let seen: { url: string; init: RequestInit } | null = null;
    const answer = (status: number): typeof fetch => (async (url: any, init: any) => { seen = { url: String(url), init }; return new Response(null, { status }); }) as any;
    expect(await sendPush('https://push.example/s/1', v, answer(201))).toBe('sent');
    const headers = seen!.init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
    expect(headers.Authorization).toContain(`k=${v.publicKey}`);
    expect(headers['Content-Length']).toBe('0');
    expect(seen!.init.body).toBeUndefined();
    expect(await sendPush('https://push.example/s/1', v, answer(410))).toBe('gone');
    expect(await sendPush('https://push.example/s/1', v, answer(404))).toBe('gone');
    expect(await sendPush('https://push.example/s/1', v, answer(500))).toBe('failed');
    expect(await sendPush('https://push.example/s/1', v, (async () => { throw new Error('offline'); }) as any)).toBe('failed');
  });
});

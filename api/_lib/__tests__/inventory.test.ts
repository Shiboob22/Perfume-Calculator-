import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbFor, fakeReq, fakeRes, USER, type FakeDb } from './harness.js';

let db: FakeDb;
let signedIn: string | null = USER;
vi.mock('../http.js', async (importOriginal) => {
  const real: any = await importOriginal();
  return {
    ...real,
    serviceClient: () => db,
    requireUser: async (_req: any, res: any) => {
      if (signedIn) return signedIn;
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    },
  };
});
const { default: handler } = await import('../../inventory.js');

async function call(method: string, opts: Parameters<typeof fakeReq>[1] = {}) {
  const res = fakeRes();
  await handler(fakeReq(method, opts), res);
  return res;
}

const OIL = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  db = dbFor('pro', { inventory: [] });
  signedIn = USER;
});

describe('/api/inventory', () => {
  it('refuses a caller without a session', async () => {
    signedIn = null;
    expect((await call('GET')).statusCode).toBe(401);
  });

  it('locks the endpoint on Free', async () => {
    db = dbFor('free', { inventory: [] });
    expect((await call('GET')).statusCode).toBe(403);
  });

  it('tracks an oil without touching its stock', async () => {
    db.rows('inventory').push({ user_id: USER, fragrance_id: OIL, stock_g: 40 });
    const res = await call('POST', { body: { fragrance_id: OIL } });
    expect(res.statusCode).toBe(200);
    expect(db.rows('inventory')[0].stock_g).toBe(40);
  });

  it('refuses ids that are not UUIDs', async () => {
    for (const [method, opts] of [
      ['POST', { body: { fragrance_id: 'drop table' } }],
      ['PATCH', { body: { id: 'x', restock_g: 5 } }],
      ['DELETE', { query: { id: '1; select' } }],
    ] as const) {
      const res = await call(method, opts as any);
      expect(res.statusCode, method).toBe(400);
      expect(res.body.code, method).toBe('invalid_id');
    }
  });

  it('never returns database text on a 500', async () => {
    db.fail('inventory', 'upsert', { message: 'duplicate key value violates unique constraint "x"', code: '23505' });
    const res = await call('POST', { body: { fragrance_id: OIL } });
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/constraint|duplicate/);
    expect(res.body.code).toBe('server_error');
  });

  it('answers 429 over the limit', async () => {
    db.rpcHandlers.hit_rate_limit = () => ({ data: false, error: null });
    const res = await call('POST', { body: { fragrance_id: OIL } });
    expect(res.statusCode).toBe(429);
  });

  it('does not rate limit reads', async () => {
    db.rpcHandlers.hit_rate_limit = () => ({ data: false, error: null });
    expect((await call('GET')).statusCode).toBe(200);
  });
});

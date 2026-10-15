import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbFor, fakeReq, fakeRes, USER, OTHER, type FakeDb } from './harness.js';

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
  db = dbFor('pro');
  signedIn = USER;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('/api/inventory', () => {
  it('needs a signed-in user and the inventory feature', async () => {
    signedIn = null;
    expect((await call('GET')).statusCode).toBe(401);
    signedIn = USER;
    db = dbFor('free');
    const res = await call('GET');
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('feature_locked');
  });

  it('tracks an oil for the caller only', async () => {
    const res = await call('POST', { body: { fragrance_id: OIL, stock_g: 50 } });
    expect(res.statusCode).toBe(200);
    expect(db.rows('inventory')).toHaveLength(1);
    expect(db.rows('inventory')[0]).toMatchObject({ user_id: USER, fragrance_id: OIL, stock_g: 50 });
  });

  it('refuses an id that is not a UUID, on every method', async () => {
    for (const bad of ['', 'abc', '1; drop table inventory', 42, null, undefined]) {
      const post = await call('POST', { body: { fragrance_id: bad, stock_g: 1 } });
      expect(post.statusCode, String(bad)).toBe(400);
      expect(post.body.code).toBe('invalid_fragrance_id');
      const patch = await call('PATCH', { body: { id: bad, restock_g: 1 } });
      expect(patch.statusCode, String(bad)).toBe(400);
      expect(patch.body.code).toBe('invalid_fragrance_id');
    }
    const del = await call('DELETE', { query: { id: 'abc' } });
    expect(del.statusCode).toBe(400);
    expect(del.body.code).toBe('invalid_fragrance_id');
    expect(db.writes).toHaveLength(0);
  });

  it('refuses negative, huge and non-numeric amounts', async () => {
    for (const body of [{ stock_g: -1 }, { stock_g: 1e9 }, { stock_g: '5' }, { low_stock_threshold_g: -2 }, { stock_g: NaN }]) {
      const res = await call('POST', { body: { fragrance_id: OIL, ...body } });
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
      expect(res.body.code).toBe('invalid_payload');
    }
    for (const restock_g of ['5', 1e9, NaN, undefined]) {
      const res = await call('PATCH', { body: { id: OIL, restock_g } });
      expect(res.statusCode, String(restock_g)).toBe(400);
      expect(res.body.code).toBe('invalid_payload');
    }
  });

  it('restocks through the database function for the caller', async () => {
    db.rpcHandlers.restock_inventory = (args) => ({ data: { fragrance_id: args.p_fragrance_id, stock_g: 10 }, error: null });
    const res = await call('PATCH', { body: { id: OIL, restock_g: -5 } });
    expect(res.statusCode).toBe(200);
    expect(db.rpcs.find((r) => r.name === 'restock_inventory')!.args).toEqual({ p_user_id: USER, p_fragrance_id: OIL, p_delta: -5 });
  });

  it('answers not_tracked for an oil with no inventory row', async () => {
    db.rpcHandlers.restock_inventory = () => ({ data: { fragrance_id: null }, error: null });
    const res = await call('PATCH', { body: { id: OIL, restock_g: 5 } });
    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('not_tracked');
  });

  it('deletes only the caller\'s row', async () => {
    db = dbFor('pro', { inventory: [{ user_id: USER, fragrance_id: OIL, stock_g: 5 }, { user_id: OTHER, fragrance_id: OIL, stock_g: 9 }] });
    expect((await call('DELETE', { query: { id: OIL } })).statusCode).toBe(200);
    expect(db.rows('inventory').map((r) => r.user_id)).toEqual([OTHER]);
  });

  it('rate-limits writes (429) but not reads', async () => {
    db.rpcHandlers.hit_rate_limit = () => ({ data: false, error: null });
    for (const [method, opts] of [
      ['POST', { body: { fragrance_id: OIL } }],
      ['PATCH', { body: { id: OIL, restock_g: 1 } }],
      ['DELETE', { query: { id: OIL } }],
    ] as const) {
      const res = await call(method, opts as any);
      expect(res.statusCode, method).toBe(429);
      expect(res.body.code).toBe('rate_limited');
    }
    expect(db.writes).toHaveLength(0);
    expect((await call('GET')).statusCode).toBe(200);
  });

  it('never returns database text on a 500', async () => {
    db.fail('inventory', 'select', { message: 'relation "secret_table" does not exist', code: '42P01' });
    const res = await call('GET');
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('server_error');
    expect(JSON.stringify(res.body)).not.toContain('secret_table');
  });

  it('turns a database timeout into a 503 the app can retry', async () => {
    db.fail('inventory', 'select', new Error('TimeoutError: The operation was aborted'));
    const res = await call('GET');
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('slow_read');
  });

  it('answers 405 for other methods', async () => {
    expect((await call('PUT')).statusCode).toBe(405);
  });
});

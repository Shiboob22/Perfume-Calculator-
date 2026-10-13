import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbFor, fakeReq, fakeRes, USER, OTHER, type FakeDb } from './harness.js';

// The handler gets the fake database through the shared http helpers.
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
const { default: handler } = await import('../../batches.js');

async function call(method: string, opts: Parameters<typeof fakeReq>[1] = {}) {
  const res = fakeRes();
  await handler(fakeReq(method, opts), res);
  return res;
}

const ID = '11111111-1111-4111-8111-111111111111';
const BATCH = {
  fragrance_name: 'Oud Nights', tier: 'woody', blend_date: '2026-10-01', concentration_pct: 25,
  oil_g: 23.75, oil_ml: 25, ethanol_g: 60.75, ethanol_ml: 75, total_g: 84.5, total_ml: 100, basis: 'volume',
};

beforeEach(() => {
  db = dbFor('pro');
  signedIn = USER;
});

describe('POST /api/batches', () => {
  it('logs a batch for the signed-in user, with the client id', async () => {
    const res = await call('POST', { body: { ...BATCH, id: ID } });
    expect(res.statusCode).toBe(201);
    expect(res.body.batch).toMatchObject({ id: ID, user_id: USER, fragrance_name: 'Oud Nights' });
    expect(db.rows('batches')).toHaveLength(1);
  });

  it('answers a re-sent batch with the stored one, without a second row', async () => {
    await call('POST', { body: { ...BATCH, id: ID } });
    const res = await call('POST', { body: { ...BATCH, id: ID } });
    expect(res.statusCode).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(db.rows('batches')).toHaveLength(1);
  });

  it('ignores user_id and other columns sent by the client', async () => {
    const res = await call('POST', { body: { ...BATCH, user_id: OTHER, is_admin: true } });
    expect(res.statusCode).toBe(201);
    expect(res.body.batch.user_id).toBe(USER);
    expect(res.body.batch).not.toHaveProperty('is_admin');
  });

  it('refuses a Free user at the cap with batch_cap', async () => {
    db = dbFor('free', { batches: Array.from({ length: 25 }, (_, i) => ({ id: `b${i}`, user_id: USER })) });
    const res = await call('POST', { body: BATCH });
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('batch_cap');
  });

  it('answers 5xx, not batch_cap, when the plan cannot be read', async () => {
    db.fail('user_plans', 'select', { message: 'canceling statement due to statement timeout' });
    const res = await call('POST', { body: BATCH });
    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    expect(res.body.code).not.toBe('batch_cap');
    expect(db.rows('batches')).toHaveLength(0);
  });

  it('rejects a batch with missing fields', async () => {
    const res = await call('POST', { body: { fragrance_name: 'x' } });
    expect(res.statusCode).toBe(400);
  });

  it('needs a signed-in user', async () => {
    signedIn = null;
    const res = await call('POST', { body: BATCH });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/batches stock deduction', () => {
  const FRAG = '22222222-2222-4222-8222-222222222222';
  const tracked = () => { db.rpcHandlers.restock_inventory = (a: any) => ({ data: { fragrance_id: a.p_fragrance_id, stock_g: 76.25 }, error: null }); };
  const deducts = () => db.rpcs.filter((r) => r.name === 'restock_inventory');

  it('deducts the oil for a Pro user on a fresh log', async () => {
    tracked();
    const res = await call('POST', { body: { ...BATCH, id: ID, fragrance_id: FRAG, deduct_oil_g: 23.75 } });
    expect(res.statusCode).toBe(201);
    expect(res.body.stock).toBe('deducted');
    expect(deducts()).toEqual([{ name: 'restock_inventory', args: { p_user_id: USER, p_fragrance_id: FRAG, p_delta: -23.75 } }]);
  });

  it('never deducts twice for a re-sent batch', async () => {
    tracked();
    await call('POST', { body: { ...BATCH, id: ID, fragrance_id: FRAG, deduct_oil_g: 23.75 } });
    const res = await call('POST', { body: { ...BATCH, id: ID, fragrance_id: FRAG, deduct_oil_g: 23.75 } });
    expect(res.body.duplicate).toBe(true);
    expect(res.body.stock).toBeUndefined();
    expect(deducts()).toHaveLength(1);
  });

  it('answers not_tracked for an oil without stock, and locked on Free', async () => {
    let res = await call('POST', { body: { ...BATCH, fragrance_id: FRAG, deduct_oil_g: 10 } });
    expect(res.body.stock).toBe('not_tracked');
    db = dbFor('free');
    res = await call('POST', { body: { ...BATCH, fragrance_id: FRAG, deduct_oil_g: 10 } });
    expect(res.statusCode).toBe(201);
    expect(res.body.stock).toBe('locked');
    expect(deducts()).toEqual([]);
  });

  it('keeps the batch when the stock step fails', async () => {
    db.rpcHandlers.restock_inventory = () => ({ data: null, error: { message: 'boom' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('POST', { body: { ...BATCH, fragrance_id: FRAG, deduct_oil_g: 10 } });
    spy.mockRestore();
    expect(res.statusCode).toBe(201);
    expect(res.body.stock).toBe('failed');
    expect(db.rows('batches')).toHaveLength(1);
  });

  it('leaves stock to the app with the kill switch, and alone when not asked', async () => {
    tracked();
    process.env.STOCK_ON_LOG = 'client';
    let res = await call('POST', { body: { ...BATCH, fragrance_id: FRAG, deduct_oil_g: 10 } });
    delete process.env.STOCK_ON_LOG;
    expect(res.body.stock).toBe('client');
    res = await call('POST', { body: { ...BATCH, fragrance_id: FRAG } });
    expect(res.body.stock).toBeUndefined();
    expect(deducts()).toEqual([]);
  });
});

describe('POST /api/batches record fields', () => {
  it('stores the lot and the bottle as entered', async () => {
    const res = await call('POST', { body: { ...BATCH, lot: '  L-0412 ', amount: 50, unit: 'g' } });
    expect(res.body.batch).toMatchObject({ lot: 'L-0412', amount: 50, unit: 'g' });
  });
  it('drops malformed extras instead of refusing the log', async () => {
    const res = await call('POST', { body: { ...BATCH, lot: 'x'.repeat(80), amount: -3, unit: 'gallon' } });
    expect(res.statusCode).toBe(201);
    expect(res.body.batch).not.toHaveProperty('amount');
    expect(res.body.batch).not.toHaveProperty('unit');
    expect(res.body.batch.lot).toHaveLength(60);
  });
});

describe('GET /api/batches', () => {
  it("lists only the user's own batches", async () => {
    db = dbFor('pro', { batches: [{ id: 'a', user_id: USER, created_at: '2026-10-01' }, { id: 'b', user_id: OTHER, created_at: '2026-10-02' }] });
    const res = await call('GET', { query: { limit: '100' } });
    expect(res.statusCode).toBe(200);
    expect(res.body.batches.map((b: any) => b.id)).toEqual(['a']);
  });
});

describe('DELETE /api/batches', () => {
  it("deletes only the user's own batch", async () => {
    db = dbFor('pro', { batches: [{ id: ID, user_id: OTHER }] });
    const res = await call('DELETE', { query: { id: ID } });
    expect(res.statusCode).toBe(200);
    expect(db.rows('batches')).toHaveLength(1);
  });
});

describe('PATCH /api/batches (share)', () => {
  it("can't share another user's batch", async () => {
    db = dbFor('pro', { batches: [{ id: ID, user_id: OTHER, ...BATCH }] });
    const res = await call('PATCH', { body: { id: ID, share: { public_note: null, rest_days: 10 } } });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/batches (edit)', () => {
  it('changes only the record fields sent, for the owner', async () => {
    db = dbFor('pro', { batches: [{ id: ID, user_id: USER, ...BATCH, notes: 'old' }] });
    const res = await call('PATCH', { body: { id: ID, edit: { fragrance_name: ' Oud II ', lot: 'L2', notes: '', actual_oil_g: '24.1', blend_date: '2026-09-30', oil_g: 1, user_id: OTHER } } });
    expect(res.statusCode).toBe(200);
    expect(res.body.batch).toMatchObject({ fragrance_name: 'Oud II', lot: 'L2', notes: null, actual_oil_g: 24.1, blend_date: '2026-09-30', oil_g: 23.75, user_id: USER });
  });
  it("answers 404 for another user's batch and changes nothing", async () => {
    db = dbFor('pro', { batches: [{ id: ID, user_id: OTHER, ...BATCH }] });
    const res = await call('PATCH', { body: { id: ID, edit: { fragrance_name: 'Mine now' } } });
    expect(res.statusCode).toBe(404);
    expect(db.rows('batches')[0].fragrance_name).toBe('Oud Nights');
  });
  it('refuses a bad value with the field', async () => {
    for (const edit of [{ fragrance_name: '' }, { blend_date: '2026-13-45' }, { actual_oil_g: -1 }, { lot: 'x'.repeat(61) }, {}, [1]]) {
      const res = await call('PATCH', { body: { id: ID, edit } });
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('invalid_edit');
    }
    expect(db.writes).toEqual([]);
  });
});

describe('GET /api/batches filters', () => {
  const FRAG = '22222222-2222-4222-8222-222222222222';
  beforeEach(() => {
    db = dbFor('pro', { batches: [
      { id: ID, user_id: USER, fragrance_id: FRAG, fragrance_name: 'Oud Nights', created_at: '1' },
      { id: 'b', user_id: USER, fragrance_id: null, fragrance_name: 'oud nights', created_at: '2' },
      { id: 'c', user_id: USER, fragrance_id: null, fragrance_name: 'Rose', created_at: '3' },
      { id: 'd', user_id: OTHER, fragrance_id: FRAG, fragrance_name: 'Oud Nights', created_at: '4' },
    ] });
  });
  const ids = (res: any) => res.body.batches.map((x: any) => x.id);
  it('by id, by oil and by name, only the user\'s own', async () => {
    expect(ids(await call('GET', { query: { id: ID } }))).toEqual([ID]);
    expect(ids(await call('GET', { query: { fragrance_id: FRAG } }))).toEqual([ID]);
    expect(ids(await call('GET', { query: { name: 'OUD NIGHTS' } }))).toEqual(['b', ID]);
  });
  it('refuses a malformed id', async () => {
    expect((await call('GET', { query: { id: 'x' } })).statusCode).toBe(400);
    expect((await call('GET', { query: { fragrance_id: 'x' } })).statusCode).toBe(400);
  });
});

describe('errors', () => {
  it('rejects a malformed id on DELETE without touching the database', async () => {
    const res = await call('DELETE', { query: { id: 'not-a-uuid' } });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('invalid_id');
    expect(db.writes).toEqual([]);
  });

  it('never returns database text on a 500', async () => {
    db.fail('batches', 'select', { message: 'relation "secret_table" does not exist' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('GET');
    spy.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('server_error');
    expect(JSON.stringify(res.body)).not.toContain('secret_table');
  });

  it('has an English and an Arabic message for every code the batch endpoints send', async () => {
    const { readFileSync } = await import('node:fs');
    const en = (await import('../../../src/i18n/messages/en.js')).default as any;
    const ar = (await import('../../../src/i18n/messages/ar.js')).default as any;
    const files = ['api/batches.ts', 'api/inventory.ts', 'api/_lib/http.ts', 'api/_lib/share.ts', 'api/_lib/rateLimit.ts', 'api/_lib/entitlements.ts'];
    const codes = new Set<string>();
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/code: '([a-z_]+)'/g)) codes.add(m[1]);
      for (const m of src.matchAll(/fail\(res, \d+, '([a-z_]+)'/g)) codes.add(m[1]);
      for (const m of src.matchAll(/'(slow_read|slow_write)'/g)) codes.add(m[1]);
    }
    expect(codes.size).toBeGreaterThan(10);
    const missing = [...codes].filter((c) => !en.errors[c] || !ar.errors[c]);
    expect(missing).toEqual([]);
  });
});

describe('POST /api/batches validation', () => {
  const bad: Record<string, Record<string, unknown>> = {
    'zero volume': { total_ml: 0, oil_ml: 0, ethanol_ml: 0, oil_g: 0, ethanol_g: 0, total_g: 0 },
    '100 percent': { concentration_pct: 100 },
    'negative grams': { oil_g: -1 },
    'text where a number belongs': { oil_g: 'lots' },
    'huge number': { total_ml: 1e9 },
    'total far from the parts': { total_g: 10 },
    'long note': { notes: 'x'.repeat(2001) },
    'long name': { fragrance_name: 'x'.repeat(121) },
    'bad date': { blend_date: 'yesterday' },
    'negative price': { price_per_gram: -2 },
  };
  for (const [label, patch] of Object.entries(bad)) {
    it(`refuses ${label}`, async () => {
      const res = await call('POST', { body: { ...BATCH, ...patch } });
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('invalid_batch');
    });
  }

  it('accepts the handbook case', async () => {
    const res = await call('POST', { body: BATCH });
    expect(res.statusCode).toBe(201);
  });

  it('accepts totals that differ only by display rounding', async () => {
    const res = await call('POST', { body: { ...BATCH, total_g: 84.5003 } });
    expect(res.statusCode).toBe(201);
  });
});

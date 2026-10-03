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
    const files = ['api/batches.ts', 'api/_lib/http.ts', 'api/_lib/share.ts', 'api/_lib/rateLimit.ts', 'api/_lib/entitlements.ts'];
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

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

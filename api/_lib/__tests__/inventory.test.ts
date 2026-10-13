import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { dbFor, fakeReq, fakeRes, USER, OTHER, type FakeDb } from './harness.js';

// /api/inventory builds its own Supabase clients, so the test replaces
// createClient: the service-role key gets the in-memory database, anything
// else gets an auth stub that resolves the bearer token.
process.env.SUPABASE_URL = 'https://example.supabase.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-SECRET';
process.env.SUPABASE_ANON_KEY = 'anon-key';
delete process.env.VITE_SUPABASE_URL;
delete process.env.VITE_SUPABASE_ANON_KEY;

let db: FakeDb;
let authResult: any;
vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const real: any = await importOriginal();
  return {
    ...real,
    createClient: (_url: string, key: string) =>
      key === 'service-role-key-SECRET' ? db : { auth: { getUser: async () => authResult } },
  };
});
const { default: handler } = await import('../../inventory.js');

async function call(method: string, opts: Parameters<typeof fakeReq>[1] = {}) {
  const res = fakeRes();
  await handler(fakeReq(method, opts), res);
  return res;
}

const OIL = '22222222-2222-4222-8222-222222222222';
const GENERIC = { error: 'Something went wrong. Please try again.', code: 'server_error' };
const signedInAs = (id: string) => ({ data: { user: { id } }, error: null });

let logged: string[];
beforeEach(() => {
  db = dbFor('pro', { inventory: [] });
  authResult = signedInAs(USER);
  logged = [];
  vi.spyOn(console, 'error').mockImplementation((...a: any[]) => { logged.push(a.map(String).join(' ')); });
});
afterEach(() => vi.restoreAllMocks());

// What a database error looks like: details a client must never see.
const DB_ERROR = {
  message: 'relation "public.inventory" does not exist; SELECT * FROM inventory WHERE user_id = $1',
  code: '42P01',
};
const leaks = (body: unknown) => /relation|inventory"|SELECT|42P01|SECRET|stack|at \w+ \(/i.test(JSON.stringify(body));

describe('unexpected failures answer a generic 500 and log the detail', () => {
  const cases: [string, () => Promise<ReturnType<typeof fakeRes>>, string][] = [
    ['GET', async () => { db.fail('inventory', 'select', DB_ERROR); return call('GET'); }, 'list'],
    ['POST', async () => { db.fail('inventory', 'upsert', DB_ERROR); return call('POST', { body: { fragrance_id: OIL, stock_g: 5 } }); }, 'upsert'],
    ['PATCH', async () => {
      db.rpcHandlers.restock_inventory = () => ({ data: null, error: DB_ERROR });
      return call('PATCH', { body: { fragrance_id: OIL, restock_g: 5 } });
    }, 'restock'],
    ['DELETE', async () => { db.fail('inventory', 'delete', DB_ERROR); return call('DELETE', { query: { id: OIL } }); }, 'delete'],
    ['the entitlement read', async () => { db.fail('user_plans', 'select', DB_ERROR); return call('GET'); }, 'entitlements'],
  ];

  for (const [name, run, context] of cases) {
    it(`${name}: fixed body, status 500, detail in the server log only`, async () => {
      const res = await run();
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual(GENERIC);
      expect(leaks(res.body)).toBe(false);
      expect(logged).toHaveLength(1);
      const entry = JSON.parse(logged[0]);
      expect(entry).toMatchObject({ at: 'api/inventory', context, user: USER, code: '42P01' });
      expect(entry.message).toContain('relation');
    });
  }

  it('never logs the token, the service key or the request body', async () => {
    db.fail('inventory', 'upsert', DB_ERROR);
    await call('POST', { body: { fragrance_id: OIL, stock_g: 5, note: 'private-note' }, headers: { authorization: 'Bearer test-token' } });
    const text = logged.join('\n');
    expect(text).not.toContain('test-token');
    expect(text).not.toContain('service-role-key-SECRET');
    expect(text).not.toContain('private-note');
  });

  it('copes with a thrown non-object', async () => {
    db.rpcHandlers.restock_inventory = () => { throw 'plain string failure'; };
    const res = await call('PATCH', { body: { fragrance_id: OIL, restock_g: 1 } });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual(GENERIC);
    expect(JSON.parse(logged[0]).message).toBe('plain string failure');
  });
});

describe('expected answers keep their status and body', () => {
  it('401 without a valid session', async () => {
    authResult = { data: { user: null }, error: { message: 'invalid JWT' } };
    const res = await call('GET');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Unauthorized/);
    expect(logged).toEqual([]);
  });

  it('401 with no Authorization header at all', async () => {
    const res = fakeRes();
    await handler({ method: 'GET', query: {}, headers: {} } as any, res);
    expect(res.statusCode).toBe(401);
  });

  it('503, not 401, when the auth service cannot be reached', async () => {
    authResult = { data: { user: null }, error: new AuthRetryableFetchError('fetch failed', 0) };
    const res = await call('GET');
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/slow to respond/);
  });

  it('403 feature_locked for a Free user', async () => {
    db = dbFor('free', { inventory: [] });
    const res = await call('GET');
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'This feature is part of Pro.', code: 'feature_locked', feature: 'inventory' });
  });

  it('400 for invalid payloads, never 500', async () => {
    for (const body of [
      {}, { fragrance_id: OIL, stock_g: -1 }, { fragrance_id: OIL, stock_g: Infinity },
      { fragrance_id: OIL, stock_g: '5' }, { fragrance_id: OIL, low_stock_threshold_g: 2_000_000 },
    ]) {
      const res = await call('POST', { body });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid payload' });
    }
    expect((await call('POST', { body: undefined })).statusCode).toBe(400);
    for (const body of [{}, { fragrance_id: OIL }, { fragrance_id: OIL, restock_g: '5' }, { fragrance_id: OIL, restock_g: Infinity }, { fragrance_id: OIL, restock_g: 2_000_000 }]) {
      expect((await call('PATCH', { body })).statusCode).toBe(400);
    }
    // an empty body is a client error, not a crash
    expect((await call('PATCH', { body: undefined })).statusCode).toBe(400);
    expect((await call('DELETE')).statusCode).toBe(400);
    expect(logged).toEqual([]);
  });

  it('404 not_tracked when there is no inventory row to restock', async () => {
    db.rpcHandlers.restock_inventory = () => ({ data: null, error: null });
    const res = await call('PATCH', { body: { fragrance_id: OIL, restock_g: 5 } });
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Inventory item not found', code: 'not_tracked' });
  });

  it('405 for an unsupported method', async () => {
    expect((await call('PUT')).statusCode).toBe(405);
  });

  it('answers a database timeout with 503 (retryable), distinct from a 500', async () => {
    const timeout = { message: 'TimeoutError: The operation was aborted due to timeout' };
    db.fail('inventory', 'select', timeout);
    const read = await call('GET');
    expect(read.statusCode).toBe(503);
    expect(read.body).toEqual({ error: 'Database is slow to respond — please try again.' });

    db.fail('inventory', 'upsert', timeout);
    const write = await call('POST', { body: { fragrance_id: OIL, stock_g: 5 } });
    expect(write.statusCode).toBe(503);
    // a timed-out write may still have landed: the message says so
    expect(write.body.error).toMatch(/may still save/);

    db.fail('user_plans', 'select', timeout);
    expect((await call('GET')).statusCode).toBe(503);
    expect(logged).toEqual([]);
  });
});

describe('ownership: a signed-in user only reaches their own rows', () => {
  const mine = { user_id: USER, fragrance_id: OIL, stock_g: 10, low_stock_threshold_g: 5, fragrances: { name: 'Mine', tier: 'woody' } };
  const theirs = { user_id: OTHER, fragrance_id: OIL, stock_g: 99, low_stock_threshold_g: 5, fragrances: { name: 'Theirs', tier: 'woody' } };

  it('GET lists only the caller’s rows', async () => {
    db = dbFor('pro', { inventory: [mine, theirs] });
    const res = await call('GET');
    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([{ id: OIL, fragrance_id: OIL, name: 'Mine', tier: 'woody', stock_g: 10, low_threshold_g: 5 }]);
  });

  it('DELETE removes only the caller’s row, even for the same oil id', async () => {
    db = dbFor('pro', { inventory: [mine, theirs] });
    const res = await call('DELETE', { query: { id: OIL } });
    expect(res.statusCode).toBe(200);
    expect(db.rows('inventory')).toEqual([theirs]);
  });

  it('POST writes for the authenticated user and ignores a client user_id', async () => {
    db = dbFor('pro', { inventory: [theirs] });
    const res = await call('POST', { body: { user_id: OTHER, fragrance_id: OIL, stock_g: 3 } });
    expect(res.statusCode).toBe(200);
    expect(db.rows('inventory').find((r) => r.user_id === OTHER)).toEqual(theirs); // untouched
    expect(db.rows('inventory').find((r) => r.user_id === USER)).toMatchObject({ fragrance_id: OIL, stock_g: 3 });
  });

  it('PATCH restocks as the authenticated user, whatever the body says', async () => {
    db.rpcHandlers.restock_inventory = (args) => ({ data: { fragrance_id: args.p_fragrance_id, stock_g: 15 }, error: null });
    const res = await call('PATCH', { body: { user_id: OTHER, p_user_id: OTHER, fragrance_id: OIL, restock_g: 5 } });
    expect(res.statusCode).toBe(200);
    expect(db.rpcs).toEqual([{ name: 'restock_inventory', args: { p_user_id: USER, p_fragrance_id: OIL, p_delta: 5 } }]);
  });

  it('POST with only a fragrance id never resets existing stock', async () => {
    db = dbFor('pro', { inventory: [mine] });
    await call('POST', { body: { fragrance_id: OIL } });
    expect(db.rows('inventory')[0]).toMatchObject({ stock_g: 10, low_stock_threshold_g: 5 });
  });
});

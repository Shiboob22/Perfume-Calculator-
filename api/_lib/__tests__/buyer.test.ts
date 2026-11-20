import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbFor, fakeReq, fakeRes, USER, type FakeDb } from './harness.js';

let db: FakeDb;
vi.mock('../http.js', async (importOriginal) => {
  const real: any = await importOriginal();
  return { ...real, serviceClient: () => db, requireUser: async () => { throw new Error('the buyer page needs no sign-in'); } };
});
const { default: handler } = await import('../../batches.js');

const CODE = 'abcdef0123456789abcdef0123456789';
const ORDER = { id: 'o1', user_id: USER, buyer_code: CODE, buyer_name: 'Sara', buyer_contact: '0100', scent_text: 'Oud Nights', family: 'woody', size_ml: 50, strength_pct: 25, price: 300, currency: 'EGP', status: 'handed_over', bottled_at: '2026-11-01T10:00:00Z' };

async function call(method: string, body?: any, code = CODE) {
  const res = fakeRes();
  await handler(fakeReq(method, { body, query: { resource: 'buyer', code } }), res);
  return res;
}

beforeEach(() => { db = dbFor('pro', { seller_orders: [{ ...ORDER }], profiles: [{ user_id: USER, shop_name: 'Hisham Blends' }] }); });

describe('/api/batches?resource=buyer (QR page, no sign-in)', () => {
  it('shows the bottle and the shop, not the price or the buyer', async () => {
    const res = await call('GET');
    expect(res.statusCode).toBe(200);
    expect(res.body.order).toMatchObject({ shop: 'Hisham Blends', scent: 'Oud Nights', size_ml: 50, strength_pct: 25, feedback: null });
    expect(JSON.stringify(res.body)).not.toMatch(/Sara|0100|300|o1/);
  });

  it('answers not found for a bad or unknown code, a cancelled order, or a seller off Pro', async () => {
    expect((await call('GET', undefined, 'nope')).statusCode).toBe(404);
    expect((await call('GET', undefined, 'f'.repeat(32))).statusCode).toBe(404);
    db.rows('seller_orders')[0].status = 'cancelled';
    expect((await call('GET')).statusCode).toBe(404);
    db = dbFor('free', { seller_orders: [{ ...ORDER }] });
    expect((await call('GET')).statusCode).toBe(404);
  });

  it('saves feedback for the seller, and an edit replaces it', async () => {
    let res = await call('POST', { feedback: { rating: 5, lasts: 'h4to8', tags: ['sweeter'] } });
    expect(res.statusCode).toBe(200);
    expect(db.rows('order_feedback')).toEqual([expect.objectContaining({ order_id: 'o1', user_id: USER, rating: 5, lasts: 'h4to8', tags: ['sweeter'] })]);
    res = await call('POST', { feedback: { rating: 4, note: 'Softer now' } });
    expect(db.rows('order_feedback')).toHaveLength(1);
    expect(db.rows('order_feedback')[0]).toMatchObject({ rating: 4, note: 'Softer now', lasts: null, tags: [] });
  });

  it('refuses an empty answer and one older than 30 days', async () => {
    expect((await call('POST', { feedback: {} })).body).toMatchObject({ code: 'invalid_feedback' });
    db.rows('seller_orders')[0].order_feedback = { rating: 3, created_at: '2020-01-01T00:00:00Z' };
    expect((await call('POST', { feedback: { rating: 5 } })).body).toMatchObject({ code: 'feedback_closed' });
  });

  it('Order again adds a requested order for the seller, with the new buyer', async () => {
    const res = await call('POST', { reorder: { name: 'Mona', phone: '+20 111 222 3333' } });
    expect(res.statusCode).toBe(201);
    const added = db.rows('seller_orders').find((o) => o.status === 'requested');
    expect(added).toMatchObject({ user_id: USER, buyer_name: 'Mona', buyer_contact: '+20 111 222 3333', scent_text: 'Oud Nights', size_ml: 50, requested_from: 'o1' });
    expect((await call('POST', { reorder: { name: 'Mona' } })).body).toMatchObject({ code: 'invalid_reorder', field: 'phone' });
  });

  it('stops Order again when the seller already has 50 waiting', async () => {
    for (let i = 0; i < 50; i++) db.rows('seller_orders').push({ id: `r${i}`, user_id: USER, status: 'requested' });
    expect((await call('POST', { reorder: { name: 'Mona', phone: '01112223333' } })).body).toMatchObject({ code: 'reorder_full' });
  });

  it('is rate limited per network and per bottle', async () => {
    db.rpcHandlers.hit_rate_limit = (args) => ({ data: !String(args.p_key).startsWith('reorder:'), error: null });
    const res = await call('POST', { reorder: { name: 'Mona', phone: '01112223333' } });
    expect(res.statusCode).toBe(429);
    expect(db.rpcs.map((r) => r.args.p_key)).toEqual([expect.stringMatching(/^buyer:/), `reorder:${CODE}`]);
  });
});

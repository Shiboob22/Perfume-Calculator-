import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbFor, fakeReq, fakeRes, USER, OTHER, type FakeDb } from './harness.js';

let db: FakeDb;
vi.mock('../http.js', async (importOriginal) => {
  const real: any = await importOriginal();
  return { ...real, serviceClient: () => db, requireUser: async () => USER };
});
const { default: handler } = await import('../../batches.js');

async function call(method: string, body?: any) {
  const res = fakeRes();
  await handler(fakeReq(method, { body, query: { resource: 'orders' } }), res);
  return res;
}

const ID = '22222222-2222-4222-8222-222222222222';
const ORDER = { buyer_name: 'Sara', scent_text: 'Oud Nights', size_ml: 50, strength_pct: 25 };

beforeEach(() => { db = dbFor('pro'); });

describe('/api/batches?resource=orders', () => {
  it('is Pro: Free gets the lock', async () => {
    db = dbFor('free');
    for (const m of ['GET', 'POST', 'PATCH']) {
      const res = await call(m, ORDER);
      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({ code: 'feature_locked', feature: 'orders' });
    }
    expect(db.rows('seller_orders')).toHaveLength(0);
  });

  it('adds an order as queued, for the signed-in user only', async () => {
    const res = await call('POST', { ...ORDER, id: ID, user_id: OTHER, status: 'bottled' });
    expect(res.statusCode).toBe(201);
    expect(res.body.order).toMatchObject({ id: ID, user_id: USER, status: 'queued', buyer_name: 'Sara' });
  });

  it('answers a re-sent order without a second row', async () => {
    await call('POST', { ...ORDER, id: ID });
    const res = await call('POST', { ...ORDER, id: ID });
    expect(res.statusCode).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(db.rows('seller_orders')).toHaveLength(1);
  });

  it('refuses a bad order with the field', async () => {
    const res = await call('POST', { ...ORDER, size_ml: 0 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: 'invalid_order', field: 'size_ml' });
  });

  it('lists only the user’s orders', async () => {
    db = dbFor('pro', { seller_orders: [{ id: ID, user_id: USER, ...ORDER }, { id: 'x', user_id: OTHER, ...ORDER }] });
    const res = await call('GET');
    expect(res.statusCode).toBe(200);
    expect(res.body.orders.map((o: any) => o.id)).toEqual([ID]);
  });

  it('edits, cancels and brings back an order', async () => {
    db = dbFor('pro', { seller_orders: [{ id: ID, user_id: USER, status: 'queued', ...ORDER }] });
    expect((await call('PATCH', { id: ID, edit: { size_ml: 100 } })).body.order.size_ml).toBe(100);
    const cancelled = await call('PATCH', { id: ID, status: 'cancelled' });
    expect(cancelled.body.order).toMatchObject({ status: 'cancelled' });
    expect(cancelled.body.order.cancelled_at).toBeTruthy();
    expect((await call('PATCH', { id: ID, status: 'queued' })).body.order).toMatchObject({ status: 'queued', cancelled_at: null });
    expect((await call('PATCH', { id: ID, status: 'bottled' })).statusCode).toBe(400);
    expect((await call('PATCH', { id: ID, edit: {} })).statusCode).toBe(400);
  });

  it('never touches another user’s order', async () => {
    db = dbFor('pro', { seller_orders: [{ id: ID, user_id: OTHER, status: 'queued', ...ORDER }] });
    expect((await call('PATCH', { id: ID, status: 'cancelled' })).statusCode).toBe(404);
    const group = await call('PATCH', { ids: [ID], group_mode: 'separate' });
    expect(group.body.orders).toEqual([]);
    expect(db.rows('seller_orders')[0].status).toBe('queued');
  });

  it('sets one group’s grouping', async () => {
    const B = '33333333-3333-4333-8333-333333333333';
    db = dbFor('pro', { seller_orders: [{ id: ID, user_id: USER, ...ORDER }, { id: B, user_id: USER, ...ORDER }] });
    const res = await call('PATCH', { ids: [ID, B], group_mode: 'separate' });
    expect(res.body.orders.map((o: any) => o.group_mode)).toEqual(['separate', 'separate']);
    expect((await call('PATCH', { ids: [ID], group_mode: 'x' })).statusCode).toBe(400);
    expect((await call('PATCH', { ids: 'x', group_mode: 'mix' })).statusCode).toBe(400);
    expect((await call('PATCH', { id: 'nope', status: 'queued' })).statusCode).toBe(400);
  });

  it('stops at the order cap', async () => {
    db = dbFor('pro', { seller_orders: Array.from({ length: 1000 }, (_, i) => ({ id: `o${i}`, user_id: USER, ...ORDER })) });
    const res = await call('POST', ORDER);
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('order_cap');
  });

  it('refuses other methods and answers 5xx on a failed read', async () => {
    expect((await call('DELETE')).statusCode).toBe(405);
    db.fail('seller_orders', 'select', { message: 'boom' });
    expect((await call('GET')).statusCode).toBe(500);
  });
});

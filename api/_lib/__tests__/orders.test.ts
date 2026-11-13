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
    expect((await call('PATCH', { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', status: 'queued' })).statusCode).toBe(404);
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

  it('bottles and hands over a resting order, one step at a time', async () => {
    db = dbFor('pro', { seller_orders: [{ id: ID, user_id: USER, status: 'resting', batch_id: 'b1', ...ORDER }] });
    expect((await call('PATCH', { id: ID, status: 'handed_over' })).statusCode).toBe(400);
    expect((await call('PATCH', { id: ID, status: 'bottled' })).body.order).toMatchObject({ status: 'bottled' });
    expect((await call('PATCH', { id: ID, status: 'handed_over' })).body.order.handed_at).toBeTruthy();
    expect((await call('PATCH', { id: ID, status: 'bottled' })).body.order).toMatchObject({ status: 'bottled', handed_at: null });
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
    db.fail('seller_orders', 'select', { message: 'boom' });
    expect((await call('PATCH', { id: ID, status: 'cancelled' })).statusCode).toBe(500);
  });
});

describe('POST /api/batches with order_ids (Phase B)', () => {
  const BATCH = {
    fragrance_name: 'Oud Nights', tier: 'woody', blend_date: '2026-11-13', concentration_pct: 25,
    oil_g: 24.94, oil_ml: 26.25, ethanol_g: 63.79, ethanol_ml: 78.75, total_g: 88.73, total_ml: 105, basis: 'volume',
  };
  const A = '44444444-4444-4444-8444-444444444444';
  const B = '55555555-5555-4555-8555-555555555555';
  const C = '66666666-6666-4666-8666-666666666666';
  const D = '77777777-7777-4777-8777-777777777777';
  const BID = '88888888-8888-4888-8888-888888888888';
  async function log(body: any) {
    const res = fakeRes();
    await handler(fakeReq('POST', { body }), res);
    return res;
  }
  const seed = () => dbFor('pro', { seller_orders: [
    { id: A, user_id: USER, status: 'queued', ...ORDER },
    { id: B, user_id: USER, status: 'planned', ...ORDER },
    { id: C, user_id: USER, status: 'cancelled', ...ORDER },
    { id: D, user_id: OTHER, status: 'queued', ...ORDER },
  ] });

  it('links the caller’s open orders to the new batch and starts their rest', async () => {
    db = seed();
    const res = await log({ ...BATCH, id: BID, order_ids: [A, B, C, D] });
    expect(res.statusCode).toBe(201);
    expect(res.body.orders_linked).toBe(2);
    const by = Object.fromEntries(db.rows('seller_orders').map((o: any) => [o.id, o]));
    expect([by[A].status, by[A].batch_id, by[B].status]).toEqual(['resting', BID, 'resting']);
    expect([by[C].status, by[D].status, by[D].batch_id]).toEqual(['cancelled', 'queued', undefined]);
  });

  it('a re-sent log links nothing twice', async () => {
    db = seed();
    await log({ ...BATCH, id: BID, order_ids: [A] });
    const again = await log({ ...BATCH, id: BID, order_ids: [A] });
    expect(again.body).toMatchObject({ duplicate: true, orders_linked: 0 });
  });

  it('a log without order ids answers as before; malformed ids link none', async () => {
    db = seed();
    expect((await log(BATCH)).body).not.toHaveProperty('orders_linked');
    expect((await log({ ...BATCH, order_ids: 'x' })).body.orders_linked).toBe(0);
  });

  it('Free logs the batch and links nothing', async () => {
    db = dbFor('free', { seller_orders: [{ id: A, user_id: USER, status: 'queued', ...ORDER }] });
    const res = await log({ ...BATCH, order_ids: [A] });
    expect(res.statusCode).toBe(201);
    expect(res.body.orders_linked).toBe(0);
    expect(db.rows('seller_orders')[0].status).toBe('queued');
  });

  it('a failed link never fails the log', async () => {
    db = seed();
    db.fail('seller_orders', 'update', { message: 'boom' });
    const res = await log({ ...BATCH, order_ids: [A] });
    expect(res.statusCode).toBe(201);
    expect(res.body.orders_linked).toBe(0);
  });
});

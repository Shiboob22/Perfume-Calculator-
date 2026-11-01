import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeDb, fakeReq, fakeRes } from './harness.js';

// The handler gets the fake database for both the service and the anon client.
let db: FakeDb & { storage?: any };
const uploads: { path: string; type: string; size: number }[] = [];
let uploadError: any = null;
vi.mock('../http.js', async (importOriginal) => {
  const real: any = await importOriginal();
  return { ...real, serviceClient: () => db, anonClient: () => db };
});
const sent: any[] = [];
vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
  sent.push({ url, body: JSON.parse(init.body) });
  return { ok: true, text: async () => '' };
}));
const { default: handler } = await import('../../shop.js');

const PRODUCTS = [
  { id: 'p1', slug: 'decant', name_en: 'Decant', name_ar: 'عينة', description_en: '', description_ar: '', image_url: null, price_egp: 150, active: true, sort: 1,
    variants: [{ id: '5ml', label_en: '5 mL', label_ar: '٥ مل', price_egp: 150 }, { id: '10ml', label_en: '10 mL', label_ar: '١٠ مل', price_egp: 260 }] },
  { id: 'p2', slug: 'kit', name_en: 'Kit', name_ar: 'طقم', description_en: '', description_ar: '', image_url: null, price_egp: 650, active: true, sort: 2, variants: [] },
  { id: 'p3', slug: 'gone', name_en: 'Gone', name_ar: 'ذهب', description_en: '', description_ar: '', image_url: null, price_egp: 1, active: false, sort: 3, variants: [] },
];
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 0]).toString('base64');
const CUSTOMER = { name: 'Mona Adel', phone: '+20 100 123 4567', email: 'mona@example.com', city: 'Cairo', address: '12 Nile St, Maadi' };
const order = (extra: Record<string, any> = {}) => ({
  items: [{ productId: 'p1', variantId: '10ml', qty: 2 }, { productId: 'p2', variantId: null, qty: 1 }],
  customer: CUSTOMER, lang: 'en', proof: jpeg, ...extra,
});

async function call(method: string, body?: any) {
  const res = fakeRes();
  await handler(fakeReq(method, { body, headers: { 'x-forwarded-for': '203.0.113.9' } }), res);
  return res;
}

beforeEach(() => {
  db = new FakeDb({ shop_products: PRODUCTS }) as any;
  uploads.length = 0; sent.length = 0; uploadError = null;
  db.storage = { from: () => ({
    upload: async (path: string, bytes: Buffer, o: any) => { if (uploadError) return { error: uploadError }; uploads.push({ path, type: o.contentType, size: bytes.length }); return { error: null }; },
    remove: async (paths: string[]) => { for (const p of paths) { const i = uploads.findIndex((u) => u.path === p); if (i >= 0) uploads.splice(i, 1); } return { error: null }; },
  }) };
  process.env.RESEND_API_KEY = 'test-key';
  delete process.env.SHOP_ENABLED;
});

describe('GET /api/shop', () => {
  it('lists active products only, cached at the CDN', async () => {
    const res = await call('GET');
    expect(res.statusCode).toBe(200);
    expect(res.body.products.map((p: any) => p.slug)).toEqual(['decant', 'kit']);
    expect(res.headers['cache-control']).toMatch(/s-maxage=60/);
  });
  it('is closed by SHOP_ENABLED=0', async () => {
    process.env.SHOP_ENABLED = '0';
    expect((await call('GET')).body.code).toBe('shop_closed');
  });
});

describe('POST /api/shop', () => {
  it('prices the cart from the database, stores order, items and screenshot, and emails the owner', async () => {
    const res = await call('POST', order());
    expect(res.statusCode).toBe(201);
    expect(res.body.total).toBe(1170);
    expect(res.body.orderNo).toMatch(/^K-[A-Z0-9]{6}$/);
    const [o] = db.rows('shop_orders');
    expect(o).toMatchObject({ order_no: res.body.orderNo, total_egp: 1170, email: 'mona@example.com', emailed: true });
    expect(db.rows('shop_order_items').map((i) => [i.name, i.variant_label, i.unit_price, i.qty])).toEqual([['Decant', '10 mL', 260, 2], ['Kit', null, 650, 1]]);
    expect(uploads).toEqual([{ path: `${res.body.orderNo}.jpg`, type: 'image/jpeg', size: Buffer.from(jpeg, 'base64').length }]);
    expect(sent[0].url).toBe('https://api.resend.com/emails');
    expect(sent[0].body.attachments).toHaveLength(1);
    expect(sent[0].body.to).toEqual(['Hishamshiboob2@gmail.com']);
  });

  it('ignores any price or total the browser sends', async () => {
    const res = await call('POST', order({ total: 1, items: [{ productId: 'p2', variantId: null, qty: 1, unit: 1, price: 1 }] }));
    expect(res.body.total).toBe(650);
  });

  it('keeps the order when the email cannot be sent', async () => {
    delete process.env.RESEND_API_KEY;
    const res = await call('POST', order());
    expect(res.statusCode).toBe(201);
    expect(db.rows('shop_orders')[0].emailed).not.toBe(true);
  });

  it.each([
    ['an empty cart', { items: [] }, 'cart_empty'],
    ['an inactive product', { items: [{ productId: 'p3', variantId: null, qty: 1 }] }, 'cart_unknown_product'],
    ['a wrong variant', { items: [{ productId: 'p1', variantId: '99ml', qty: 1 }] }, 'cart_unknown_variant'],
    ['a bad quantity', { items: [{ productId: 'p2', variantId: null, qty: 0 }] }, 'cart_bad_qty'],
    ['bad details', { customer: { ...CUSTOMER, phone: 'x' } }, 'bad_phone'],
    ['no screenshot', { proof: undefined }, 'no_proof'],
    ['a screenshot that is not an image', { proof: Buffer.from('hello world, not an image').toString('base64') }, 'bad_proof'],
  ])('refuses %s and stores nothing', async (_, patch, code) => {
    const res = await call('POST', order(patch));
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(code);
    expect(db.rows('shop_orders')).toHaveLength(0);
    expect(uploads).toHaveLength(0);
  });

  it('answers a bot (honeypot filled) as if it worked, storing nothing', async () => {
    const res = await call('POST', order({ website: 'http://spam.example' }));
    expect(res.statusCode).toBe(201);
    expect(db.rows('shop_orders')).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('answers 429 over the per-IP limit', async () => {
    db.rpcHandlers.hit_rate_limit = () => ({ data: false, error: null });
    const res = await call('POST', order());
    expect(res.statusCode).toBe(429);
    expect(db.rows('shop_orders')).toHaveLength(0);
  });

  it('keeps no half order when the screenshot cannot be stored', async () => {
    uploadError = { message: 'bucket down' };
    const res = await call('POST', order());
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('shop_write');
    expect(db.rows('shop_orders')).toHaveLength(0);
  });

  it('removes the order and the screenshot when the items cannot be saved', async () => {
    db.fail('shop_order_items', 'insert', { message: 'boom' });
    const res = await call('POST', order());
    expect(res.statusCode).toBe(500);
    expect(db.rows('shop_orders')).toHaveLength(0);
    expect(uploads).toHaveLength(0);
  });

  it('is closed by SHOP_ENABLED=0', async () => {
    process.env.SHOP_ENABLED = '0';
    expect((await call('POST', order())).statusCode).toBe(503);
  });

  it('refuses other methods', async () => {
    expect((await call('DELETE')).statusCode).toBe(405);
  });
});

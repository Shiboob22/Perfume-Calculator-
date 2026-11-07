import type { VercelRequest, VercelResponse } from '@vercel/node';
import { anonClient, serviceClient, setCors, isTimeout, SLOW_READ, SLOW_WRITE } from './_lib/http.js';
import { clientIp, overLimit } from './_lib/rateLimit.js';
import { decodeProof, newOrderNo, orderEmail, sendOrderEmail, validateCustomer } from './_lib/shop.js';
import { priceCart, toProduct, type CartItem } from '../src/lib/shop/pricing.js';

// The Shop, open to anyone (no account):
//   GET  /api/shop  the active products (CDN-cached for a minute).
//   POST /api/shop  place an order: { items, customer, lang, proof }.
// An order is priced here from shop_products, never from the browser's
// numbers; the InstaPay screenshot is checked by its bytes, stored in the
// private shop-proofs bucket and attached to an email to the owner.
// SHOP_ENABLED=0 closes it.

const BUCKET = 'shop-proofs';

async function activeProducts() {
  const { data, error } = await anonClient()
    .from('shop_products')
    .select('id, slug, name_en, name_ar, description_en, description_ar, image_url, price_egp, variants')
    .eq('active', true)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toProduct);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res, 'GET, POST');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (process.env.SHOP_ENABLED === '0') return res.status(503).json({ error: 'The shop is closed.', code: 'shop_closed' });

  if (req.method === 'GET') {
    try {
      const products = await activeProducts();
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({ products });
    } catch (err) {
      return res.status(isTimeout(err) ? 503 : 500).json({ error: isTimeout(err) ? SLOW_READ : 'Could not load the shop.', code: 'shop_read' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Bad request', code: 'bad_request' });
  // A field real buyers never see: bots fill it. Answer as if it worked.
  if (typeof body.website === 'string' && body.website.trim() !== '') return res.status(201).json({ orderNo: newOrderNo(), total: 0 });

  const admin = serviceClient();
  if (await overLimit(admin, res, 'shop', clientIp(req))) return;

  const who = validateCustomer(body);
  if ('code' in who) return res.status(400).json({ error: 'Check your details.', code: who.code });
  const proof = decodeProof(body.proof);
  if ('code' in proof) return res.status(proof.code === 'proof_too_big' ? 413 : 400).json({ error: 'Check the screenshot.', code: proof.code });

  let priced;
  try {
    const items: CartItem[] = Array.isArray(body.items)
      ? body.items.map((i: any) => ({ productId: String(i?.productId ?? ''), variantId: i?.variantId == null ? null : String(i.variantId), qty: i?.qty }))
      : [];
    priced = priceCart(items, await activeProducts());
  } catch (err) {
    return res.status(isTimeout(err) ? 503 : 500).json({ error: isTimeout(err) ? SLOW_READ : 'Could not check the cart.', code: 'shop_read' });
  }
  if ('code' in priced) return res.status(400).json({ error: 'Your cart changed. Please check it.', code: `cart_${priced.code}` });

  const orderNo = newOrderNo();
  const path = `${orderNo}.${proof.type.ext}`;
  try {
    const up = await admin.storage.from(BUCKET).upload(path, proof.bytes, { contentType: proof.type.mime, upsert: false });
    if (up.error) throw up.error;

    const { data: order, error: orderErr } = await admin.from('shop_orders').insert({
      order_no: orderNo, ...who.customer, lang: who.lang, total_egp: priced.total, proof_path: path,
    }).select('id').single();
    if (orderErr || !order) { await admin.storage.from(BUCKET).remove([path]); throw orderErr ?? new Error('no order row'); }

    const { error: itemsErr } = await admin.from('shop_order_items').insert(priced.lines.map((l) => ({
      order_id: order.id, product_id: l.productId, name: l.name.en, variant_label: l.variantLabel?.en ?? null, unit_price: l.unit, qty: l.qty,
    })));
    if (itemsErr) {
      await admin.from('shop_orders').delete().eq('id', order.id);
      await admin.storage.from(BUCKET).remove([path]);
      throw itemsErr;
    }

    const emailed = await sendOrderEmail(
      orderEmail({ orderNo, customer: who.customer, lines: priced.lines, total: priced.total, lang: who.lang }),
      { bytes: proof.bytes, type: proof.type, orderNo },
      who.customer.email,
    );
    if (emailed) await admin.from('shop_orders').update({ emailed: true }).eq('id', order.id);
    return res.status(201).json({ orderNo, total: priced.total });
  } catch (err) {
    console.error(JSON.stringify({ type: 'shop_order', error: String((err as any)?.message ?? err).slice(0, 300) }));
    return res.status(isTimeout(err) ? 503 : 500).json({ error: isTimeout(err) ? SLOW_WRITE : 'Could not place the order. Nothing was charged.', code: 'shop_write' });
  }
}

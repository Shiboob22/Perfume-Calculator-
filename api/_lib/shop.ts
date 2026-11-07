import { randomBytes } from 'node:crypto';
import type { PricedLine } from '../../src/lib/shop/pricing.js';
import { cleanCustomer, type Customer, type CustomerError } from '../../src/lib/shop/customer.js';

// The Shop's order rules for api/shop.ts: what a buyer may send, how the
// transfer screenshot is checked, and the email the owner receives. Pure
// apart from sendOrderEmail, so they are unit-tested without a database.

export const MAX_PROOF_BYTES = 2_500_000;

export type OrderError = CustomerError | 'bad_lang' | 'no_proof' | 'bad_proof' | 'proof_too_big';

/** The buyer's details, trimmed and checked; the first problem found otherwise. */
export function validateCustomer(input: any): { ok: true; customer: Customer; lang: 'en' | 'ar' } | { ok: false; code: OrderError } {
  const c = cleanCustomer(input?.customer ?? {});
  if ('code' in c) return { ok: false, code: c.code };
  const lang = input?.lang === 'ar' ? 'ar' : input?.lang === 'en' || input?.lang == null ? 'en' : null;
  if (!lang) return { ok: false, code: 'bad_lang' };
  return { ok: true, customer: c.customer, lang };
}

export type ImageType = { mime: 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'jpg' | 'png' | 'webp' };

/** The image type from the file's first bytes (the claimed type is never trusted). */
const ascii = (b: ArrayLike<number>, from: number, to: number) => Array.from({ length: to - from }, (_, i) => String.fromCharCode(b[from + i])).join('');

export function sniffImage(b: ArrayLike<number>): ImageType | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { mime: 'image/png', ext: 'png' };
  if (b.length > 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

/** Decodes the screenshot sent as base64 (a data: URL prefix is allowed) and checks size and type. */
export function decodeProof(input: unknown): { ok: true; bytes: Buffer; type: ImageType } | { ok: false; code: OrderError } {
  if (typeof input !== 'string' || input.length === 0) return { ok: false, code: 'no_proof' };
  const b64 = input.replace(/^data:[^;,]*;base64,/, '');
  // Reject before decoding what would be too big after it.
  if (b64.length > Math.ceil((MAX_PROOF_BYTES * 4) / 3) + 8) return { ok: false, code: 'proof_too_big' };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return { ok: false, code: 'bad_proof' };
  const bytes = Buffer.from(b64, 'base64');
  if (bytes.length > MAX_PROOF_BYTES) return { ok: false, code: 'proof_too_big' };
  const type = sniffImage(bytes);
  return type ? { ok: true, bytes, type } : { ok: false, code: 'bad_proof' };
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I: read aloud or typed from a screenshot

/** An order number the buyer can quote: K- and six characters. */
export function newOrderNo(bytes: ArrayLike<number> = randomBytes(6)): string {
  return 'K-' + Array.from({ length: 6 }, (_, i) => ALPHABET[bytes[i] % ALPHABET.length]).join('');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const egp = (n: number) => `${n.toFixed(2)} EGP`;

/** The owner's notification: subject, HTML and plain text. Buyer text is escaped. */
export function orderEmail(order: { orderNo: string; customer: Customer; lines: PricedLine[]; total: number; lang: 'en' | 'ar' }) {
  const { orderNo, customer: c, lines, total, lang } = order;
  const rows = lines.map((l) => ({ name: l.name.en + (l.variantLabel ? ` (${l.variantLabel.en})` : ''), qty: l.qty, unit: l.unit, sub: l.subtotal }));
  const text = [
    `New order ${orderNo}: ${egp(total)}`,
    '',
    ...rows.map((r) => `${r.qty} x ${r.name} @ ${egp(r.unit)} = ${egp(r.sub)}`),
    `Total: ${egp(total)} (delivery free)`,
    '',
    `Name: ${c.name}`, `Phone: ${c.phone}`, `Email: ${c.email}`, `City: ${c.city}`, `Address: ${c.address}`,
    ...(c.note ? [`Note: ${c.note}`] : []),
    `Language: ${lang}`,
    '',
    'The InstaPay screenshot is attached. Check it against your InstaPay history before shipping,',
    'then set the order status in the shop_orders table (pending -> paid -> shipped).',
  ].join('\n');
  const html = `<p><strong>New order ${esc(orderNo)}</strong>: ${esc(egp(total))}</p>
<table cellpadding="6" style="border-collapse:collapse">${rows.map((r) => `<tr><td>${r.qty} &times;</td><td>${esc(r.name)}</td><td>${esc(egp(r.sub))}</td></tr>`).join('')}
<tr><td></td><td><strong>Total (delivery free)</strong></td><td><strong>${esc(egp(total))}</strong></td></tr></table>
<p>${esc(c.name)}<br>${esc(c.phone)}<br>${esc(c.email)}<br>${esc(c.city)}<br>${esc(c.address).replace(/\n/g, '<br>')}</p>
${c.note ? `<p>Note: ${esc(c.note)}</p>` : ''}
<p>The InstaPay screenshot is attached. Check it against your InstaPay history before shipping, then set the order's status in the <code>shop_orders</code> table (pending, paid, shipped).</p>`;
  return { subject: `New order ${orderNo}: ${egp(total)}`, text, html };
}

/**
 * Sends the owner's email through Resend. Returns false (and logs) when the
 * key is missing or the send fails: the order is already saved by then.
 */
export async function sendOrderEmail(
  mail: { subject: string; text: string; html: string },
  proof: { bytes: Buffer; type: ImageType; orderNo: string },
  replyTo: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error(JSON.stringify({ type: 'shop_email', error: 'RESEND_API_KEY not set' })); return false; }
  const to = process.env.SHOP_ORDER_EMAIL || 'Hishamshiboob2@gmail.com';
  const from = process.env.SHOP_FROM_EMAIL || 'Kyphira Shop <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], reply_to: replyTo, subject: mail.subject, text: mail.text, html: mail.html,
        attachments: [{ filename: `${proof.orderNo}-instapay.${proof.type.ext}`, content: proof.bytes.toString('base64') }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) { console.error(JSON.stringify({ type: 'shop_email', status: res.status, body: (await res.text()).slice(0, 300) })); return false; }
    return true;
  } catch (err: any) {
    console.error(JSON.stringify({ type: 'shop_email', error: String(err?.message ?? err).slice(0, 300) }));
    return false;
  }
}

import { describe, it, expect } from 'vitest';
import { validateCustomer, sniffImage, decodeProof, newOrderNo, orderEmail, MAX_PROOF_BYTES } from './shop.js';

const good = { name: 'Mona Adel', phone: '+20 100 123 4567', email: 'mona@example.com', city: 'Cairo', address: '12 Nile St, Maadi', note: '' };

describe('validateCustomer', () => {
  it('accepts a complete buyer and trims the text', () => {
    const r = validateCustomer({ customer: { ...good, name: '  Mona Adel  ', note: ' ring twice ' }, lang: 'ar' });
    expect(r).toMatchObject({ ok: true, lang: 'ar', customer: { name: 'Mona Adel', note: 'ring twice' } });
  });
  it('defaults the language to English and refuses an unknown one', () => {
    expect(validateCustomer({ customer: good })).toMatchObject({ ok: true, lang: 'en' });
    expect(validateCustomer({ customer: good, lang: 'fr' })).toEqual({ ok: false, code: 'bad_lang' });
  });
  it.each([
    ['name', { name: 'A' }, 'bad_name'],
    ['phone', { phone: 'call me' }, 'bad_phone'],
    ['phone length', { phone: '123' }, 'bad_phone'],
    ['email', { email: 'mona@' }, 'bad_email'],
    ['city', { city: '' }, 'bad_city'],
    ['address', { address: 'x' }, 'bad_address'],
    ['note', { note: 'x'.repeat(501) }, 'bad_note'],
  ])('refuses a bad %s', (_, patch, code) => {
    expect(validateCustomer({ customer: { ...good, ...patch } })).toEqual({ ok: false, code });
  });
  it('refuses a missing customer', () => {
    expect(validateCustomer({})).toEqual({ ok: false, code: 'bad_name' });
  });
});

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72]);
const webp = Uint8Array.from([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP'), 1, 2]);

describe('sniffImage / decodeProof', () => {
  it('reads the type from the bytes', () => {
    expect(sniffImage(jpeg)?.ext).toBe('jpg');
    expect(sniffImage(png)?.ext).toBe('png');
    expect(sniffImage(webp)?.ext).toBe('webp');
    expect(sniffImage(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0, 0]))).toBeNull(); // GIF
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });
  it('decodes base64, with or without a data: prefix', () => {
    const b64 = Buffer.from(jpeg).toString('base64');
    expect(decodeProof(b64)).toMatchObject({ ok: true, type: { mime: 'image/jpeg' } });
    expect(decodeProof(`data:image/jpeg;base64,${b64}`)).toMatchObject({ ok: true });
  });
  it('refuses a missing file, text, a script and a file that claims to be an image', () => {
    expect(decodeProof(undefined)).toEqual({ ok: false, code: 'no_proof' });
    expect(decodeProof('')).toEqual({ ok: false, code: 'no_proof' });
    expect(decodeProof('not base64 !!')).toEqual({ ok: false, code: 'bad_proof' });
    expect(decodeProof(Buffer.from('<script>alert(1)</script>').toString('base64'))).toEqual({ ok: false, code: 'bad_proof' });
  });
  it('refuses a file over the size cap, before decoding it', () => {
    const big = Buffer.concat([Buffer.from(jpeg), Buffer.alloc(MAX_PROOF_BYTES + 1)]).toString('base64');
    expect(decodeProof(big)).toEqual({ ok: false, code: 'proof_too_big' });
  });
});

describe('newOrderNo', () => {
  it('is K- plus six characters without look-alikes', () => {
    for (let i = 0; i < 50; i++) expect(newOrderNo()).toMatch(/^K-[A-HJ-NP-Z2-9]{6}$/);
  });
  it('is deterministic for given bytes', () => {
    expect(newOrderNo(Uint8Array.from([0, 1, 2, 3, 4, 5]))).toBe('K-ABCDEF');
  });
});

describe('orderEmail', () => {
  const lines = [{ productId: 'p1', variantId: '5ml', name: { en: 'Decant', ar: 'عينة' }, variantLabel: { en: '5 mL', ar: '٥ مل' }, unit: 150, qty: 2, subtotal: 300 }];
  it('lists the order and escapes what the buyer typed', () => {
    const mail = orderEmail({ orderNo: 'K-ABC234', customer: { ...good, name: '<b>Mona</b>', note: '"hi" <script>' }, lines, total: 300, lang: 'en' });
    expect(mail.subject).toBe('New order K-ABC234: 300.00 EGP');
    expect(mail.text).toContain('2 x Decant (5 mL) @ 150.00 EGP = 300.00 EGP');
    expect(mail.html).toContain('&lt;b&gt;Mona&lt;/b&gt;');
    expect(mail.html).not.toContain('<script>');
  });
});

import { describe, it, expect } from 'vitest';
import { priceCart, unitPrice, fromPrice, toProduct, MAX_QTY, MAX_LINES, type ShopProduct } from './pricing';

const loc = (s: string) => ({ en: s, ar: s });
const decant: ShopProduct = {
  id: 'p1', slug: 'decant', name: loc('Decant'), description: loc(''), image: null, price: 150,
  variants: [{ id: '5ml', label: loc('5 mL'), price: 150 }, { id: '10ml', label: loc('10 mL'), price: 260.5 }],
};
const kit: ShopProduct = { id: 'p2', slug: 'kit', name: loc('Kit'), description: loc(''), image: null, price: 650, variants: [] };

describe('unitPrice', () => {
  it('uses the variant price, or the product price when there are no variants', () => {
    expect(unitPrice(decant, '10ml')).toBe(260.5);
    expect(unitPrice(kit, null)).toBe(650);
  });
  it('refuses a variant the product does not have, and a missing one when it needs one', () => {
    expect(unitPrice(decant, '99ml')).toBeNull();
    expect(unitPrice(decant, null)).toBeNull();
    expect(unitPrice(kit, '5ml')).toBeNull();
  });
});

describe('priceCart', () => {
  it('totals lines exactly, without float drift', () => {
    const r = priceCart([{ productId: 'p1', variantId: '10ml', qty: 3 }, { productId: 'p2', variantId: null, qty: 1 }], [decant, kit]);
    expect(r).toMatchObject({ ok: true, total: 1431.5 });
    if (r.ok) expect(r.lines.map((l) => l.subtotal)).toEqual([781.5, 650]);
  });
  it('fails an empty cart, too many lines, a bad quantity, an unknown product or variant', () => {
    expect(priceCart([], [kit])).toEqual({ ok: false, code: 'empty' });
    expect(priceCart(Array.from({ length: MAX_LINES + 1 }, () => ({ productId: 'p2', variantId: null, qty: 1 })), [kit])).toEqual({ ok: false, code: 'too_many' });
    for (const qty of [0, -1, 1.5, MAX_QTY + 1, NaN]) {
      expect(priceCart([{ productId: 'p2', variantId: null, qty }], [kit])).toEqual({ ok: false, code: 'bad_qty' });
    }
    expect(priceCart([{ productId: 'nope', variantId: null, qty: 1 }], [kit])).toEqual({ ok: false, code: 'unknown_product' });
    expect(priceCart([{ productId: 'p1', variantId: 'x', qty: 1 }], [decant])).toEqual({ ok: false, code: 'unknown_variant' });
  });
  it('ignores any price the caller sends along', () => {
    const r = priceCart([{ productId: 'p2', variantId: null, qty: 2, unit: 1 } as any], [kit]);
    expect(r).toMatchObject({ ok: true, total: 1300 });
  });
});

describe('fromPrice and toProduct', () => {
  it('shows the cheapest option', () => {
    expect(fromPrice(decant)).toBe(150);
    expect(fromPrice(kit)).toBe(650);
  });
  it('maps a database row, dropping malformed variants', () => {
    const p = toProduct({
      id: 'p1', slug: 'decant', name_en: 'Decant', name_ar: 'عينة', description_en: 'd', description_ar: 'و', image_url: null, price_egp: '150.00',
      variants: [{ id: '5ml', label_en: '5 mL', label_ar: '٥ مل', price_egp: 150 }, { label_en: 'no id' }, null],
    });
    expect(p.price).toBe(150);
    expect(p.variants).toEqual([{ id: '5ml', label: { en: '5 mL', ar: '٥ مل' }, price: 150 }]);
    expect(p.name.ar).toBe('عينة');
  });
});

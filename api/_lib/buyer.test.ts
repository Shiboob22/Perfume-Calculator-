import { describe, it, expect } from 'vitest';
import { feedbackRow, reorderRow, requestedOrder, feedbackOpen, publicOrder, BUYER_CODE } from './buyer.js';

describe('QR buyer page rules', () => {
  it('takes any of rating, line, lasts and known tags; needs one', () => {
    expect(feedbackRow({ rating: 4, note: '  lovely   on skin ', lasts: 'day', tags: ['sweeter', 'harsh', 'sweeter'] }))
      .toEqual({ row: { rating: 4, note: 'lovely on skin', lasts: 'day', tags: ['harsh', 'sweeter'] } });
    expect(feedbackRow({ tags: ['ready'] })).toEqual({ row: { rating: null, note: null, lasts: null, tags: ['ready'] } });
    expect(feedbackRow({})).toMatchObject({ field: 'feedback' });
    expect(feedbackRow({ rating: 6 })).toMatchObject({ field: 'rating' });
    expect(feedbackRow({ rating: 2.5 })).toMatchObject({ field: 'rating' });
    expect(feedbackRow({ lasts: 'week' })).toMatchObject({ field: 'lasts' });
    expect(feedbackRow({ tags: ['<script>'] })).toMatchObject({ field: 'tags' });
    expect((feedbackRow({ note: 'x'.repeat(400) }) as any).row.note).toHaveLength(280);
  });
  it('needs a name and a real-looking phone for Order again', () => {
    expect(reorderRow({ name: ' Sara ', phone: '+20 100 123 4567' })).toEqual({ row: { buyer_name: 'Sara', buyer_contact: '+20 100 123 4567' } });
    expect(reorderRow({ phone: '01001234567' })).toMatchObject({ field: 'name' });
    expect(reorderRow({ name: 'Sara', phone: '12' })).toMatchObject({ field: 'phone' });
    expect(reorderRow({ name: 'Sara', phone: 'call me' })).toMatchObject({ field: 'phone' });
  });
  it('a request copies the bottle, never the old buyer, and waits for the seller', () => {
    const from = { id: 'o1', user_id: 'u', buyer_name: 'Old', buyer_contact: 'old', scent_text: 'Oud', family: 'woody', size_ml: 50, strength_pct: 25, price: 300, list_price: 400, currency: 'EGP', note: 'secret', status: 'handed_over' };
    const row = requestedOrder(from, { buyer_name: 'Sara', buyer_contact: '0100' });
    expect(row).toMatchObject({ user_id: 'u', buyer_name: 'Sara', buyer_contact: '0100', scent_text: 'Oud', size_ml: 50, strength_pct: 25, price: 300, list_price: 400, status: 'requested', requested_from: 'o1', note: null });
  });
  it('an answer can be changed for 30 days', () => {
    const now = new Date('2026-12-31T00:00:00Z');
    expect(feedbackOpen(null, now)).toBe(true);
    expect(feedbackOpen('2026-12-02T00:00:00Z', now)).toBe(true);
    expect(feedbackOpen('2026-12-01T00:00:00Z', now)).toBe(false);
  });
  it('the page shows the bottle and the shop, never the price or the buyer', () => {
    const out = publicOrder({ scent_text: 'Oud', family: 'woody', size_ml: '50', strength_pct: '25', price: 300, buyer_name: 'Sara', bottled_at: '2026-11-01T10:00:00Z' }, '  Hisham  ', null);
    expect(out).toEqual({ shop: 'Hisham', scent: 'Oud', family: 'woody', size_ml: 50, strength_pct: 25, bottled_on: '2026-11-01', feedback: null, can_edit: true });
    expect(JSON.stringify(out)).not.toMatch(/300|Sara/);
    expect(BUYER_CODE.test('a'.repeat(32))).toBe(true);
    expect(BUYER_CODE.test('A'.repeat(32))).toBe(false);
  });
});

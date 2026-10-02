import { describe, it, expect } from 'vitest';
import { shareRow } from './share.js';

const batch = {
  id: 'b1', user_id: 'u1', fragrance_name: '  Oud <b>Nights</b> ', tier: 'woody', concentration_pct: '25', basis: null,
  total_ml: '100', total_g: '84.5', oil_g: '23.75', ethanol_g: '60.75', oil_ml: '25', ethanol_ml: '75',
  // Private: must never be copied.
  oil_cost: '12.5', price_per_gram: '0.5', notes: 'from supplier X', oil_type: 'Supplier X', blended_by: 'Hisham',
  actual_oil_g: '23.8', created_at: '2026-10-01',
};

describe('shareRow', () => {
  it('copies the public fields only', () => {
    const r = shareRow(batch, { public_note: 'Rounds out by week 4.', rest_days: 28 }) as any;
    expect(r.row).toEqual({
      batch_id: 'b1', user_id: 'u1', fragrance_name: 'Oud Nights', tier: 'woody', concentration_pct: 25, basis: null,
      total_ml: 100, total_g: 84.5, oil_g: 23.75, ethanol_g: 60.75, rest_days: 28,
      public_note: 'Rounds out by week 4.', note_lang: 'en',
    });
    const text = JSON.stringify(r.row);
    for (const secret of ['12.5', '0.5"', 'supplier', 'Supplier', 'Hisham', '23.8', 'oil_ml']) expect(text).not.toContain(secret);
  });
  it('cleans the note, detects Arabic and allows no note', () => {
    expect((shareRow(batch, { public_note: '<script>x</script>  عطر خشبي ناعم ' }) as any).row).toMatchObject({ public_note: 'x عطر خشبي ناعم', note_lang: 'ar' });
    expect((shareRow(batch, {}) as any).row).toMatchObject({ public_note: null, note_lang: null, rest_days: null });
    expect((shareRow({ ...batch, basis: 'weight' }, {}) as any).row.basis).toBe('weight');
  });
  it('refuses an unknown family, a nameless batch and bad rest days', () => {
    expect(shareRow({ ...batch, tier: 'citrus' }, {})).toMatchObject({ code: 'share_family' });
    expect(shareRow({ ...batch, fragrance_name: '<i></i>' }, {})).toMatchObject({ code: 'share_name' });
    expect(shareRow(batch, { rest_days: 400 })).toMatchObject({ code: 'share_rest' });
    expect(shareRow(batch, { rest_days: 2.5 })).toMatchObject({ code: 'share_rest' });
    expect(shareRow(null, {})).toMatchObject({ code: 'share_family' });
  });
});

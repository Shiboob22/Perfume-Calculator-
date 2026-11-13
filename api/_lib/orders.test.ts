import { describe, it, expect } from 'vitest';
import { orderRow, statusRow, idList, ORDER_CAP } from './orders.js';

const ID = '11111111-1111-4111-8111-111111111111';
const NEW = { buyer_name: ' Sara ', scent_text: 'Oud Nights', size_ml: '50', strength_pct: 25 };

describe('orderRow', () => {
  it('keeps the required fields, trimmed and as numbers', () => {
    expect(orderRow(NEW)).toEqual({ row: { buyer_name: 'Sara', scent_text: 'Oud Nights', size_ml: 50, strength_pct: 25 } });
  });
  it('refuses a new order missing a required field', () => {
    for (const f of ['buyer_name', 'scent_text', 'size_ml', 'strength_pct']) {
      const b: any = { ...NEW };
      delete b[f];
      expect(orderRow(b)).toEqual({ error: `${f} is required.`, field: f });
    }
    expect(orderRow(null)).toMatchObject({ field: 'buyer_name' });
    expect(orderRow({ ...NEW, buyer_name: '  ' })).toMatchObject({ field: 'buyer_name' });
  });
  it('ignores user_id, status and unknown columns', () => {
    const r: any = orderRow({ ...NEW, user_id: ID, status: 'bottled', batch_id: ID, is_admin: true });
    expect(Object.keys(r.row).sort()).toEqual(['buyer_name', 'scent_text', 'size_ml', 'strength_pct']);
  });
  it('accepts every optional field', () => {
    const r: any = orderRow({
      ...NEW, buyer_contact: ' 0100 ', note: ' gift ', recipe_version_id: ID, fragrance_id: ID, family: 'woody',
      price: '450.555', currency: 'egp', wanted_by: '2026-12-01', group_mode: 'separate',
    });
    expect(r.row).toMatchObject({
      buyer_contact: '0100', note: 'gift', recipe_version_id: ID, fragrance_id: ID, family: 'woody',
      price: 450.56, currency: 'EGP', wanted_by: '2026-12-01', group_mode: 'separate',
    });
  });
  it('blank optional fields are null', () => {
    const r: any = orderRow({ ...NEW, buyer_contact: '', note: '', recipe_version_id: '', fragrance_id: null, family: '', price: '', currency: '', wanted_by: null });
    for (const k of ['buyer_contact', 'note', 'recipe_version_id', 'fragrance_id', 'family', 'price', 'currency', 'wanted_by']) expect(r.row[k]).toBeNull();
  });
  it.each([
    ['size_ml', 0], ['size_ml', 1001], ['size_ml', 'x'], ['strength_pct', 0], ['strength_pct', 100],
    ['price', -1], ['price', 2_000_000], ['currency', 'EU'], ['wanted_by', '1/12/2026'], ['wanted_by', '2026-13-45'],
    ['family', 'citrus'], ['fragrance_id', 'nope'], ['recipe_version_id', 5], ['group_mode', 'both'],
  ])('refuses %s = %s', (f, v) => {
    expect(orderRow({ ...NEW, [f]: v })).toMatchObject({ field: f });
  });
  it('an edit takes only the fields given', () => {
    expect(orderRow({ size_ml: 100 }, true)).toEqual({ row: { size_ml: 100 } });
    expect(orderRow({}, true)).toEqual({ error: 'Nothing to change.', field: 'edit' });
    expect(orderRow(undefined, true)).toMatchObject({ field: 'edit' });
  });
});

describe('statusRow', () => {
  const now = new Date('2026-11-13T10:00:00Z');
  it('cancels with a time, and brings back without one', () => {
    expect(statusRow('cancelled', now)).toEqual({ row: { status: 'cancelled', cancelled_at: now.toISOString() } });
    expect(statusRow('queued', now)).toEqual({ row: { status: 'queued', cancelled_at: null } });
    expect(statusRow('queued').row).toBeDefined();
  });
  it('refuses statuses the server sets', () => {
    for (const s of ['bottled', 'handed_over', 'resting', 'ready', 'planned', 1]) expect(statusRow(s)).toMatchObject({ field: 'status' });
  });
});

describe('idList', () => {
  it('takes up to 200 distinct ids', () => {
    expect(idList([ID, ID])).toEqual([ID]);
    expect(idList([])).toBeNull();
    expect(idList('x')).toBeNull();
    expect(idList([ID, 'x'])).toBeNull();
    expect(idList(Array(201).fill(ID))).toBeNull();
  });
  it('cap is set', () => expect(ORDER_CAP).toBe(1000));
});

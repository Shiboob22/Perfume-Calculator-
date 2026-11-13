import { describe, it, expect } from 'vitest';
import { orderRow, statusRow, idList, ORDER_CAP, canMove } from './orders.js';
import { canMove as appCanMove } from '../../src/lib/calc/index';

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
  const at = now.toISOString();
  it('cancels before weighing, and brings back', () => {
    expect(statusRow('cancelled', 'queued', now)).toEqual({ row: { status: 'cancelled', cancelled_at: at } });
    expect(statusRow('queued', 'cancelled', now)).toEqual({ row: { status: 'queued', cancelled_at: null, batch_id: null } });
    expect(statusRow('cancelled', 'resting')).toMatchObject({ field: 'status' });
  });
  it('bottles, hands over, and steps back once', () => {
    expect(statusRow('bottled', 'resting', now)).toEqual({ row: { status: 'bottled', bottled_at: at, handed_at: null } });
    expect(statusRow('handed_over', 'bottled', now)).toEqual({ row: { status: 'handed_over', handed_at: at } });
    expect(statusRow('bottled', 'handed_over', now)).toEqual({ row: { status: 'bottled', handed_at: null } });
    expect(statusRow('resting', 'bottled', now)).toEqual({ row: { status: 'resting', bottled_at: null } });
    expect(statusRow('queued', 'resting', now)).toEqual({ row: { status: 'queued', cancelled_at: null, batch_id: null } });
    expect(statusRow('bottled', 'resting').row).toBeDefined();
  });
  it('refuses jumps and moves the server makes', () => {
    for (const [to, from] of [['handed_over', 'resting'], ['resting', 'queued'], ['bottled', 'queued'], ['planned', 'queued'], [1, 'queued'], ['bottled', 'nope']]) {
      expect(statusRow(to, from as string)).toMatchObject({ field: 'status' });
    }
  });
  it('allows exactly the moves the app offers', () => {
    const all = ['queued', 'planned', 'resting', 'ready', 'bottled', 'handed_over', 'cancelled'];
    for (const from of all) for (const to of all) expect(canMove(from, to), `${from} → ${to}`).toBe(appCanMove(from, to));
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

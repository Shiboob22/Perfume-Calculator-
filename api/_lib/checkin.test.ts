import { describe, it, expect } from 'vitest';
import { parseCheckIn } from './checkin.js';

const id = '11111111-1111-4111-8111-111111111111';
const batch_id = '22222222-2222-4222-8222-222222222222';
const base = { id, batch_id, day: 21, scheduled_day: 21 };

describe('parseCheckIn', () => {
  it('accepts a line, a rating or both', () => {
    expect(parseCheckIn({ ...base, note: ' Softer now ' })).toEqual({ row: { ...base, note: 'Softer now', rating: null, skipped: false } });
    expect(parseCheckIn({ ...base, rating: 4 })).toEqual({ row: { ...base, note: null, rating: 4, skipped: false } });
    expect(parseCheckIn({ ...base, scheduled_day: undefined, note: 'ad hoc', rating: 5 })).toEqual({
      row: { ...base, scheduled_day: null, note: 'ad hoc', rating: 5, skipped: false },
    });
  });
  it('a skip keeps nothing but the point it skips', () => {
    expect(parseCheckIn({ ...base, skipped: true, note: 'x', rating: 3 })).toEqual({ row: { ...base, note: null, rating: null, skipped: true } });
    expect(parseCheckIn({ ...base, scheduled_day: null, skipped: true })).toEqual({ error: 'Only a scheduled check-in can be skipped.' });
  });
  it('cleans the note and caps it at 280 characters', () => {
    const r = parseCheckIn({ ...base, note: '<b>' + 'a'.repeat(300) + '</b>' }) as any;
    expect(r.row.note).toBe('a'.repeat(280));
  });
  it('refuses an empty check-in', () => {
    expect(parseCheckIn({ ...base, note: '  <i></i> ' })).toEqual({ error: 'Write a line or give a rating.' });
  });
  it('refuses bad ids, days and ratings', () => {
    expect(parseCheckIn(null)).toHaveProperty('error');
    expect(parseCheckIn({ ...base, id: 'x' })).toHaveProperty('error');
    expect(parseCheckIn({ ...base, batch_id: 7 })).toHaveProperty('error');
    expect(parseCheckIn({ ...base, day: -1, rating: 3 })).toHaveProperty('error');
    expect(parseCheckIn({ ...base, day: 2.5, rating: 3 })).toHaveProperty('error');
    expect(parseCheckIn({ ...base, scheduled_day: 731, rating: 3 })).toHaveProperty('error');
    expect(parseCheckIn({ ...base, rating: 6 })).toHaveProperty('error');
    expect(parseCheckIn({ ...base, rating: '5' })).toHaveProperty('error');
  });
});

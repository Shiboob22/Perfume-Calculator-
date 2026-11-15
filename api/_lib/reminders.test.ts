import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { remindersDue, batchStart, buildDigest, unsubToken, verifyUnsub, type ReminderBatch } from './reminders.js';

const DAY = 86400000;
const START = '2026-09-01';
const at = (n: number) => new Date(Date.UTC(2026, 8, 1) + n * DAY + 6 * 3600000); // 06:00 UTC, n days in
const batch = (extra: Partial<ReminderBatch> = {}): ReminderBatch => ({
  id: 'b1', user_id: 'u1', batch_no: 7, fragrance_name: 'Oud Nights', blend_date: START, created_at: '2026-09-01T10:00:00Z', batch_checkins: [], ...extra,
});

describe('reminders: what is due', () => {
  it('starts a batch on its blend date, else when it was logged', () => {
    expect(batchStart(batch())).toBe(Date.UTC(2026, 8, 1));
    expect(batchStart(batch({ blend_date: null }))).toBe(Date.UTC(2026, 8, 1));
    expect(Number.isNaN(batchStart({ blend_date: null, created_at: null }))).toBe(true);
  });
  it('announces the milestone a batch has reached, not Day 0', () => {
    expect(remindersDue([batch()], at(0))).toEqual([]);
    expect(remindersDue([batch()], at(1))).toEqual([]);
    expect(remindersDue([batch()], at(7)).map((d) => d.k)).toEqual(['w1']);
    expect(remindersDue([batch()], at(15)).map((d) => d.k)).toEqual(['w2']);
  });
  it('is quiet once the note is written or the milestone was announced', () => {
    const noted = batch({ batch_checkins: [{ id: 'c', day: 8, scheduled_day: 7 }] });
    expect(remindersDue([noted], at(8))).toEqual([]);
    expect(remindersDue([batch()], at(8), new Set(['b1:w1']))).toEqual([]);
    expect(remindersDue([batch()], at(14), new Set(['b1:w1'])).map((d) => d.k)).toEqual(['w2']);
  });
  it('skips a batch with no start', () => {
    expect(remindersDue([batch({ blend_date: null, created_at: null })], at(8))).toEqual([]);
  });
});

describe('reminders: the digest', () => {
  const due = [{ batch: batch(), k: 'w1' as const }, { batch: batch({ id: 'b2', batch_no: 8, fragrance_name: 'Rose <3' }), k: 'm1' as const }];
  const links = { journal: 'https://x.test/journal', unsub: 'https://x.test/api/checkins?unsub=u.t' };
  it('lists each batch once, with the links, in English', () => {
    const d = buildDigest(due, 'en', links);
    expect(d.subject).toBe('2 batches are ready to smell');
    expect(d.text).toContain('No. 007, Oud Nights: Week 1');
    expect(d.text).toContain('No. 008, Rose <3: Month 1');
    expect(d.text).toContain(links.unsub);
    expect(d.html).toContain('Rose &lt;3');
    expect(buildDigest(due.slice(0, 1), 'en', links).subject).toBe('A batch is ready to smell');
  });
  it('in Arabic, right to left', () => {
    const d = buildDigest(due, 'ar', links);
    expect(d.html).toContain('dir="rtl"');
    expect(d.text).toContain('الأسبوع 1');
  });
});

describe('reminders: unsubscribe token', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  it('verifies its own token and nothing else', () => {
    const t = unsubToken(id, 's3cret');
    expect(verifyUnsub(`${id}.${t}`, 's3cret')).toBe(id);
    expect(verifyUnsub(`${id}.${t}`, 'other')).toBeNull();
    expect(verifyUnsub(`${id}.deadbeef`, 's3cret')).toBeNull();
    expect(verifyUnsub('nope', 's3cret')).toBeNull();
    expect(verifyUnsub(`22222222-2222-4222-8222-222222222222.${t}`, 's3cret')).toBeNull();
  });
});

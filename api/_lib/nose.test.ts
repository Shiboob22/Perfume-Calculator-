import { describe, it, expect } from 'vitest';
import {
  cleanPrefs, cleanQuestion, dailyCap, groundAnswer, killSwitchOn, preRedirect, rankCandidates, rankShelf, reasonOk,
  MAX_QUESTION_CHARS, DEFAULT_DAILY_CAP, type Row,
} from './nose.js';

const vocab = ['Woody', 'Amber', 'Citrus', 'Vanilla', 'Fresh'];
const row = (id: string, name: string, accords: string[], extra: Partial<Row> = {}): Row => ({
  id, name, brand: 'House', year: 2020, tier: 'woody', olfactory_family: 'Woody', accords, rating: 4, ...extra,
});

describe('the Nose: questions and switches', () => {
  it('trims, collapses and bounds the question', () => {
    expect(cleanQuestion('  a   warm \n scent ')).toBe('a warm scent');
    expect(cleanQuestion('x'.repeat(2000))).toHaveLength(MAX_QUESTION_CHARS);
    expect(cleanQuestion(42)).toBe('');
  });
  it('the kill switch is off only by NOSE_ENABLED=0', () => {
    expect(killSwitchOn({ NOSE_ENABLED: '0' })).toBe(true);
    expect(killSwitchOn({ NOSE_ENABLED: '1' })).toBe(false);
    expect(killSwitchOn({})).toBe(false);
  });
  it('the daily cap defaults and accepts only a positive whole number', () => {
    expect(dailyCap({})).toBe(DEFAULT_DAILY_CAP);
    expect(dailyCap({ NOSE_DAILY_CAP: '50' })).toBe(50);
    expect(dailyCap({ NOSE_DAILY_CAP: '-3' })).toBe(DEFAULT_DAILY_CAP);
    expect(dailyCap({ NOSE_DAILY_CAP: 'lots' })).toBe(DEFAULT_DAILY_CAP);
  });
});

describe('the Nose: what it will not answer with picks', () => {
  it.each([
    'Which perfume is safe for my baby?',
    'something for my anxiety and insomnia',
    'I am pregnant, what can I wear',
    'perfume that cures migraines',
    'I have eczema, any allergy-friendly scent?',
    'هل هذا العطر آمن للحامل',
    'عطر يعالج القلق',
  ])('sends health questions to a pointer: %s', (q) => expect(preRedirect(q)).toBe('health'));

  it.each([
    'how much alcohol do I add to 50 ml of oil',
    'what ratio should I dilute at',
    'كم أضع من الإيثانول',
  ])('sends blending questions to the Bench: %s', (q) => expect(preRedirect(q)).toBe('diy'));

  it('lets an ordinary request through', () => {
    expect(preRedirect('a warm woody scent for winter evenings')).toBeNull();
    expect(preRedirect('عطر خشبي دافئ للشتاء')).toBeNull();
  });
  it('health wins over blending', () => expect(preRedirect('ratio to dilute for my baby')).toBe('health'));

  it('rejects a model reason that makes a claim or carries a link', () => {
    expect(reasonOk('Warm woody base with amber.')).toBe(true);
    expect(reasonOk('It is safe for sensitive skin.')).toBe(false);
    expect(reasonOk('Relieves stress.')).toBe(false);
    expect(reasonOk('Lasts all day and projects well.')).toBe(false);
    expect(reasonOk('See https://example.com')).toBe(false);
    expect(reasonOk('')).toBe(false);
  });
});

describe('the Nose: preferences from the model', () => {
  it('keeps only vocabulary accords, de-duplicated, and never avoids what it wants', () => {
    const p = cleanPrefs({ intent: 'recommend', accords: ['Woody', 'Invented', 'Woody', 'Amber'], avoid: ['Amber', 'Citrus'], notes: ['Oud'], family: 'woody' }, vocab);
    expect(p).toEqual({ intent: 'recommend', accords: ['Woody', 'Amber'], avoid: ['Citrus'], notes: ['Oud'], family: 'woody' });
  });
  it('an unreadable or empty answer is off-topic, never a search', () => {
    expect(cleanPrefs(null, vocab).intent).toBe('off_topic');
    expect(cleanPrefs('nonsense', vocab).intent).toBe('off_topic');
    expect(cleanPrefs({ intent: 'recommend', accords: [], avoid: [], notes: [], family: 'none' }, vocab).intent).toBe('off_topic');
  });
  it('passes the model\'s own health and diy intents through', () => {
    expect(cleanPrefs({ intent: 'health', accords: [] }, vocab).intent).toBe('health');
    expect(cleanPrefs({ intent: 'diy', accords: [] }, vocab).intent).toBe('diy');
  });
});

describe('the Nose: ranking real rows', () => {
  const rows = [
    row('a', 'Amber Wood', ['Amber', 'Woody', 'Vanilla']),
    row('b', 'Plain Wood', ['Woody', 'Fresh']),
    row('c', 'Citrus Zing', ['Citrus', 'Fresh']),
    row('d', 'Late Wood', ['Citrus', 'Fresh', 'Vanilla', 'Woody']),
  ];
  it('ranks by matched accords, strongest wanted first, and drops non-matches', () => {
    const r = rankCandidates(rows, { accords: ['Woody', 'Amber'], avoid: [], family: null });
    expect(r.map((c) => c.id)).toEqual(['a', 'b', 'd']);
    expect(r.find((c) => c.id === 'a')!.matched).toEqual(['Woody', 'Amber']);
  });
  it('removes a row whose leading accords include an avoided one', () => {
    const r = rankCandidates(rows, { accords: ['Woody'], avoid: ['Amber'], family: null });
    expect(r.map((c) => c.id)).not.toContain('a');
  });
  it('is deterministic: ties break on rating then name', () => {
    const tied = [row('x', 'Zed', ['Woody'], { rating: 4 }), row('y', 'Abe', ['Woody'], { rating: 4 }), row('z', 'Top', ['Woody'], { rating: 4.5 })];
    expect(rankCandidates(tied, { accords: ['Woody'], avoid: [], family: null }).map((c) => c.id)).toEqual(['z', 'y', 'x']);
  });
  it('respects the limit', () => {
    expect(rankCandidates(rows, { accords: ['Fresh'], avoid: [], family: null }, 1)).toHaveLength(1);
  });
});

describe('the Nose: an answer held to the catalog', () => {
  const cands = rankCandidates([row('a', 'Amber Wood', ['Amber', 'Woody']), row('b', 'Plain Wood', ['Woody'])], { accords: ['Woody', 'Amber'], avoid: [], family: null });
  it('drops ids the model made up and repeats', () => {
    const a = groundAnswer({ intro: 'Warm woods.', picks: [{ id: 'zzz', reason: 'x' }, { id: 'a', reason: 'Amber and wood.' }, { id: 'a', reason: 'again' }] }, cands);
    expect(a.picks.map((p) => p.id)).toEqual(['a']);
    expect(a.picks[0]).toMatchObject({ name: 'Amber Wood', matched: ['Woody', 'Amber'], reason: 'Amber and wood.' });
  });
  it('blanks a reason that makes a claim but keeps the pick', () => {
    const a = groundAnswer({ intro: '', picks: [{ id: 'a', reason: 'Safe for sensitive skin.' }] }, cands);
    expect(a.picks[0].reason).toBe('');
    expect(a.picks[0].matched.length).toBeGreaterThan(0);
  });
  it('falls back to the best matches when nothing valid comes back', () => {
    for (const raw of [null, { picks: [] }, { picks: [{ id: 'nope', reason: 'x' }] }, 'junk']) {
      const a = groundAnswer(raw, cands);
      expect(a.picks.map((p) => p.id)).toEqual(['a', 'b']);
      expect(a.picks.every((p) => p.reason === '')).toBe(true);
    }
  });
  it('strips markdown from the intro and caps picks at five', () => {
    const many = Array.from({ length: 8 }, (_, i) => row(`r${i}`, `N${i}`, ['Woody']));
    const c = rankCandidates(many, { accords: ['Woody'], avoid: [], family: null });
    const a = groundAnswer({ intro: '**Woods** for you', picks: c.map((x) => ({ id: x.id, reason: 'Woody base.' })) }, c);
    expect(a.picks).toHaveLength(5);
    expect(a.intro).toBe('Woods for you');
  });
});

describe('rankShelf', () => {
  const prefs = { accords: ['Woody', 'Amber'], avoid: ['Citrus'], family: 'amber' };
  it('ranks owned bottles by accords, then family alone, never an avoided one', () => {
    const shelf = rankShelf([
      { id: 'typed', name: 'Typed Oriental', family: 'oriental', accords: null },
      { id: 'linked', name: 'Linked Wood', family: 'woody', accords: ['Woody', 'Amber', 'Spicy'] },
      { id: 'citrus', name: 'Bright', family: 'fresh', accords: ['Citrus', 'Woody'] },
      { id: 'none', name: 'Floral', family: 'floral', accords: ['Rose'] },
    ], prefs);
    expect(shelf.map((b) => b.id)).toEqual(['linked', 'typed']);
    expect(shelf[0]).toEqual({ id: 'linked', name: 'Linked Wood', family: 'woody', matched: ['Woody', 'Amber'] });
    expect(shelf[1].matched).toEqual([]);
  });
  it('keeps at most three', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, name: `B${i}`, family: null, accords: ['Woody'] }));
    expect(rankShelf(many, prefs)).toHaveLength(3);
  });
});


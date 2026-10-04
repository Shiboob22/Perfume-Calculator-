import { describe, expect, it } from 'vitest';
import { dedupeVariants } from './dedupe.js';

const d = (name: string, extra = {}) => ({ name, brand: 'Alfred Dunhill', year: 2000, rating: 4.05, popularity: 1942, ...extra });

describe('dedupeVariants', () => {
  it('keeps one row per fragrance, under its shortest name, in first-seen order', () => {
    const rows = [d('Desire for a Man'), d('Dunhill Desire for a Man'), d('Icon', { year: 2015, popularity: 3474 }), d('Desire')];
    expect(dedupeVariants(rows).map((r) => r.name)).toEqual(['Desire', 'Icon']);
  });
  it('keeps different perfumes of the same house apart', () => {
    expect(dedupeVariants([d('A'), d('B', { popularity: 5 })]).map((r) => r.name)).toEqual(['A', 'B']);
  });
  it('never merges rows with no votes', () => {
    expect(dedupeVariants([d('A', { popularity: null }), d('B', { popularity: null })])).toHaveLength(2);
  });
});

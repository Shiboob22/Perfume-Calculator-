import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';

// Two files once shared the number 0019 (inventory_non_negative on main,
// tier_from_accords applied from a branch). Numbers must stay unique and gapless.
describe('supabase/migrations', () => {
  const nums = readdirSync('supabase/migrations')
    // A migration's reversal ("0023_x.down.sql") shares its number.
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .map((f) => Number(f.slice(0, 4)))
    .sort((a, b) => a - b);

  it('numbers every file', () => {
    expect(nums.some(Number.isNaN)).toBe(false);
  });

  it('has no duplicate number', () => {
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  // 0023-0025 (recipes, wardrobe, atlas) were applied to production from the
  // redesign branches and are not in this one yet; their numbers stay taken.
  const OTHER_BRANCHES = [23, 24, 25];
  it('has no gap, except numbers taken by another branch', () => {
    const expected = Array.from({ length: Math.max(...nums) + 1 }, (_, i) => i).filter((n) => !OTHER_BRANCHES.includes(n));
    expect(nums).toEqual(expected);
  });
  it('does not reuse a number another branch took', () => {
    expect(nums.filter((n) => OTHER_BRANCHES.includes(n))).toEqual([]);
  });
});

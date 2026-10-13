import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';

// Two files once shared the number 0019 (inventory_non_negative on main,
// tier_from_accords applied from a branch). Numbers must stay unique and gapless.
describe('supabase/migrations', () => {
  const nums = readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .map((f) => Number(f.slice(0, 4)))
    .sort((a, b) => a - b);

  it('numbers every file', () => {
    expect(nums.some(Number.isNaN)).toBe(false);
  });

  it('has no duplicate number', () => {
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it('has no gap', () => {
    nums.forEach((n, i) => expect(n).toBe(i));
  });
});

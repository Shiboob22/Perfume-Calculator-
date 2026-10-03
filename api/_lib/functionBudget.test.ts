import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Vercel deploys every .ts/.js file under api/ as its own function unless a
// path segment starts with "_" or ".". The Hobby plan allows 12. A test file
// placed directly in api/ was once deployed as a 12th function (it 500'd),
// so tests and helpers belong under api/_lib/.
const HOBBY_LIMIT = 12;

function deployable(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('_') || e.name.startsWith('.')) return [];
    const p = join(dir, e.name);
    if (e.isDirectory()) return deployable(p);
    return /\.(ts|js|mjs|cjs)$/.test(e.name) && !e.name.endsWith('.d.ts') ? [p] : [];
  });
}

describe('Vercel functions', () => {
  const routes = deployable('api');

  it('deploys no test file', () => {
    expect(routes.filter((f) => /\.(test|spec)\.[cm]?[jt]s$/.test(f))).toEqual([]);
  });

  it(`stays within the Hobby plan's ${HOBBY_LIMIT} functions`, () => {
    expect(routes.length, routes.join(', ')).toBeLessThanOrEqual(HOBBY_LIMIT);
  });
});

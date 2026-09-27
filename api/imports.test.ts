import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Vercel runs api/*.ts as native ES modules: a relative import without its
// .js extension builds fine and then crashes at runtime with
// ERR_MODULE_NOT_FOUND (it happened on /api/me). Guard every file.
function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsFiles(p);
    return e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') ? [p] : [];
  });
}

describe('api relative imports', () => {
  for (const file of tsFiles('api')) {
    it(`${file} imports relative modules with a .js extension`, () => {
      const src = readFileSync(file, 'utf8');
      const bad = [...src.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)]
        .map((m) => m[1])
        .filter((spec) => !spec.endsWith('.js'));
      expect(bad).toEqual([]);
    });
  }
});

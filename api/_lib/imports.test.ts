import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

// Vercel runs api/*.ts as native ES modules: a relative import without its
// .js extension builds fine and then crashes at runtime with
// ERR_MODULE_NOT_FOUND (it happened on /api/me). Guard every file, and every
// file under src/ that an API function imports, all the way down.
function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsFiles(p);
    return e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') ? [p] : [];
  });
}

const relativeImports = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/(?:from|import)\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => m[1]);

// The file a ".js" specifier loads: the .js itself, or the .ts it compiles from.
function target(from: string, spec: string): string | null {
  const p = resolve(dirname(from), spec);
  if (existsSync(p)) return p;
  const ts = p.replace(/\.js$/, '.ts');
  return existsSync(ts) ? ts : null;
}

function reachable(entries: string[]): string[] {
  const seen = new Set<string>();
  const queue = entries.map((f) => resolve(f));
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of relativeImports(file)) {
      const next = spec.endsWith('.js') ? target(file, spec) : null;
      if (next) queue.push(next);
    }
  }
  return [...seen];
}

describe('api relative imports', () => {
  for (const file of reachable(tsFiles('api'))) {
    const name = file.slice(resolve('.').length + 1);
    it(`${name} imports relative modules with a .js extension that exists`, () => {
      const specs = relativeImports(file);
      expect(specs.filter((spec) => !spec.endsWith('.js'))).toEqual([]);
      expect(specs.filter((spec) => !target(file, spec))).toEqual([]);
    });
  }
});

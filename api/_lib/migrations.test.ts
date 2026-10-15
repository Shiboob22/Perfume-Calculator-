import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Migrations are applied in numbered order to three databases. Two files with
// one number (0019 once had two) mean one of them is applied under the other's
// name, and a gap or a stray file hides which databases have what.
const DIR = join(__dirname, '../../supabase/migrations');
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();

describe('supabase/migrations', () => {
  it('are named NNNN_name.sql', () => {
    for (const f of files) expect(f, f).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
  });

  it('have no duplicate numbers', () => {
    const seen = new Map<string, string>();
    for (const f of files) {
      const n = f.slice(0, 4);
      expect(seen.get(n), `${f} repeats the number of ${seen.get(n)}`).toBeUndefined();
      seen.set(n, f);
    }
  });

  it('have no gaps from 0000', () => {
    files.forEach((f, i) => expect(f.slice(0, 4), f).toBe(String(i).padStart(4, '0')));
  });

  // CREATE OR REPLACE FUNCTION resets the function's settings (0019 once
  // dropped the search_path 0014 had set). A replacement of a function that an
  // earlier migration pinned must carry the setting itself.
  it('keep a fixed search_path when they replace a function that had one', () => {
    const pinned = new Set<string>();
    for (const f of files) {
      const sql = readFileSync(join(DIR, f), 'utf8').replace(/--.*$/gm, '');
      for (const m of sql.matchAll(/alter\s+function\s+public\.(\w+)\s*\([^)]*\)\s+set\s+search_path/gi)) pinned.add(m[1]);
      for (const m of sql.matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)\s*\([\s\S]*?\$\$[\s\S]*?\$\$\s*;/gi)) {
        if (pinned.has(m[1])) expect(m[0], `${f} replaces ${m[1]} without search_path`).toMatch(/search_path/i);
      }
    }
  });
});

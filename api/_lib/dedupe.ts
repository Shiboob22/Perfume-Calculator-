// The catalog holds one fragrance under several names ("Desire", "Dunhill
// Desire for a Man", "Desire for a Man": same house, year, rating and votes).
// A result list should show it once, under its original (shortest) name.
type Row = { name?: string | null; brand?: string | null; year?: number | null; rating?: number | string | null; popularity?: number | null };

const key = (r: Row) => [r.brand, r.year, r.rating, r.popularity].map((v) => String(v ?? '').trim().toLowerCase()).join('|');

/** One row per fragrance, in the order first seen, keeping the shortest name. */
export function dedupeVariants<T extends Row>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    // Without votes there is nothing to tell a variant from a different perfume.
    if (!r.popularity) { best.set(`solo:${best.size}`, r); continue; }
    const k = key(r);
    const cur = best.get(k);
    if (!cur) best.set(k, r);
    else if ((r.name ?? '').length < (cur.name ?? '').length) best.set(k, r);
  }
  return [...best.values()];
}

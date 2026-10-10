// Map main accords to one of the app's 5 families. Specific families are
// checked before `fresh`, which is also the fallback: otherwise a sweet
// gourmand that happens to list a "Citrus" accord (e.g. Naxos) misclassifies
// as fresh. Mirrored by public.classify_tier() in migration 0020, which keeps
// `fragrances.tier` in step when accords change; change both together.
export const TIER_RULES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['gourmand', ['vanilla', 'sweet', 'gourmand', 'caramel', 'chocolate', 'honey', 'praline', 'tobacco']],
  ['oriental', ['amber', 'oriental', 'warm spicy', 'balsamic', 'resinous', 'oud', 'spicy']],
  ['floral', ['floral', 'powdery', 'rose', 'white floral']],
  ['woody', ['woody', 'earthy', 'mossy', 'aromatic']],
  ['fresh', ['citrus', 'fresh', 'green', 'aquatic', 'ozonic']],
];

export function classifyTier(accords: string[]): string {
  const a = accords.map((x) => x.toLowerCase());
  for (const [tier, terms] of TIER_RULES) {
    if (a.some((x) => terms.some((t) => x.includes(t)))) return tier;
  }
  return 'fresh';
}

// Words that only appear in the owner's PRIVATE handbook material: the
// bottles of Vol. I Part X and Vol. II (the Wardrobe), their houses, the
// profile nicknames and the names of the private sections. Any of them in
// published content is a leak. Used by src/content/guides.test.js (source
// content and UI strings) and scripts/check-bundle.mjs (the built site).
//
// Not here on purpose: bare "Cairo" (published Vol. I climate text uses it)
// and generic note words. The catalog search shows brand names at run time;
// that data never passes through these checks.

// The owner's bottles and their houses.
export const PRIVATE_NAMES = [
  /\bIcon\b/, /Sedley/, /YSL Y\b/, /\bY EDP\b/, /MYSLF/i, /Wulong Cha/i, /Rain Tea/i, /Tea Storm/i, /Blue Talisman/i,
  /Alth[aä]ïr|Althair/i, /Layton/i, /Pegasus/i, /40 Knots/i, /Herod/i, /Naxos/i, /Code Parfum/i,
  /Tobacco RWA|Rich Warm Addictive|\bRWA\b/i, /1 Million|One Million/i, /God of Fire/i, /Black XS|L['’]Exc[eè]s/i,
  /Desire (Red|for a Man)/i, /Le Beau/i,
  /\bPDM\b/, /Parfums de Marly/i, /Xerjoff/i, /Nishane/i, /Ex Nihilo/i, /Dunhill/i, /\bZara\b/, /\bJPG\b/,
  /Paco Rabanne/i, /\bArmani\b/, /Yves Saint Laurent/i,
];

// The Part XII profile nicknames and the private sections' own names.
export const PRIVATE_PHRASES = [
  /Tailored Suit/i, /Quiet Luxury Signature/i, /Polished Seducer/i, /Velvet Jacket/i, /King of the Wardrobe/i,
  /Metallic Aristocrat/i, /Cairo Weapon/i, /Social Performer/i, /Exotic Statement/i, /The Yacht\b/i,
  /Grand Entrance/i, /Cozy Lounge/i, /Professional Blue/i,
  /Core Five/i, /Core Thirteen/i, /New Seven/i, /twenty-fragrance/i, /Cairo-tested/i, /Grouped for Cairo/i,
];

// The Wardrobe's scores, written "9.3 / 10" or "8 / 10". Not a plain "1/10"
// (a fraction). Source text only: minified code can contain "n/10".
export const PRIVATE_SCORE = /\b\d{1,2}\.\d\s?\/\s?10\b|\b\d{1,2} \/ 10\b/;

export const PRIVATE_TERMS = [...PRIVATE_NAMES, ...PRIVATE_PHRASES];

/** The private terms found in `text`, as their pattern sources. */
export function privateTermsIn(text, { scores = false } = {}) {
  const hits = PRIVATE_TERMS.filter((re) => re.test(text)).map(String);
  if (scores && PRIVATE_SCORE.test(text)) hits.push(String(PRIVATE_SCORE));
  return hits;
}

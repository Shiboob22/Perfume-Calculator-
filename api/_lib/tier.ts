// A fragrance's family (`tier`) from two things the catalogue knows about it:
// its main accords and, where one is stated, its olfactory group ("Amber
// Woody", "Aromatic Fougere").
//
// Each accord votes for one of the app's five families. Accords are stored
// strongest first, so a vote fades with position, and the broad modifiers
// (sweet, powdery, fruity, aromatic, fresh, fresh spicy) count half. The stated
// group adds one more vote, as strong as a leading accord. The family with the
// most points wins.
//
// Before migration 0038 any single accord decided it ("sweet" anywhere meant
// gourmand), which filed Tom Ford Oud Wood and Creed Aventus under gourmand.
//
// Mirrored by public.classify_family() in migration 0038, which keeps
// `fragrances.tier` in step when accords or the group change. Change both
// together: `tier.test.ts` and `supabase/tests/family_rule.sql` hold the same
// checksum over the same generated cases.

export type Tier = 'fresh' | 'floral' | 'woody' | 'oriental' | 'gourmand';

/** Accord name (lowercase, no accents) → its family and weight (2 full, 1 half). */
export const ACCORD_FAMILY: Readonly<Record<string, readonly [Tier, 1 | 2]>> = {
  citrus: ['fresh', 2], green: ['fresh', 2], aquatic: ['fresh', 2], marine: ['fresh', 2], ozonic: ['fresh', 2],
  herbal: ['fresh', 2], lavender: ['fresh', 2], tropical: ['fresh', 2], salty: ['fresh', 2], fougere: ['fresh', 2],
  fresh: ['fresh', 1], 'fresh spicy': ['fresh', 1], aromatic: ['fresh', 1], fruity: ['fresh', 1],
  floral: ['floral', 2], 'white floral': ['floral', 2], 'yellow floral': ['floral', 2], rose: ['floral', 2],
  violet: ['floral', 2], iris: ['floral', 2], tuberose: ['floral', 2], aldehydic: ['floral', 2], powdery: ['floral', 1],
  woody: ['woody', 2], earthy: ['woody', 2], mossy: ['woody', 2], patchouli: ['woody', 2], leather: ['woody', 2],
  leathery: ['woody', 2], smoky: ['woody', 2], conifer: ['woody', 2], chypre: ['woody', 2],
  amber: ['oriental', 2], oriental: ['oriental', 2], 'warm spicy': ['oriental', 2], 'soft spicy': ['oriental', 2],
  spicy: ['oriental', 2], balsamic: ['oriental', 2], resinous: ['oriental', 2], oud: ['oriental', 2], cinnamon: ['oriental', 2],
  vanilla: ['gourmand', 2], gourmand: ['gourmand', 2], caramel: ['gourmand', 2], chocolate: ['gourmand', 2],
  cacao: ['gourmand', 2], coffee: ['gourmand', 2], honey: ['gourmand', 2], praline: ['gourmand', 2],
  tobacco: ['gourmand', 2], almond: ['gourmand', 2], nutty: ['gourmand', 2], lactonic: ['gourmand', 2],
  coconut: ['gourmand', 2], creamy: ['gourmand', 2], rum: ['gourmand', 2], whiskey: ['gourmand', 2], sweet: ['gourmand', 1],
};

/** Points for the 1st, 2nd, … accord; every accord after the tenth gets `LATE_POINTS`. */
export const POSITION_POINTS: readonly number[] = [100, 80, 64, 51, 41, 33, 26, 21, 17, 13];
export const LATE_POINTS = 10;
/** The stated group's vote: a leading accord at full weight. */
export const GROUP_POINTS = 200;

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** The family a stated olfactory group points to, or null when it names none. */
export function familyFromGroup(group: string | null | undefined): Tier | null {
  const g = fold(group ?? '');
  if (/(gourmand|vanilla|tobacco)/.test(g)) return 'gourmand';
  if (/^floral/.test(g)) return 'floral';
  if (/^(amber|oriental)/.test(g)) return 'oriental';
  if (/^(woody|chypre|leather)/.test(g)) return 'woody';
  if (/^(citrus|aromatic|fougere|aquatic|green|fruity)/.test(g)) return 'fresh';
  return null;
}

/** The family the accords and the group point to, or null when neither says anything. */
export function classifyFamily(accords: readonly string[] | null | undefined, group?: string | null): Tier | null {
  const points = new Map<Tier, number>();
  const first = new Map<Tier, number>();
  const vote = (fam: Tier, pts: number, pos: number) => {
    points.set(fam, (points.get(fam) ?? 0) + pts);
    if (!first.has(fam) || pos < (first.get(fam) as number)) first.set(fam, pos);
  };
  (accords ?? []).forEach((accord, i) => {
    const hit = ACCORD_FAMILY[fold(String(accord ?? ''))];
    if (hit) vote(hit[0], (POSITION_POINTS[i] ?? LATE_POINTS) * hit[1], i + 1);
  });
  const fromGroup = familyFromGroup(group);
  if (fromGroup) vote(fromGroup, GROUP_POINTS, 0);

  let best: Tier | null = null;
  for (const fam of [...points.keys()].sort()) {
    if (best === null) { best = fam; continue; }
    const d = (points.get(fam) as number) - (points.get(best) as number);
    if (d > 0 || (d === 0 && (first.get(fam) as number) < (first.get(best) as number))) best = fam;
  }
  return best;
}

/** As `classifyFamily`, with the app's fallback family when nothing is known. */
export function classifyTier(accords: readonly string[], group?: string | null): Tier {
  return classifyFamily(accords, group) ?? 'fresh';
}

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ACCORD_FAMILY, classifyFamily, classifyTier, familyFromGroup } from './tier.js';

describe('classifyFamily', () => {
  it('lets the strongest accords decide, not any single one', () => {
    // "Sweet" or "Vanilla" far down the list no longer makes a gourmand.
    expect(classifyFamily(['Woody', 'Oud', 'Warm Spicy', 'Aromatic', 'Vanilla', 'Balsamic'])).toBe('oriental');
    expect(classifyFamily(['Citrus', 'Woody', 'Fresh', 'Fruity', 'Aromatic', 'Musky'])).toBe('fresh');
    expect(classifyFamily(['Woody', 'Powdery', 'Leather', 'Warm Spicy', 'Violet'])).toBe('woody');
    // A sweet gourmand that opens on citrus is still a gourmand (Naxos).
    expect(classifyFamily(['Citrus', 'Vanilla', 'Sweet'])).toBe('gourmand');
  });

  it('reads "fresh spicy" as fresh, not as spicy', () => {
    expect(classifyFamily(['Fresh Spicy', 'Amber', 'Citrus', 'Aromatic', 'Musky', 'Woody'])).toBe('fresh');
  });

  it('counts the broad modifiers half', () => {
    expect(classifyFamily(['Sweet', 'Woody'])).toBe('woody'); // 100 against 160
    expect(classifyFamily(['Vanilla', 'Woody'])).toBe('gourmand'); // 200 against 160
  });

  it('adds the stated group as one strong vote', () => {
    // Bleu de Chanel: citrus leads, the group and the woods carry it.
    expect(classifyFamily(['Citrus', 'Woody', 'Warm Spicy', 'Aromatic', 'Amber', 'Fresh Spicy'], 'Woody Aromatic')).toBe('woody');
    // Baccarat Rouge 540: woody leads, amber and the group carry it.
    expect(classifyFamily(['Woody', 'Amber', 'Warm Spicy', 'Fresh Spicy', 'Aromatic', 'Metallic'], 'Amber Floral')).toBe('oriental');
    // Creed Aventus.
    expect(classifyFamily(['Fruity', 'Sweet', 'Leather', 'Woody', 'Smoky', 'Citrus'], 'Chypre Fruity')).toBe('woody');
    // Tobacco Vanille: the accords outvote an "Amber Spicy" group.
    expect(classifyFamily(['Vanilla', 'Sweet', 'Tobacco', 'Warm Spicy', 'Fruity', 'Woody'], 'Amber Spicy')).toBe('gourmand');
    // Light Blue: the accords outvote a "Floral Fruity" group.
    expect(classifyFamily(['Citrus', 'Woody', 'Fresh', 'Fruity', 'Aromatic', 'Musky'], 'Floral Fruity')).toBe('fresh');
  });

  it('uses the group alone when there are no accords', () => {
    expect(classifyFamily([], 'Leather')).toBe('woody');
    expect(classifyFamily(null, 'Amber Vanilla')).toBe('gourmand');
  });

  it('says nothing when it knows nothing', () => {
    expect(classifyFamily([])).toBeNull();
    expect(classifyFamily(['Metallic', 'Musky'])).toBeNull();
    expect(classifyFamily(null, 'Musk')).toBeNull();
  });

  it('ignores case, spaces and accents', () => {
    expect(classifyFamily(['  WARM SPICY '])).toBe('oriental');
    expect(classifyFamily(['Fougère'])).toBe('fresh');
    expect(familyFromGroup('Aromatic Fougère')).toBe('fresh');
  });

  it('gives a tie to the family heard first', () => {
    // 200 each: the group counts as position 0, ahead of the first accord.
    expect(classifyFamily(['Rose'], 'Amber')).toBe('oriental');
    expect(classifyFamily(['Fresh', 'Sweet', 'Powdery', 'Aromatic'])).toBe('fresh'); // 100+51 > 80 > 64
  });
});

describe('familyFromGroup', () => {
  it('maps the first word, and any gourmand word', () => {
    expect(familyFromGroup('Floral Woody Musk')).toBe('floral');
    expect(familyFromGroup('Amber Woody')).toBe('oriental');
    expect(familyFromGroup('Woody Amber')).toBe('woody');
    expect(familyFromGroup('Chypre Floral')).toBe('woody');
    expect(familyFromGroup('Leather')).toBe('woody');
    expect(familyFromGroup('Citrus Aromatic')).toBe('fresh');
    expect(familyFromGroup('Floral Fruity Gourmand')).toBe('gourmand');
    expect(familyFromGroup('Amber Vanilla')).toBe('gourmand');
    expect(familyFromGroup('Woody Tobacco')).toBe('gourmand');
    expect(familyFromGroup(null)).toBeNull();
    expect(familyFromGroup('')).toBeNull();
  });
});

describe('classifyTier', () => {
  it('falls back to fresh when nothing is known', () => {
    expect(classifyTier([])).toBe('fresh');
    expect(classifyTier(['Metallic'])).toBe('fresh');
  });

  it('agrees with classifyFamily otherwise', () => {
    expect(classifyTier(['Aquatic', 'Ozonic'])).toBe('fresh');
    expect(classifyTier(['Green', 'White Floral'])).toBe('fresh'); // 200 against 160
    expect(classifyTier(['Amber', 'Woody'], 'Woody Amber')).toBe('woody');
  });
});

// The database's classify_family() (migration 0038) must give the same
// answers. Both sides build the same 4,000 cases from the same two lists and
// hash the answers; supabase/tests/family_rule.sql holds the same checksum.
export const PARITY_ACCORDS = [
  'Citrus', 'Green', 'Aquatic', 'Marine', 'Ozonic', 'Herbal', 'Lavender', 'Tropical', 'Salty', 'Fougère',
  'Fresh', 'Fresh Spicy', 'Aromatic', 'Fruity',
  'Floral', 'White Floral', 'Yellow Floral', 'Rose', 'Violet', 'Iris', 'Tuberose', 'Aldehydic', 'Powdery',
  'Woody', 'Earthy', 'Mossy', 'Patchouli', 'Leather', 'Leathery', 'Smoky', 'Conifer', 'Chypre',
  'Amber', 'Oriental', 'Warm Spicy', 'Soft Spicy', 'Spicy', 'Balsamic', 'Resinous', 'Oud', 'Cinnamon',
  'Vanilla', 'Gourmand', 'Caramel', 'Chocolate', 'Cacao', 'Coffee', 'Honey', 'Praline', 'Tobacco', 'Almond',
  'Nutty', 'Lactonic', 'Coconut', 'Creamy', 'Rum', 'Whiskey', 'Sweet',
  'Musky', 'Animalic', 'Metallic', 'Mineral', 'WARM SPICY', ' citrus ', 'Synthetic',
];
export const PARITY_GROUPS: (string | null)[] = [
  null, 'Floral', 'Floral Fruity', 'Amber Floral', 'Amber Woody', 'Woody Aromatic', 'Amber Vanilla',
  'Citrus Aromatic', 'Chypre Floral', 'Leather', 'Aromatic Fougère', 'Floral Fruity Gourmand', 'Woody Tobacco',
  'Musk', '',
];
export const PARITY_CHECKSUM = '2706ee5228dd264575dd2fc1199944cb';

export function parityAnswers(): string {
  const out: string[] = [];
  for (let i = 0; i < 4000; i++) {
    const accords: string[] = [];
    for (let j = 0; j < i % 12; j++) accords.push(PARITY_ACCORDS[(i * 31 + j * 17 + j * j * 7) % PARITY_ACCORDS.length]);
    const group = PARITY_GROUPS[Math.floor(i / 12) % PARITY_GROUPS.length];
    out.push(classifyFamily(accords, group) ?? '-');
  }
  return out.join(',');
}

describe('parity with the database rule', () => {
  it('covers every mapped accord', () => {
    const folded = new Set(PARITY_ACCORDS.map((a) => a.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()));
    for (const accord of Object.keys(ACCORD_FAMILY)) expect(folded.has(accord), accord).toBe(true);
  });

  it('gives the answers classify_family() gives', () => {
    expect(createHash('md5').update(parityAnswers()).digest('hex')).toBe(PARITY_CHECKSUM);
  });
});

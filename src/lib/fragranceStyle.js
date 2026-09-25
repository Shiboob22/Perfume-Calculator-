// Presentation helpers for the Fragrantica/Parfumo-style fragrance page:
// accord colours, note categories, bottle-photo URLs, and character estimates
// derived from a perfume's own accords.

/* ---------------- Accord colours ----------------
 * Fragrantica paints each accord in its own colour (citrus yellow, woody
 * brown, rose pink…); these follow the same conventions. Unknown accords get
 * a stable colour from a warm fallback palette. */
const ACCORD_COLORS = {
  citrus: '#F2E45C', woody: '#7A4A1E', 'fresh spicy': '#8CC63F', amber: '#BC5A17',
  aromatic: '#3FA38C', 'warm spicy': '#C8391A', musky: '#DCC9DB', fruity: '#F2603A',
  powdery: '#E9D8C6', sweet: '#E0474C', floral: '#F2688F', 'white floral': '#EEF1F7',
  fresh: '#9FE0E8', green: '#2F9B3A', vanilla: '#F6EDB8', rose: '#E8216E',
  earthy: '#5E513F', patchouli: '#80703C', balsamic: '#9B6A3C', animalic: '#8A5E3A',
  'soft spicy': '#D9774A', leather: '#6E4325', aquatic: '#4FB0CF', lavender: '#9C82CF',
  herbal: '#6DA84A', violet: '#9450C2', iris: '#B6A5DD', oud: '#4A3322',
  'yellow floral': '#F5CB45', mossy: '#6A7A31', smoky: '#8E8A86', tropical: '#F7A23A',
  ozonic: '#BFE7F7', lactonic: '#F3EBD8', cinnamon: '#B0552C', tuberose: '#EFE6F7',
  tobacco: '#A0662E', marine: '#2F86B8', honey: '#EFB131', caramel: '#C47A37',
  nutty: '#A67A45', almond: '#E5CFA5', coconut: '#F2EEE4', aldehydic: '#D9E2F0',
  salty: '#CBE0E6', metallic: '#A6ADB5', cacao: '#5A3421', chocolate: '#5A3421',
  coffee: '#4A2E1F', anis: '#C6D39E', cherry: '#B01A2E', conifer: '#2F6B46',
  rum: '#7C3B1D', soapy: '#E1F0F4', sour: '#D7E36A', mineral: '#99A2A7',
  camphor: '#BDE2D4', whiskey: '#A45F2A', bitter: '#6D7B3B', savory: '#9C7A4E',
  beeswax: '#DDB04C', cannabis: '#4E7F2F', champagne: '#EFE2B0', terpenic: '#7FA05B',
  sand: '#D6C098', wine: '#7A1F3D', gourmand: '#C98B4A', spicy: '#CC5A2A',
  creamy: '#F0E4CC', resinous: '#A8692F', gourmet: '#C98B4A',
};
const FALLBACK_ACCORD = ['#C9A15A', '#A5673A', '#8E7A55', '#B68B4C', '#7D6A45'];

export function accordColor(name) {
  const key = String(name || '').toLowerCase();
  if (ACCORD_COLORS[key]) return ACCORD_COLORS[key];
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK_ACCORD[h % FALLBACK_ACCORD.length];
}

// Dark or light label text for a given fill, by relative luminance.
export function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? '#1A1207' : '#F5EEDD';
}

// Accords are listed strongest first but carry no weights; bars shrink by rank.
const ACCORD_WIDTHS = [100, 88, 78, 70, 63, 57, 52, 48, 44, 40];
export function accordWidth(rank) {
  return ACCORD_WIDTHS[Math.min(rank, ACCORD_WIDTHS.length - 1)];
}

/* ---------------- Note categories ----------------
 * Pyramid icons are coloured by what kind of material a note is. Rules are
 * checked in order, so specific phrases ("orange blossom", "violet leaf")
 * win over the generic word they contain. */
export const NOTE_CATEGORIES = {
  citrus:   { label: 'Citrus',   color: '#E8CF4F' },
  fruity:   { label: 'Fruity',   color: '#E07A5F' },
  floral:   { label: 'Floral',   color: '#D98FB0' },
  green:    { label: 'Green & herbs', color: '#7FB069' },
  spicy:    { label: 'Spices',   color: '#C8553D' },
  woody:    { label: 'Woods',    color: '#9A7650' },
  resin:    { label: 'Resins & amber', color: '#C98B3A' },
  gourmand: { label: 'Gourmand', color: '#D9A867' },
  musk:     { label: 'Musk & powder', color: '#C7B8D6' },
  aquatic:  { label: 'Aquatic',  color: '#6BB6D0' },
  leather:  { label: 'Leather & smoke', color: '#8A6A55' },
  other:    { label: 'Other',    color: '#B8A98A' },
};

const NOTE_RULES = [
  ['floral', ['orange blossom', 'cherry blossom', 'neroli', 'water lily', 'lily-of-the-valley', 'lily of the valley', 'apple blossom', 'peach blossom', 'lime blossom', 'linden']],
  ['green', ['violet leaf', 'fig leaf', 'tomato leaf', 'currant leaf', 'mate', 'tea', 'galbanum', 'bamboo', 'lemongrass', 'lemon verbena', 'verbena', 'petitgrain']],
  ['gourmand', ['coconut', 'almond', 'tonka', 'vanill', 'caramel', 'chocolate', 'cacao', 'cocoa', 'coffee', 'honey', 'praline', 'sugar', 'hazelnut', 'pistachio', 'candy', 'marshmallow', 'milk', 'cream', 'rum', 'whisk', 'cognac', 'liquor', 'licorice', 'maple', 'toffee', 'biscuit', 'bread', 'butter', 'nutmeg butter', 'meringue', 'chestnut', 'dulce']],
  ['leather', ['leather', 'suede', 'tobacco', 'smok', 'birch tar', 'tar', 'cade', 'gunpowder', 'burnt']],
  ['resin', ['amber', 'ambergris', 'ambroxan', 'labdanum', 'benzoin', 'frankincense', 'olibanum', 'incense', 'myrrh', 'opoponax', 'tolu', 'balsam', 'styrax', 'elemi', 'copal', 'resin', 'cistus']],
  ['citrus', ['lemon', 'bergamot', 'orange', 'mandarin', 'grapefruit', 'lime', 'yuzu', 'citron', 'tangerine', 'clementine', 'citrus', 'kumquat', 'pomelo', 'bitter orange']],
  ['fruity', ['apple', 'pear', 'peach', 'apricot', 'plum', 'cherry', 'raspberry', 'strawberry', 'blackberry', 'currant', 'cassis', 'pineapple', 'mango', 'melon', 'fig', 'lychee', 'litchi', 'passion', 'berr', 'grape', 'pomegranate', 'banana', 'quince', 'fruit', 'nectarine', 'guava', 'papaya', 'date', 'rhubarb', 'watermelon']],
  ['aquatic', ['sea', 'marine', 'water', 'aquatic', 'ozon', 'salt', 'seaweed', 'calone', 'rain', 'air', 'algae', 'mineral']],
  ['musk', ['musk', 'ambrette', 'civet', 'castoreum', 'powder', 'aldehyde', 'skin', 'cashmere', 'iso e', 'cotton']],
  ['spicy', ['pepper', 'cardamom', 'cinnamon', 'clove', 'nutmeg', 'saffron', 'ginger', 'cumin', 'coriander', 'anise', 'caraway', 'chili', 'spic', 'juniper', 'bay leaf', 'pimento', 'allspice']],
  ['woody', ['cedar', 'sandalwood', 'vetiver', 'patchouli', 'oud', 'agarwood', 'guaiac', 'birch', 'cypress', 'pine', 'fir', 'oak', 'moss', 'wood', 'cashmeran', 'cypriol', 'papyrus', 'ebony', 'teak', 'hinoki', 'gaiac', 'akigalawood', 'larch', 'truffle', 'mushroom', 'earth', 'soil', 'root']],
  ['floral', ['rose', 'jasmin', 'iris', 'orris', 'violet', 'peony', 'lily', 'tuberose', 'gardenia', 'ylang', 'magnolia', 'freesia', 'geranium', 'heliotrope', 'orchid', 'mimosa', 'osmanthus', 'carnation', 'lotus', 'frangipani', 'champaca', 'honeysuckle', 'lilac', 'hyacinth', 'narcissus', 'daffodil', 'cyclamen', 'sakura', 'flower', 'floral', 'tiare', 'plumeria', 'wisteria', 'petal', 'blossom', 'violet', 'jonquil', 'broom', 'immortelle', 'chamomile']],
  ['green', ['lavender', 'lavandin', 'mint', 'basil', 'sage', 'rosemary', 'thyme', 'green', 'grass', 'fern', 'artemisia', 'tarragon', 'eucalyptus', 'ivy', 'cucumber', 'herb', 'leaf', 'leaves', 'angelica', 'clary', 'hay', 'davana', 'wormwood', 'absinth']],
];

export function noteCategory(note) {
  const n = String(note || '').toLowerCase();
  for (const [cat, words] of NOTE_RULES) {
    if (words.some((w) => n.includes(w))) return cat;
  }
  return 'other';
}

/* ---------------- Bottle photos ---------------- */
// Fragrantica CDN: 375x500.<id>.jpg is the page photo, s.<id>.jpg a 125x140
// thumbnail. Parfumo's CDN resizes via query parameters.
export function photoUrl(url, size = 'full') {
  if (!url) return null;
  if (url.includes('fimgs.net/mdimg/perfume/')) {
    return size === 'thumb' ? url.replace('/375x500.', '/s.') : url;
  }
  if (url.includes('parfumo')) {
    const w = size === 'thumb' ? 120 : 400;
    return `${url}?width=${w}&aspect_ratio=1:1`;
  }
  return url;
}

/* ---------------- Names ---------------- */
// Catalog names are "Brand Perfume"; pages show the perfume large and the
// house above it, like Fragrantica. Curated names don't always spell the
// house the way the dataset does ("Lancome …" vs "Lancôme", "Dolce Gabbana …"
// vs "Dolce&Gabbana"), so the prefix is matched on folded words.
const fold = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function splitName(p) {
  const name = String(p?.name || '').trim();
  const brand = String(p?.brand || '').trim();
  const target = brand ? fold(brand) : '';
  if (target) {
    const words = name.split(/\s+/);
    let prefix = '';
    for (let i = 0; i < words.length - 1; i++) {
      prefix = fold(`${prefix} ${words[i]}`);
      if (prefix === target) return { brand, title: words.slice(i + 1).join(' ') };
      if (!target.startsWith(prefix)) break;
    }
  }
  return { brand: brand || null, title: name };
}

export const GENDER_LABEL = { women: 'for women', men: 'for men', unisex: 'for women and men' };
export const GENDER_GLYPH = { women: '♀', men: '♂', unisex: '⚥' };

/* ---------------- Character estimates ----------------
 * No per-bottle longevity/season votes exist in the data, so they are
 * estimated from the perfume's own accords: each accord maps to one of the
 * app's five families, family profiles are blended by accord rank, then the
 * concentration in the name nudges longevity and sillage. Rows without
 * accords fall back to their family's profile. */
const ACCORD_FAMILY = {
  fresh: ['citrus', 'fresh', 'fresh spicy', 'green', 'fruity', 'aquatic', 'marine', 'ozonic', 'tropical', 'aromatic', 'lavender', 'herbal', 'salty', 'mineral', 'metallic', 'soapy', 'anis', 'camphor', 'cherry', 'pear', 'sour', 'bitter', 'champagne', 'alcohol', 'vodka', 'sake', 'wine'],
  floral: ['floral', 'white floral', 'yellow floral', 'rose', 'violet', 'iris', 'tuberose', 'powdery', 'aldehydic'],
  woody: ['woody', 'earthy', 'mossy', 'patchouli', 'conifer', 'foresty', 'terpenic', 'leather', 'smoky', 'cannabis', 'sand', 'clay'],
  oriental: ['amber', 'warm spicy', 'soft spicy', 'balsamic', 'oud', 'animalic', 'cinnamon', 'spicy', 'resinous'],
  gourmand: ['sweet', 'vanilla', 'caramel', 'honey', 'cacao', 'chocolate', 'coffee', 'nutty', 'almond', 'coconut', 'lactonic', 'rum', 'whiskey', 'tobacco', 'milky', 'beeswax', 'coca-cola', 'gourmand', 'creamy'],
};
const FAMILY_OF_ACCORD = Object.fromEntries(
  Object.entries(ACCORD_FAMILY).flatMap(([fam, list]) => list.map((a) => [a, fam]))
);

// radar axes: Sweet · Spicy · Woody · Balsamic · Amber · Gourmand · Floral · Fresh
export const RADAR_AXES = ['SWEET', 'SPICY', 'WOODY', 'BALSAM', 'AMBER', 'GOURM.', 'FLORAL', 'FRESH'];
export const FAMILY_PROFILES = {
  fresh:    { radar: [3, 4, 3, 2, 2, 2, 5, 9], lon: 5, sil: 4, seasons: { Winter: 20, Spring: 90, Summer: 95, Fall: 45, Day: 95, Night: 40 } },
  floral:   { radar: [5, 4, 3, 3, 3, 4, 9, 5], lon: 6, sil: 5, seasons: { Winter: 40, Spring: 90, Summer: 70, Fall: 60, Day: 85, Night: 60 } },
  woody:    { radar: [3, 6, 9, 5, 6, 3, 3, 4], lon: 8, sil: 7, seasons: { Winter: 80, Spring: 55, Summer: 35, Fall: 90, Day: 70, Night: 80 } },
  gourmand: { radar: [9, 5, 3, 4, 6, 9, 3, 3], lon: 8, sil: 7, seasons: { Winter: 90, Spring: 45, Summer: 25, Fall: 85, Day: 60, Night: 85 } },
  oriental: { radar: [8, 7, 6, 7, 9, 6, 4, 3], lon: 9, sil: 8, seasons: { Winter: 95, Spring: 40, Summer: 20, Fall: 88, Day: 55, Night: 90 } },
};
const NEUTRAL = { radar: [5, 5, 5, 5, 5, 5, 5, 5], lon: 6, sil: 5, seasons: { Winter: 50, Spring: 50, Summer: 50, Fall: 50, Day: 50, Night: 50 } };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function estimateCharacter(p) {
  const weights = {};
  (p?.accords || []).slice(0, 8).forEach((a, i) => {
    const fam = FAMILY_OF_ACCORD[String(a).toLowerCase()];
    if (fam) weights[fam] = (weights[fam] || 0) + (8 - i);
  });
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let base;
  let basis;
  if (total > 0) {
    basis = 'accords';
    const mix = (pick) => Object.entries(weights).reduce((s, [fam, w]) => s + pick(FAMILY_PROFILES[fam]) * w, 0) / total;
    base = {
      radar: NEUTRAL.radar.map((_, i) => mix((f) => f.radar[i])),
      lon: mix((f) => f.lon),
      sil: mix((f) => f.sil),
      seasons: Object.fromEntries(Object.keys(NEUTRAL.seasons).map((k) => [k, mix((f) => f.seasons[k])])),
    };
  } else {
    basis = 'family';
    base = FAMILY_PROFILES[p?.tier] || NEUTRAL;
  }

  // Concentration named in the title.
  const n = String(p?.name || '').toLowerCase();
  let dl = 0, ds = 0;
  if (/\b(extrait|elixir|absolu|parfum|intense|oud)\b/.test(n)) { dl += 1; ds += 0.5; }
  if (/\b(cologne|eau fra[iî]che|body mist|hair mist|splash|mist|summer)\b/.test(n)) { dl -= 2; ds -= 1; }
  if (/\beau de toilette\b/.test(n)) { dl -= 0.5; }

  // Seasons as a share of the best-suited one, like Fragrantica's bars.
  const s = base.seasons;
  const top4 = Math.max(s.Winter, s.Spring, s.Summer, s.Fall) || 1;
  const top2 = Math.max(s.Day, s.Night) || 1;
  const seasons = {
    Winter: Math.round((s.Winter / top4) * 100),
    Spring: Math.round((s.Spring / top4) * 100),
    Summer: Math.round((s.Summer / top4) * 100),
    Fall: Math.round((s.Fall / top4) * 100),
    Day: Math.round((s.Day / top2) * 100),
    Night: Math.round((s.Night / top2) * 100),
  };

  return {
    basis,
    radar: base.radar.map((v) => Math.round(v * 10) / 10),
    lon: clamp(Math.round((base.lon + dl) * 10) / 10, 1, 10),
    sil: clamp(Math.round((base.sil + ds) * 10) / 10, 1, 10),
    seasons,
  };
}

/* ---------------- About paragraph ----------------
 * A Fragrantica-style summary written from the structured fields. */
function listText(items) {
  const xs = (items || []).filter(Boolean);
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export function describe(p) {
  const { brand, title } = splitName(p);
  const parts = [];
  const fam = p?.olfactory_family;
  const gender = GENDER_LABEL[p?.gender];
  const article = fam && /^[aeiou]/i.test(fam) ? 'an' : 'a';
  // "X by Y is a fragrance." says nothing; only open with it when there is a
  // family or gender to state.
  if (brand && (fam || gender)) {
    parts.push(`${title} by ${brand} is ${fam ? `${article} ${fam} ` : 'a '}fragrance${gender ? ` ${gender}` : ''}.`);
  }
  if (p?.year) parts.push(`${title} was launched in ${p.year}.`);
  const noses = p?.perfumers || [];
  if (noses.length === 1) parts.push(`The nose behind this fragrance is ${noses[0]}.`);
  if (noses.length > 1) parts.push(`The noses behind this fragrance are ${listText(noses)}.`);
  const levels = [
    ['Top notes', p?.top_notes],
    ['middle notes', p?.middle_notes],
    ['base notes', p?.base_notes],
  ].filter(([, xs]) => xs && xs.length);
  if (levels.length === 3) {
    parts.push(levels.map(([l, xs]) => `${l} ${xs.length > 1 ? 'are' : 'is'} ${listText(xs)}`).join('; ') + '.');
  } else if (levels.length > 0) {
    const all = levels.flatMap(([, xs]) => xs);
    parts.push(`Notes include ${listText(all.slice(0, 12))}.`);
  }
  return parts.join(' ');
}

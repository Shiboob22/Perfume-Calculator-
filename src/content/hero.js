// The Compounding's sixteen plates (Design/boards/Compounding.dc.html): the
// ingredients of one illustrative formula, weighed to 100.00 g. Catalogue
// numbers are the board's. Arabic names are the board's own (owner-approved
// design copy), not drafts.
//   [numeral, English, Arabic, catalogue, grams, form (en), form (ar)]
export const PLATES = Object.freeze([
  ["I", "Frankincense", "لبان", "K·014", 14.0, "resinoid", "راتنجي"],
  ["II", "Myrrh", "مُرّ", "K·022", 10.0, "resinoid", "راتنجي"],
  ["III", "Labdanum", "لادن", "K·031", 8.0, "absolute", "مطلق"],
  ["IV", "Cassia", "سليخة", "K·047", 3.0, "oil", "زيت"],
  ["V", "Juniper", "عرعر", "K·052", 4.0, "berry oil", "زيت ثمار"],
  ["VI", "Mastic", "مستكة", "K·058", 2.5, "oil", "زيت"],
  ["VII", "Honey", "عسل", "K·063", 6.0, "abs. 10%", "مطلق 10%"],
  ["VIII", "Raisin", "زبيب", "K·071", 5.0, "tincture", "صبغة"],
  ["IX", "Ambroxan", "أمبروكسان", "K·105", 6.5, "10% DPG", "10% DPG"],
  ["X", "Iso E Super", "إيزو إي سوبر", "K·112", 12.0, "neat", "صافٍ"],
  ["XI", "Hedione", "هيديون", "K·118", 9.0, "neat", "صافٍ"],
  ["XII", "Vanillin", "فانيلين", "K·124", 2.0, "10% DPG", "10% DPG"],
  ["XIII", "Oud", "عود", "K·131", 3.0, "10% EtOH", "10% كحول"],
  ["XIV", "Rose", "ورد", "K·140", 4.0, "absolute", "مطلق"],
  ["XV", "Cardamom", "هيل", "K·146", 2.0, "CO₂", "CO₂"],
  ["XVI", "Sandalwood", "صندل", "K·153", 9.0, "oil", "زيت"],
]);

/** The weight of the whole formula: 100.00 g. */
export const PLATES_TOTAL = PLATES.reduce((sum, p) => sum + p[4], 0);

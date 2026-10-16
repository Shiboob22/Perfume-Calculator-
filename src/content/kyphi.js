// The sixteen ingredients of kyphi, in the order Plutarch gives them
// (De Iside et Osiride 80): honey, wine, raisins, cyperus, resin, myrrh,
// aspalathus, seselis, mastic, bitumen, thryon, dock, the two arceuthos
// (large and small juniper), cardamom, calamus. Recorded recipes differ; this
// is the one list the scene follows, and it is a DRAFT for the owner to correct.
//
// `ar` is a draft for review (CLAUDE.md: Arabic needs the owner's review).
// `arCheck` marks the names where no common modern Arabic word is certain.
// `tone` is the colour each ingredient adds to the light (checkpoint 3).
export const KYPHI_SOURCE = "Plutarch, De Iside et Osiride 80";
export const KYPHI_NEEDS_REVIEW = true;

export const KYPHI_INGREDIENTS = Object.freeze([
  { id: "honey", en: "Honey", ar: "عسل", tone: "#D9A441" },
  { id: "wine", en: "Wine", ar: "نبيذ", tone: "#7B2D3B" },
  { id: "raisins", en: "Raisins", ar: "زبيب", tone: "#4A2A3A" },
  { id: "cyperus", en: "Cyperus", ar: "سعد", tone: "#7A8450" },
  { id: "resin", en: "Resin", ar: "راتنج", tone: "#C8893A" },
  { id: "myrrh", en: "Myrrh", ar: "مُرّ", tone: "#8C3B2A" },
  { id: "aspalathus", en: "Aspalathus", ar: "أسبالاثوس", tone: "#8A6A3A", arCheck: true },
  { id: "seselis", en: "Seselis", ar: "سيسيلس", tone: "#9AA35F", arCheck: true },
  { id: "mastic", en: "Mastic", ar: "مستكة", tone: "#D8D09A" },
  { id: "bitumen", en: "Bitumen", ar: "قار", tone: "#2B2520" },
  { id: "thryon", en: "Thryon", ar: "ثريون", tone: "#7D8F5C", arCheck: true },
  { id: "dock", en: "Dock", ar: "حُمَّاض", tone: "#6E7B3F" },
  { id: "juniper-large", en: "Juniper, large", ar: "عرعر كبير", tone: "#4F6B5A" },
  { id: "juniper-small", en: "Juniper, small", ar: "عرعر صغير", tone: "#5E7D6A" },
  { id: "cardamom", en: "Cardamom", ar: "هيل", tone: "#A8A06A" },
  { id: "calamus", en: "Calamus", ar: "قصب الذريرة", tone: "#B7A56A" },
]);

const ROMAN = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
/** 1 → "I", 16 → "XVI". */
export function roman(n) {
  let out = "";
  let rest = n;
  for (const [v, s] of ROMAN) while (rest >= v) { out += s; rest -= v; }
  return out;
}

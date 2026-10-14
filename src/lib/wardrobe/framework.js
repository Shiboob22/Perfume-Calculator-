// The Wardrobe method as data (owner's Scent Handbook, Vol. II, Parts II and
// VI to IX, XI, XIV, XIX): the Five Wardrobes as categories, the temperature
// bands, the occasion list, the social-distance bands, the decision tree.
// Only the structure lives here. Labels and explanations are in the message
// catalogues (wardrobe.*), and no bottle of the owner's is named anywhere:
// users place their own bottles. No imports: the tests and pages read it.

// Part II: A Clean/Professional, B Refined luxury, C Dark and sensual,
// D Social/attention, E Artistic/unusual. A bottle may sit in two.
export const CLUSTERS = ["clean", "luxury", "dark", "social", "artistic"];

// Part XIV: how far a fragrance reaches, nearest first.
export const PROJECTIONS = ["intimate", "personal", "social", "statement"];

export const FAMILIES = ["fresh", "floral", "woody", "oriental", "gourmand"];

export const TIMES = ["morning", "day", "evening", "night"];

// Part VII. `clusters` are the wardrobes that serve the situation, best first;
// `ceiling` is the furthest projection that still suits it, from the rule of
// restraint: the more enclosed, formal or professional, the more controlled.
export const OCCASIONS = [
  { id: "professional", clusters: ["clean"], ceiling: "personal" },
  { id: "client_meeting", clusters: ["clean", "luxury"], ceiling: "personal" },
  { id: "smart_casual", clusters: ["luxury", "clean"], ceiling: "social" },
  { id: "date", clusters: ["dark", "luxury"], ceiling: "social" },
  { id: "formal_evening", clusters: ["dark", "luxury"], ceiling: "social" },
  { id: "nightlife", clusters: ["social", "dark"], ceiling: "statement" },
  { id: "creative", clusters: ["artistic"], ceiling: "social" },
  { id: "relaxed", clusters: ["clean", "artistic"], ceiling: "personal" },
];

// Part VI. The bands as the handbook gives them: 30°C and above, 20 to 30,
// 15 to 20, below 15. A temperature on a boundary belongs to the warmer band.
export const TEMP_BANDS = ["hot", "warm", "mild", "cool"];

export function tempBand(tempC) {
  // Number("") and Number(null) are 0: a blank is no temperature, not 0 °C.
  if (tempC == null || (typeof tempC === "string" && tempC.trim() === "")) return null;
  const t = Number(tempC);
  if (!Number.isFinite(t)) return null;
  if (t >= 30) return "hot";
  if (t >= 20) return "warm";
  if (t >= 15) return "mild";
  return "cool";
}

// Part VIII, in order. The picker answers the first three questions and the
// last from the user's own bottles; clothing and message are the person's.
export const DECISION_STEPS = ["weather", "time", "place", "clothing", "message", "projection"];

// Which wardrobe a bottle falls into when its owner hasn't said: a rough
// reading of its family. Shown as inferred, never as the owner's own tag.
export const INFERRED_CLUSTER = { fresh: "clean", floral: "clean", woody: "luxury", oriental: "dark", gourmand: "social" };

export const projectionRank = (p) => Math.max(0, PROJECTIONS.indexOf(p));

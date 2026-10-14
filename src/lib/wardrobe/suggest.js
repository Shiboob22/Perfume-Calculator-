// What to wear: the Wardrobe method's decision tree run on the user's own
// bottles. Pure and explained: every point of the score comes with a reason
// the screen can state. The direction of each rule is the handbook's (hot:
// fresh, tea, citrus; cool: amber, tobacco, vanilla; the rule of restraint;
// rotation discipline). The point values are Kyphira's reading of it, so the
// result is a short ranked list with its reasons, never a single verdict.
import { INFERRED_CLUSTER, OCCASIONS, projectionRank, tempBand } from "./framework.js";

const WEATHER = {
  hot: { fresh: 3, floral: 1, woody: 0, oriental: -3, gourmand: -3 },
  warm: { fresh: 1, floral: 1, woody: 1, oriental: 0, gourmand: 0 },
  mild: { fresh: 0, floral: 0, woody: 1, oriental: 1, gourmand: 1 },
  cool: { fresh: -2, floral: -1, woody: 1, oriental: 3, gourmand: 3 },
};
// Morning and day: cleaner. Evening: richer. Late night: stronger is allowed.
const TIME = {
  morning: { fresh: 1, floral: 0, woody: 0, oriental: -1, gourmand: -1 },
  day: { fresh: 1, floral: 0, woody: 0, oriental: -1, gourmand: -1 },
  evening: { fresh: -1, floral: 0, woody: 0, oriental: 1, gourmand: 1 },
  night: { fresh: -1, floral: 0, woody: 0, oriental: 1, gourmand: 1 },
};
const CLUSTER_POINTS = [3, 2];     // the occasion's first and second wardrobe
const INFERRED_FACTOR = 0.5;       // a guess from the family counts half
const OVER_CEILING = 4;            // per band beyond what the place suits
const WORN_TODAY = 3, WORN_RECENTLY = 2, RECENT_DAYS = 3, RESTED_DAYS = 14;

const DAY = 86400000;
const daysBetween = (from, to) => Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

/** Bottles that can be worn: owned or sampled, not on the wish list, not empty. */
export const wearable = (bottles) => (bottles || []).filter((b) => b.status !== "wishlist" && !(b.fill_pct != null && Number(b.fill_pct) <= 0));

/**
 * Rank the user's wearable bottles for a situation.
 * @param bottles rows of wardrobe_bottles
 * @param wear rows of wear_log (any length; only the dates and bottle ids are read)
 * @param ctx { tempC?, time?, occasion?, today: "YYYY-MM-DD" }
 * @returns [{ bottle, score, reasons: [{ key, ...params }], tooStrong }] best first
 */
export function suggest(bottles, wear, { tempC, time, occasion, today }) {
  const band = tempBand(tempC);
  const occ = OCCASIONS.find((o) => o.id === occasion) ?? null;
  const lastWorn = new Map();
  for (const w of wear || []) if (!lastWorn.has(w.bottle_id) || w.worn_on > lastWorn.get(w.bottle_id)) lastWorn.set(w.bottle_id, w.worn_on);

  const ranked = wearable(bottles).map((bottle) => {
    const reasons = [];
    let score = 0;
    const add = (points, reason) => { if (points) { score += points; reasons.push({ ...reason, points }); } };
    const family = bottle.family;

    if (band && family) add(WEATHER[band][family] ?? 0, { key: "weather", band, family });
    if (time && family) add(TIME[time]?.[family] ?? 0, { key: "time", time, family });

    let tooStrong = false;
    if (occ) {
      const own = bottle.clusters?.length ? bottle.clusters : null;
      const mine = own ?? (family ? [INFERRED_CLUSTER[family]] : []);
      const factor = own ? 1 : INFERRED_FACTOR;
      const hit = occ.clusters.findIndex((c) => mine.includes(c));
      if (hit >= 0) add(CLUSTER_POINTS[Math.min(hit, 1)] * factor, { key: "cluster", cluster: occ.clusters[hit], inferred: !own });
      const over = projectionRank(bottle.projection ?? "personal") - projectionRank(occ.ceiling);
      if (over > 0) { tooStrong = true; add(-OVER_CEILING * over, { key: "tooStrong", projection: bottle.projection ?? "personal", ceiling: occ.ceiling }); }
    }

    const last = lastWorn.get(bottle.id);
    if (last && today) {
      const days = daysBetween(last, today);
      if (days <= 0) add(-WORN_TODAY, { key: "wornToday" });
      else if (days <= RECENT_DAYS) add(-WORN_RECENTLY, { key: "wornRecently", days });
      else if (days >= RESTED_DAYS) add(1, { key: "rested", days });
    } else if (!last) {
      add(1, { key: "neverWorn" });
    }
    return { bottle, score, reasons, tooStrong };
  });

  // Best first; ties go to the bottle worn longest ago, then by name, so the
  // order is stable and favours rotation.
  return ranked.sort((a, b) =>
    b.score - a.score
    || String(lastWorn.get(a.bottle.id) ?? "").localeCompare(String(lastWorn.get(b.bottle.id) ?? ""))
    || a.bottle.name.localeCompare(b.bottle.name));
}

/** The spraying advice for a temperature: the handbook's principle, plus fewer sprays in heat. */
export function sprayAdvice(tempC) {
  return tempBand(tempC) === "hot" ? "fewerInHeat" : "lessThanInstinct";
}

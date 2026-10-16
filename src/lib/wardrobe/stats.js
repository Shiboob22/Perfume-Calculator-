// Wardrobe statistics: pure functions over bottles and wear rows.
import { tempBand } from "./framework.js";

const DAY = 86400000;
const dayNumber = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY);

/** bottle id → number of wearings. */
export function wearCounts(wear) {
  const out = new Map();
  for (const w of wear || []) out.set(w.bottle_id, (out.get(w.bottle_id) ?? 0) + 1);
  return out;
}

/** The `n` most and least worn of the bottles you own (a never-worn bottle counts as zero), ties by name. */
export function mostLeast(bottles, wear, n = 3) {
  const counts = wearCounts(wear);
  const owned = (bottles || []).filter((b) => b.status === "owned")
    .map((b) => ({ bottle: b, wears: counts.get(b.id) ?? 0 }))
    .sort((a, b) => b.wears - a.wears || a.bottle.name.localeCompare(b.bottle.name));
  const most = owned.filter((x) => x.wears > 0).slice(0, n);
  const least = [...owned].reverse().slice(0, n).sort((a, b) => a.wears - b.wears || a.bottle.name.localeCompare(b.bottle.name));
  return { most, least };
}

/** Calendar season of an ISO date. The hemisphere only flips the seasons. */
export function seasonOf(iso, hemisphere = "north") {
  const m = Number(iso.slice(5, 7));
  const north = m === 12 || m <= 2 ? "winter" : m <= 5 ? "spring" : m <= 8 ? "summer" : "autumn";
  if (hemisphere === "north") return north;
  return { winter: "summer", summer: "winter", spring: "autumn", autumn: "spring" }[north];
}

/** Wearings per season, and per temperature band for those that recorded one. */
export function bySeason(wear, hemisphere = "north") {
  const seasons = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  const bands = { hot: 0, warm: 0, mild: 0, cool: 0 };
  for (const w of wear || []) {
    seasons[seasonOf(w.worn_on, hemisphere)] += 1;
    const b = tempBand(w.temp_c);
    if (b && w.temp_c != null) bands[b] += 1;
  }
  return { seasons, bands };
}

/** Wearings per occasion tag (untagged wearings are left out). */
export function byOccasion(wear) {
  const out = {};
  for (const w of wear || []) if (w.occasion) out[w.occasion] = (out[w.occasion] ?? 0) + 1;
  return out;
}

/** What each wearing has cost so far: price over wearings, or null without a price or a wearing. */
export function costPerWear(bottle, wears) {
  const price = Number(bottle?.price);
  return price > 0 && wears > 0 ? price / wears : null;
}

/** Owned bottles at or below a fill level (default 15%), lowest first; bottles with no level are skipped. */
export function runningLow(bottles, threshold = 15) {
  return (bottles || [])
    .filter((b) => b.status === "owned" && b.fill_pct != null && Number(b.fill_pct) <= threshold)
    .sort((a, b) => Number(a.fill_pct) - Number(b.fill_pct) || a.name.localeCompare(b.name));
}

/** Days since the last wearing (null if never), for "not worn in 60 days". */
export function daysSinceWorn(bottleId, wear, today) {
  let last = null;
  for (const w of wear || []) if (w.bottle_id === bottleId && (last === null || w.worn_on > last)) last = w.worn_on;
  return last === null ? null : dayNumber(today) - dayNumber(last);
}

/** The most recent wearing's date for a bottle (ISO), or null. */
export function lastWornOn(wear, bottleId) {
  let last = null;
  for (const w of wear || []) if (w.bottle_id === bottleId && (!last || w.worn_on > last)) last = w.worn_on;
  return last;
}

/** Whole days from an ISO date to `today` (never negative). */
export function daysSince(iso, today) {
  if (!iso) return null;
  return Math.max(0, dayNumber(today) - dayNumber(iso));
}

/** A length of time as { unit: "d" | "mo" | "yr", value }: days under 60, months under 2 years, else years (one decimal). */
export function ageParts(days) {
  if (days == null) return null;
  if (days < 60) return { unit: "d", value: days };
  if (days < 730) return { unit: "mo", value: Math.round(days / 30.4) };
  return { unit: "yr", value: Math.round((days / 365.25) * 10) / 10 };
}

/** Millilitres left in a bottle: fill level × size, or null when either is unknown. */
export function remainingMl(bottle) {
  if (bottle.size_ml == null || bottle.fill_pct == null) return null;
  return Math.round(Number(bottle.size_ml) * Number(bottle.fill_pct)) / 100;
}

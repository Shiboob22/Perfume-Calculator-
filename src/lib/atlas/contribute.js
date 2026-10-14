// The "suggest a fragrance" form → the atlas_submit payload. The rules mirror
// the function's own (0025), so a mistake is named in the form instead of
// refused by the database.
import { cleanName } from "../cleanName.js";
import { FAMILIES } from "../wardrobe/framework.js";

export const LIMITS = { top: 15, heart: 15, base: 15, accords: 12, perfumers: 5, item: 60 };

/** "bergamot, lemon\npink pepper" → ["bergamot", "lemon", "pink pepper"] (trimmed, no repeats, at most `max`). */
export function splitList(raw, max, item = LIMITS.item) {
  const seen = new Set();
  const out = [];
  for (const part of String(raw ?? "").split(/[,\n;،]+/)) {
    const v = part.replace(/\s+/g, " ").trim().slice(0, item);
    const k = v.toLowerCase();
    if (v && !seen.has(k)) { seen.add(k); out.push(v); if (out.length >= max) break; }
  }
  return out;
}

const thisYear = (now = new Date()) => now.getFullYear();

/** Form values → { payload } or { errors: [field, ...] }. */
export function contributionPayload(form, now = new Date()) {
  const errors = [];
  const name = cleanName(form.name);
  if (!name || name.length > 120) errors.push("name");
  const brand = cleanName(form.brand);
  if (brand && brand.length > 120) errors.push("brand");
  if (!FAMILIES.includes(form.tier)) errors.push("tier");
  let year = null;
  if (String(form.year ?? "").trim() !== "") {
    year = Number(form.year);
    if (!Number.isInteger(year) || year < 1700 || year > thisYear(now) + 1) errors.push("year");
  }
  const gender = form.gender || null;
  if (gender && !["women", "men", "unisex"].includes(gender)) errors.push("gender");
  const country = String(form.country ?? "").trim();
  if (country.length > 60) errors.push("country");
  if (errors.length) return { errors };
  return {
    payload: {
      name, brand: brand || null, tier: form.tier, year, gender, country: country || null,
      top_notes: splitList(form.top, LIMITS.top), middle_notes: splitList(form.heart, LIMITS.heart), base_notes: splitList(form.base, LIMITS.base),
      accords: splitList(form.accords, LIMITS.accords), perfumers: splitList(form.perfumers, LIMITS.perfumers),
    },
  };
}

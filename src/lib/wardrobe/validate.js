// Checks on what the Wardrobe forms send, mirroring the table constraints
// (0024) so a bad value is named in the form, not refused by the database.
import { cleanName } from "../cleanName.js";
import { CLUSTERS, FAMILIES, OCCASIONS, PROJECTIONS, TIMES } from "./framework.js";

const STATUSES = ["owned", "wishlist", "tested"];
const KINDS = ["bottle", "decant"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const blank = (v) => v == null || (typeof v === "string" && v.trim() === "");
const validDate = (v) => DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

// `today` is "YYYY-MM-DD" (the user's day), so a date can't be in the future.
function number(form, key, { min, max, whole = false, minExclusive = false }, row, errors) {
  const v = form[key];
  if (blank(v)) { row[key] = null; return; }
  const n = Number(v);
  const ok = Number.isFinite(n) && n <= max && (minExclusive ? n > min : n >= min) && (!whole || Number.isInteger(n));
  if (ok) row[key] = n; else errors.push(key);
}

/** The wardrobe_bottles row for a form, or { errors: [field, ...] }. */
export function bottleRow(form, today) {
  const errors = [];
  const row = {};
  const name = cleanName(form.name);
  if (!name || name.length > 120) errors.push("name"); else row.name = name;
  row.status = form.status ?? "owned";
  if (!STATUSES.includes(row.status)) errors.push("status");
  row.kind = form.kind ?? "bottle";
  if (!KINDS.includes(row.kind)) errors.push("kind");
  row.family = blank(form.family) ? null : form.family;
  if (row.family && !FAMILIES.includes(row.family)) errors.push("family");
  row.projection = blank(form.projection) ? null : form.projection;
  if (row.projection && !PROJECTIONS.includes(row.projection)) errors.push("projection");
  row.clusters = Array.isArray(form.clusters) ? [...new Set(form.clusters)] : [];
  if (!row.clusters.every((c) => CLUSTERS.includes(c))) errors.push("clusters");
  number(form, "size_ml", { min: 0, max: 5000, minExclusive: true }, row, errors);
  number(form, "fill_pct", { min: 0, max: 100 }, row, errors);
  number(form, "price", { min: 0, max: 1e7 }, row, errors);
  if (blank(form.purchase_date)) row.purchase_date = null;
  else if (!validDate(form.purchase_date) || (today && form.purchase_date > today)) errors.push("purchase_date");
  else row.purchase_date = form.purchase_date;
  row.currency = blank(form.currency) ? null : String(form.currency).toUpperCase();
  if (row.currency && !/^[A-Z]{3}$/.test(row.currency)) errors.push("currency");
  const note = typeof form.note === "string" ? form.note.trim() : "";
  if (note.length > 500) errors.push("note"); else row.note = note || null;
  row.fragrance_id = blank(form.fragrance_id) ? null : form.fragrance_id;
  return errors.length ? { errors } : { row };
}

/** The wear_log row for a form, or { errors }. */
export function wearRow(form, today) {
  const errors = [];
  const row = {};
  if (typeof form.bottle_id !== "string" || !form.bottle_id) errors.push("bottle_id"); else row.bottle_id = form.bottle_id;
  const day = blank(form.worn_on) ? today : form.worn_on;
  if (!validDate(day) || (today && day > today)) errors.push("worn_on"); else row.worn_on = day;
  row.occasion = blank(form.occasion) ? null : form.occasion;
  if (row.occasion && !OCCASIONS.some((o) => o.id === row.occasion)) errors.push("occasion");
  row.time_of_day = blank(form.time_of_day) ? null : form.time_of_day;
  if (row.time_of_day && !TIMES.includes(row.time_of_day)) errors.push("time_of_day");
  number(form, "temp_c", { min: -50, max: 60 }, row, errors);
  number(form, "sprays", { min: 0, max: 50, whole: true }, row, errors);
  const note = typeof form.note === "string" ? form.note.trim() : "";
  if (note.length > 300) errors.push("note"); else row.note = note || null;
  return errors.length ? { errors } : { row };
}

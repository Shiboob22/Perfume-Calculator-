// What the Salon checks before anything is sent, mirroring migration 0026 so a
// person is told what is wrong before the database says no. Pure: the forms
// call these and only show the result. The database stays the authority.
import { latestVersion } from "../recipes.js";
import { UNIT_LABELS } from "../calcPrefill.js";

export const HANDLE_RE = /^[a-z0-9_]{3,30}$/;
export const LIMITS = { name: 60, bio: 300, title: 100, body: 1500, note: 300 };
export const REASONS = ["spam", "abuse", "unsafe", "other"];
export const KINDS = ["recipe", "review"];

// Same shape as salon_has_link() in the migration: a web address, a www, an
// email, or a bare domain on a common ending. No links anywhere in the Salon.
const LINK = /(https?:|www\.|@[a-z0-9-]+\.[a-z]|[a-z0-9-]\.(com|net|org|io|co|shop|store|ru|xyz|info|biz|me|ly|app|link)([^a-z]|$))/i;
export const hasLink = (text) => LINK.test(String(text ?? ""));

/** "  @Ada_Perfumes " → "ada_perfumes". */
export function cleanHandle(raw) {
  return String(raw ?? "").trim().replace(/^@+/, "").toLowerCase();
}

const text = (v) => String(v ?? "").trim();

/** { value } for the profile row, or { errors: [field…] }. Blank name and bio become null. */
export function profileRow({ handle, displayName, bio, isPublic }) {
  const errors = [];
  const h = cleanHandle(handle);
  const name = text(displayName);
  const about = text(bio);
  if (!HANDLE_RE.test(h)) errors.push("handle");
  if (name.length > LIMITS.name || hasLink(name)) errors.push("displayName");
  if (about.length > LIMITS.bio || hasLink(about)) errors.push("bio");
  if (errors.length) return { errors };
  return { value: { handle: h, display_name: name || null, bio: about || null, is_public: !!isPublic } };
}

/** The numbers a recipe post carries: nothing but the blend itself. */
export function snapshotFromVersion(version) {
  if (!version) return null;
  const out = { amount: Number(version.amount), unit: version.unit, concentration_pct: Number(version.concentration_pct) };
  if (Number(version.oil_density) > 0) out.oil_density = Number(version.oil_density);
  if (Number(version.ethanol_density) > 0) out.ethanol_density = Number(version.ethanol_density);
  return out;
}

/** The latest version of a saved recipe as a post snapshot, or null. */
export const snapshotFromRecipe = (recipe) => snapshotFromVersion(latestVersion(recipe));

/** { value } for the post row, or { errors: [field…] }. */
export function postRow({ kind, title, body, family, snapshot, fragranceId, rating }) {
  const errors = [];
  const ti = text(title);
  const bo = text(body);
  if (!KINDS.includes(kind)) errors.push("kind");
  if (!ti || ti.length > LIMITS.title || hasLink(ti)) errors.push("title");
  if (bo.length > LIMITS.body || hasLink(bo)) errors.push("body");
  if (kind === "recipe" && !snapshot) errors.push("recipe");
  if (kind === "review") {
    if (!fragranceId) errors.push("fragrance");
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) errors.push("rating");
  }
  if (errors.length) return { errors };
  const row = { kind, title: ti, body: bo || null };
  if (kind === "recipe") { row.snapshot = snapshot; row.family = family || null; }
  else { row.fragrance_id = fragranceId; row.rating = Number(rating); }
  return { value: row };
}

/** A recipe post's blend as plain text: "100 mL at 25%". */
export function recipeLine(snapshot) {
  if (!snapshot) return "";
  return `${snapshot.amount} ${UNIT_LABELS[snapshot.unit] ?? snapshot.unit} · ${snapshot.concentration_pct}%`;
}

/** The Bench link that opens a recipe post's blend. */
export function benchHref(post) {
  const s = post.snapshot ?? {};
  const q = new URLSearchParams();
  if (s.amount) q.set("size", String(s.amount));
  if (s.unit) q.set("unit", s.unit);
  if (s.concentration_pct) q.set("conc", String(s.concentration_pct));
  if (post.family) q.set("family", post.family);
  q.set("name", String(post.title ?? "").slice(0, 80));
  return `/bench?${q.toString()}`;
}

/** A person as shown on a card: the chosen name, else @handle. */
export const authorName = (p) => p.display_name || `@${p.handle}`;

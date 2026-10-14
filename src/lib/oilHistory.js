// A user's earlier batches of one oil, for "Make again" and the
// calculator's history panel. Nothing new is computed: the strength comes
// from actualStrength, the best day from peakDay (the journal's own rule).
import { actualStrength, peakDay } from "./calc";
import { TIERS } from "./tiers";
import { cleanName } from "./cleanName.js";

/** The settings a batch was made with, as the calculator takes them. */
export function batchSettings(b) {
  const entered = Number(b.amount) > 0 && ["ml", "floz", "g", "oz"].includes(b.unit);
  const byWeight = b.basis === "weight";
  return {
    family: TIERS[b.tier] ? b.tier : null,
    conc: Number(b.concentration_pct) || null,
    size: entered ? Number(b.amount) : Number(byWeight ? b.total_g : b.total_ml) || null,
    unit: entered ? b.unit : byWeight ? "g" : "ml",
    name: cleanName(b.fragrance_name),
  };
}

/** A calculator link that starts a new batch with this one's settings. */
export function makeAgainHref(b) {
  const s = batchSettings(b);
  const q = new URLSearchParams();
  for (const k of ["size", "unit", "conc", "family", "name"]) if (s[k] != null) q.set(k, String(s[k]));
  // The recipe version it was made from: the calculator reopens it if it is still there.
  if (b.recipe_version_id) q.set("recipe", b.recipe_version_id);
  return `/bench?${q}`;
}

const sameName = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

/**
 * The last `limit` batches of the oil (by catalog id, or by name for
 * batches logged without one), newest first, each with its settings, the
 * strength actually poured (or null) and the journal's best day (or null).
 */
export function oilHistory(batches, { fragranceId = null, name = "" } = {}, limit = 5) {
  if (!fragranceId && !name.trim()) return [];
  return (batches || [])
    .filter((b) => (fragranceId && b.fragrance_id === fragranceId) || (!b.fragrance_id && sameName(b.fragrance_name, name)))
    .sort((a, b) => String(b.blend_date).localeCompare(String(a.blend_date)) || String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit)
    .map((b) => ({
      id: b.id,
      date: b.blend_date,
      settings: batchSettings(b),
      poured: actualStrength(b)?.pct ?? null,
      peak: peakDay(b.batch_checkins || []),
    }));
}

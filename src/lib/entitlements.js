// Plans and feature gates, shared by the browser and the /api functions so
// both answer "may this user do X?" the same way. The plan data itself
// (features, batch cap) lives in the `plans` table; this file only reads it.

export const FEATURES = [
  "batches.unlimited",
  "inventory",
  "ai.ask",
  "export.labels",
  "calculator.advanced",
  "cards.download",
];

// What a user gets when no plan row can be loaded: Free, with nothing extra.
export const FALLBACK = Object.freeze({ plan: "free", name: "Free", features: [], batchCap: 25 });

// Normalise a `plans` row (snake_case, from the database) into entitlements.
export function fromPlanRow(row) {
  if (!row) return FALLBACK;
  return {
    plan: row.id,
    name: row.name,
    features: Array.isArray(row.features) ? row.features : [],
    batchCap: row.batch_cap ?? null,
  };
}

export function can(entitlements, feature) {
  return Boolean(entitlements?.features?.includes(feature));
}

// Saved batches still allowed, or Infinity when the plan has no cap.
export function batchesLeft(entitlements, used) {
  if (can(entitlements, "batches.unlimited") || entitlements?.batchCap == null) return Infinity;
  return Math.max(entitlements.batchCap - (Number(used) || 0), 0);
}

export function canLogBatch(entitlements, used) {
  return batchesLeft(entitlements, used) > 0;
}

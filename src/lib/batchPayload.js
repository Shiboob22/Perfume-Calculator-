// The row POST /api/batches gets for a logged batch: one shape for the
// calculator and for bench mode, so the two can't drift apart.
const pos = (v) => (Number(v) > 0 ? Number(v) : null);
const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The oil a batch used: what was poured when recorded, else the target. */
export function usedOil(target, actualOilG) {
  return pos(actualOilG) ?? target.exact.oilG;
}

const CURRENCY = /^[A-Z]{3}$/;
// The seller fields (0022). Left out entirely unless `seller` is given, so a
// plan without them never sends stale ones from an old draft.
function sellerFields(seller) {
  if (!seller) return {};
  const bottles = Math.floor(Number(seller.bottles));
  return {
    ethanol_price_per_l: pos(seller.ethanolPricePerL),
    bottle_cost: pos(seller.bottleCost),
    bottles: bottles > 0 ? bottles : null,
    packaging_cost: pos(seller.packagingCost),
    labour_minutes: pos(seller.labourMinutes),
    labour_rate_per_hour: pos(seller.labourRate),
    sale_price: pos(seller.salePrice),
    currency: CURRENCY.test(seller.currency) ? seller.currency : null,
  };
}

/**
 * `target` is the solved bottle ({ exact, basis }), `densities` the
 * { oil, ethanol } it was solved with. Optional fields left out are null.
 * Without an `oilCost`, the cost is the oil used times the price per gram.
 */
export function buildBatch({
  id, fragranceId, name, tier, blendDate, concPct, target, densities,
  actualOilG, actualEthG, oilType, pricePerGram, oilCost, notes, blendedBy, lot, amount, unit, seller, recipeVersionId,
}) {
  const e = target.exact;
  // A density left blank was replaced by a fallback to compute; the batch
  // records only a density the user really entered (null reads as unknown).
  const blank = new Set((target.warnings || []).map((w) => w.code));
  const price = pos(pricePerGram);
  const cost = oilCost === undefined ? (price ? usedOil(target, actualOilG) * price : null) : oilCost;
  return {
    id,
    fragrance_id: fragranceId || null,
    fragrance_name: name,
    tier,
    blend_date: blendDate,
    concentration_pct: Number(concPct),
    oil_g: e.oilG, oil_ml: e.oilMl,
    ethanol_g: e.ethanolG, ethanol_ml: e.ethanolMl,
    total_g: e.totalG, total_ml: e.totalMl,
    oil_type: text(oilType),
    price_per_gram: price,
    oil_cost: Number.isFinite(cost) ? cost : null,
    notes: text(notes),
    blended_by: text(blendedBy),
    actual_oil_g: pos(actualOilG),
    actual_ethanol_g: pos(actualEthG),
    basis: target.basis,
    oil_density: blank.has("oil_density_missing") ? null : densities.oil,
    ethanol_density: blank.has("ethanol_density_missing") ? null : densities.ethanol,
    lot: text(lot),
    amount: pos(amount),
    unit: unit || null,
    ...sellerFields(seller),
    // The API keeps it only if the version is the caller's (0023).
    ...(recipeVersionId ? { recipe_version_id: recipeVersionId } : {}),
  };
}

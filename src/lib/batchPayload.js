// The row POST /api/batches gets for a logged batch: one shape for the
// calculator and for bench mode, so the two can't drift apart.
const pos = (v) => (Number(v) > 0 ? Number(v) : null);
const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * `target` is the solved bottle ({ exact, basis }), `densities` the
 * { oil, ethanol } it was solved with. Optional fields left out are null.
 */
export function buildBatch({
  id, fragranceId, name, tier, blendDate, concPct, target, densities,
  actualOilG, actualEthG, oilType, pricePerGram, oilCost, notes, blendedBy,
}) {
  const e = target.exact;
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
    price_per_gram: pos(pricePerGram),
    oil_cost: Number.isFinite(oilCost) ? oilCost : null,
    notes: text(notes),
    blended_by: text(blendedBy),
    actual_oil_g: pos(actualOilG),
    actual_ethanol_g: pos(actualEthG),
    basis: target.basis,
    oil_density: densities.oil,
    ethanol_density: densities.ethanol,
  };
}

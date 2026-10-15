// The row POST /api/batches gets for a logged batch: one shape for the
// calculator and for bench mode, so the two can't drift apart.
const pos = (v) => (Number(v) > 0 ? Number(v) : null);
const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The oil a batch used: what was poured when recorded, else the target. */
export function usedOil(target, actualOilG) {
  return pos(actualOilG) ?? target.exact.oilG;
}

/**
 * The densities a batch records: only ones the user gave. A blank field is
 * calculated with a fallback (and warned about), but the fallback is not the
 * user's measurement, so it is stored as null. `result` is calculate()'s answer.
 */
export function storedDensities(result) {
  const blank = (code) => result.warnings.some((w) => w.code === code);
  return {
    oil: blank("oil_density_missing") ? null : result.densities.oil,
    ethanol: blank("ethanol_density_missing") ? null : result.densities.ethanol,
  };
}

/**
 * The cost and sale figures a batch was priced with (Pro; the server drops
 * them on a plan without them). `seller` holds the form's values, or is left
 * out on Free; blank means not given and is sent as null.
 */
export function sellerColumns(seller) {
  const s = seller || {};
  const cur = typeof s.currency === "string" && /^[A-Za-z]{3}$/.test(s.currency) ? s.currency.toUpperCase() : null;
  const bottles = Math.floor(Number(s.bottles));
  return {
    ethanol_price_per_l: pos(s.ethanolPricePerL),
    bottle_cost: pos(s.bottleCost),
    bottles: bottles > 0 ? bottles : null,
    packaging_cost: pos(s.packagingCost),
    labour_minutes: pos(s.labourMinutes),
    labour_rate: pos(s.labourRate),
    sale_price: pos(s.salePrice),
    currency: cur,
  };
}

/**
 * `target` is the solved bottle ({ exact, basis }), `densities` the
 * { oil, ethanol } it was solved with. Optional fields left out are null.
 * Without an `oilCost`, the cost is the oil used times the price per gram.
 */
export function buildBatch({
  id, fragranceId, name, tier, blendDate, concPct, target, densities,
  actualOilG, actualEthG, oilType, pricePerGram, oilCost, notes, blendedBy, lot, amount, unit, seller,
}) {
  const e = target.exact;
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
    oil_density: densities.oil,
    ethanol_density: densities.ethanol,
    lot: text(lot),
    amount: pos(amount),
    unit: unit || null,
    ...sellerColumns(seller),
  };
}

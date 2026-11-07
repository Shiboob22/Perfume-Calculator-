// What a batch costs: oil by the gram, ethanol by the litre, bottles and
// packaging per bottle, and the maker's time. Then what it earns when sold.
export interface Prices {
  oilPerG?: number | null;
  ethanolPerL?: number | null;
  bottleEach?: number | null;
  /** Box, cap, label and the like, per bottle. */
  packagingEach?: number | null;
  labourMinutes?: number | null;
  labourPerHour?: number | null;
}

export function batchCost(oilG: number, ethanolMl: number, bottles: number, prices: Prices) {
  const oil = (prices.oilPerG ?? 0) * oilG;
  const ethanol = ((prices.ethanolPerL ?? 0) * ethanolMl) / 1000;
  const glass = (prices.bottleEach ?? 0) * bottles;
  const packaging = (prices.packagingEach ?? 0) * bottles;
  const labour = ((prices.labourMinutes ?? 0) / 60) * (prices.labourPerHour ?? 0);
  const total = oil + ethanol + glass + packaging + labour;
  return { oil, ethanol, glass, packaging, labour, total };
}

export function costPer(total: number, bottles: number, totalMl: number) {
  return {
    perBottle: bottles > 0 ? total / bottles : null,
    perMl: totalMl > 0 ? total / totalMl : null,
  };
}

/**
 * What selling the batch earns: `salePrice` is per bottle. Margin is profit
 * as a share of revenue, markup is profit as a share of cost; either is null
 * when its base is zero. All null without a price or any bottles.
 */
export function margin(total: number, bottles: number, salePrice: number | null) {
  if (!(bottles > 0) || !(salePrice != null && salePrice > 0)) {
    return { revenue: null, profit: null, marginPct: null, markupPct: null };
  }
  const revenue = salePrice * bottles;
  const profit = revenue - total;
  return {
    revenue,
    profit,
    marginPct: (profit / revenue) * 100,
    markupPct: total > 0 ? (profit / total) * 100 : null,
  };
}

/**
 * The economics of a logged batch, from its stored columns. Null when the
 * batch has no seller data (a Free batch, or one logged without prices).
 * Cost uses the oil actually poured when recorded, like the calculator.
 */
export function batchEconomics(b: Record<string, any>) {
  const n = (v: unknown) => (Number(v) > 0 ? Number(v) : null);
  const bottles = Math.floor(Number(b.bottles)) || 0;
  const has = [b.ethanol_price_per_l, b.bottle_cost, b.packaging_cost, b.labour_minutes, b.sale_price]
    .some((v) => n(v) !== null);
  if (!has || bottles <= 0) return null;
  const cost = batchCost(n(b.actual_oil_g) ?? Number(b.oil_g), Number(b.ethanol_ml), bottles, {
    oilPerG: n(b.price_per_gram),
    ethanolPerL: n(b.ethanol_price_per_l),
    bottleEach: n(b.bottle_cost),
    packagingEach: n(b.packaging_cost),
    labourMinutes: n(b.labour_minutes),
    labourPerHour: n(b.labour_rate_per_hour),
  });
  return {
    currency: typeof b.currency === "string" ? b.currency : "",
    total: cost.total,
    perBottle: cost.total / bottles,
    ...margin(cost.total, bottles, n(b.sale_price)),
  };
}

export interface CostInput {
  /** Concentrate in the batch, g. */
  oilG: number;
  /** Ethanol in the batch, mL. */
  ethMl: number;
  /** The batch's volume, mL. */
  totMl: number;
  /** The bottle being priced, mL. */
  bottleMl: number;
  /** Concentrate price per gram (for a blend, blendMix().avgPrice). */
  oilPrice: number;
  /** Ethanol price per litre. */
  ethPrice: number;
  /** Bottle and packaging, per bottle. */
  pack: number;
  /** Margin as a share of the selling price, in %; clamped to 0–95. */
  margin: number;
}

export const MAX_MARGIN_PCT = 95;
/** Retail prices round up to the next multiple of this. */
export const RETAIL_STEP = 5;

// x rounded up to the next multiple of `step`, ignoring float noise
// (88 / 0.4 is 220.00000000000003, which must stay 220).
function ceilTo(x: number, step: number) {
  return Math.ceil(Number((x / step).toPrecision(12))) * step;
}

/**
 * The Bench's cost panel: what the batch costs, what one bottle of it costs
 * (its share of the batch plus packaging), a retail price at the chosen
 * margin (margin = share of the selling price, so price = cost / (1 − m)),
 * rounded up to the next 5, and how many whole bottles the batch fills.
 * Negative or missing inputs count as zero; a missing bottle or batch
 * volume gives zero per bottle, zero retail and zero bottles.
 */
export function costFor(input: CostInput) {
  const n = (v: unknown) => Math.max(Number(v) || 0, 0);
  const batch = n(input.oilG) * n(input.oilPrice) + (n(input.ethMl) / 1000) * n(input.ethPrice);
  const bottle = n(input.bottleMl);
  const total = n(input.totMl);
  const perBottle = total > 0 && bottle > 0 ? (batch / total) * bottle + n(input.pack) : 0;
  const m = Math.min(n(input.margin), MAX_MARGIN_PCT) / 100;
  const retail = perBottle > 0 ? ceilTo(perBottle / (1 - m), RETAIL_STEP) : 0;
  const bottles = bottle > 0 ? Math.floor(Number((total / bottle).toPrecision(12))) : 0;
  return { batch, perBottle, retail, bottles };
}

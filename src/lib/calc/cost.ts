// What a batch costs: oil by the gram, ethanol by the litre, plus bottles.
export interface Prices {
  oilPerG?: number | null;
  ethanolPerL?: number | null;
  bottleEach?: number | null;
  /** Box, label, atomizer… for each bottle. */
  packagingEach?: number | null;
  /** Time spent on the batch, and what an hour of it is worth. */
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

/**
 * What selling the bottles earns: `salePrice` is for one bottle. Margin is the
 * share of the takings that is profit; markup is profit over cost. Null when
 * there is nothing to sell or no price, so a screen shows nothing rather than
 * a made-up figure; markup is also null at zero cost.
 */
export function sellerFigures(total: number, bottles: number, salePrice: number) {
  if (!(bottles > 0) || !(salePrice > 0)) return null;
  const revenue = salePrice * bottles;
  const profit = revenue - total;
  return {
    revenue,
    profit,
    profitPerBottle: profit / bottles,
    marginPct: (profit / revenue) * 100,
    markupPct: total > 0 ? (profit / total) * 100 : null,
  };
}

export function costPer(total: number, bottles: number, totalMl: number) {
  return {
    perBottle: bottles > 0 ? total / bottles : null,
    perMl: totalMl > 0 ? total / totalMl : null,
  };
}

/** A logged batch row (the batches table) as far as pricing goes. */
export interface PricedBatch {
  oil_g: number | string; ethanol_ml: number | string; total_ml: number | string;
  actual_oil_g?: number | string | null; actual_ethanol_g?: number | string | null; ethanol_density?: number | string | null;
  price_per_gram?: number | string | null; ethanol_price_per_l?: number | string | null; bottle_cost?: number | string | null;
  bottles?: number | string | null; packaging_cost?: number | string | null;
  labour_minutes?: number | string | null; labour_rate?: number | string | null; sale_price?: number | string | null;
}

const num = (v: unknown) => (Number(v) > 0 ? Number(v) : null);

/**
 * What a logged batch cost and earned, from the prices saved on it: the same
 * sums as the calculator, on what was really poured when that was recorded.
 * Null when the batch carries no prices at all, so nothing is invented for
 * batches logged before the seller layer.
 */
export function storedBatchCost(b: PricedBatch) {
  const prices = {
    oilPerG: num(b.price_per_gram), ethanolPerL: num(b.ethanol_price_per_l), bottleEach: num(b.bottle_cost),
    packagingEach: num(b.packaging_cost), labourMinutes: num(b.labour_minutes), labourPerHour: num(b.labour_rate),
  };
  if (Object.values(prices).every((v) => v === null)) return null;
  const actualEth = num(b.actual_ethanol_g);
  const ethMl = actualEth !== null ? actualEth / (num(b.ethanol_density) ?? 0.81) : Number(b.ethanol_ml);
  const bottles = Math.max(Math.floor(Number(b.bottles) || 0), 0);
  const cost = batchCost(num(b.actual_oil_g) ?? Number(b.oil_g), ethMl, bottles, prices);
  const per = costPer(cost.total, bottles, Number(b.total_ml));
  return { ...cost, ...per, bottles, seller: sellerFigures(cost.total, bottles, Number(b.sale_price)) };
}

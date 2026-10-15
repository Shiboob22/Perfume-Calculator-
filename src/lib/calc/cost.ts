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

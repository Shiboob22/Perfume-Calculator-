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

// The cost and sale lines of a logged batch, as [label, value] pairs, shared
// by the Batches list and the shareable card. Empty for a batch with no
// prices saved (everything logged before the seller layer, and every batch on
// Free). Money is shown in the batch's own currency.
import { storedBatchCost, fmt2 } from "./calc";
import { formatMoney } from "./money";

export function pricingRows(batch, t, format = {}) {
  const c = storedBatchCost(batch);
  // Oil alone is already the "Cost" line; this block is for the fuller picture.
  if (!c || !(c.total > c.oil || c.seller)) return [];
  const money = (v) => formatMoney(v, batch.currency, format);
  const rows = [[t("batches.totalCost"), money(c.total)]];
  if (c.perBottle != null) rows.push([t("batches.costPerBottle"), money(c.perBottle)]);
  if (c.seller) {
    rows.push([t("batches.salePrice"), money(Number(batch.sale_price))]);
    rows.push([t(c.seller.profit < 0 ? "batches.loss" : "batches.profit"), money(Math.abs(c.seller.profit))]);
    rows.push([t("batches.margin"), `${fmt2(c.seller.marginPct)}%`]);
  }
  return rows;
}

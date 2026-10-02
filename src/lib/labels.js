// Printable bottle labels: the handbook's suggested label fields (Vol. III,
// Bench: fragrance, concentration, bottle size, lot, date, weights) for one
// logged batch, at a chosen label size, tiled on an A4 sheet.
import { labelWeights, fmt2 } from "./calc";

// Label sizes in millimetres. DEFAULTS pending the owner's choice of sizes;
// "custom" takes any width × height in LABEL_LIMITS.
export const LABEL_SIZES = {
  small: { w: 50, h: 30 },   // 10–30 mL bottles
  medium: { w: 70, h: 40 },  // 50 mL
  large: { w: 90, h: 50 },   // 100 mL
};
export const LABEL_LIMITS = { min: 25, maxW: 190, maxH: 130 };
export const MAX_COPIES = 40;

const A4 = { w: 210, h: 297, margin: 10, gap: 4 };

// A custom size, kept within what prints on A4; null if unusable.
export function customSize(w, h) {
  const W = Number(w);
  const H = Number(h);
  if (!(W >= LABEL_LIMITS.min && W <= LABEL_LIMITS.maxW && H >= LABEL_LIMITS.min && H <= LABEL_LIMITS.maxH)) return null;
  return { w: W, h: H };
}

// How many labels of this size fit on one A4 sheet (columns × rows).
export function perSheet({ w, h }) {
  const cols = Math.max(1, Math.floor((A4.w - 2 * A4.margin + A4.gap) / (w + A4.gap)));
  const rows = Math.max(1, Math.floor((A4.h - 2 * A4.margin + A4.gap) / (h + A4.gap)));
  return { cols, rows, total: cols * rows };
}

// Type sizes (mm) that fit the name and `rows` lines inside a label:
// 2 mm padding top and bottom, line height 1.35, name at 1.1.
const PAD_MM = 4;
const LINE = 1.35;
export function typeSizes({ h }, rows) {
  const name = Math.min(6, h / 7);
  const line = Math.min(3.2, (h - PAD_MM - name * 1.1 - 1) / (rows * LINE));
  return { name: Math.floor(name * 100) / 100, line: Math.max(1.4, Math.floor(line * 100) / 100) };
}

// The label's lines, translated. Weights are what was poured when the
// batch records it, otherwise the targets (labelWeights, as in bench mode).
export function labelFields(batch, { t, lot = "" }) {
  const weights = labelWeights(Number(batch.oil_g), Number(batch.ethanol_g), Number(batch.actual_oil_g) || null, Number(batch.actual_ethanol_g) || null);
  const fields = [
    [t("bench.label.concentration"), `${batch.concentration_pct}%`],
    [t("bench.label.bottle"), `${Number(fmt2(Number(batch.total_ml)))} mL`],
    [t("bench.label.date"), batch.blend_date || ""],
  ];
  if (String(lot).trim()) fields.push([t("bench.label.lot"), String(lot).trim()]);
  fields.push(
    [t("bench.label.oil"), `${fmt2(weights.oil)} g`],
    [t("bench.label.alcohol"), `${fmt2(weights.ethanol)} g`],
    [t("bench.label.total"), `${fmt2(weights.total)} g`],
  );
  return { name: batch.fragrance_name || t("bench.untitled"), fields };
}

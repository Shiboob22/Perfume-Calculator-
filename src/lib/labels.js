// Printable bottle labels: the handbook's suggested label fields (Vol. III,
// Bench: fragrance, concentration, bottle size, lot, date, weights) for one
// logged batch, at a chosen label size, tiled on an A4 sheet.
import { UNIT_LABELS } from "./calcPrefill";
import { labelWeights, fmt2 } from "./calc";

// Label sizes in millimetres. DEFAULTS pending the owner's choice of sizes;
// "custom" takes any width × height in LABEL_LIMITS.
export const LABEL_SIZES = {
  small: { w: 50, h: 30 },   // 10–30 mL bottles
  medium: { w: 70, h: 40 },  // 50 mL
  large: { w: 90, h: 50 },   // 100 mL
  // Niimbot D30 thermal roll: 12 mm × 40 mm, printed one label per page with
  // the 40 mm side along the feed (landscape), so the page is the label.
  d30: { w: 40, h: 12, roll: true },
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
export function perSheet({ w, h, roll }) {
  if (roll) return { cols: 1, rows: 1, total: 1 };
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

// A 12 mm roll label holds the name and one line of key facts, not the full
// weights list: the type sizes (mm) for that two-line layout.
export function compactSizes({ h }) {
  const name = Math.min(4.2, h * 0.36);
  const line = Math.min(2.8, (h - 2 - name * 1.1 - 0.5) / LINE);
  return { name: Math.floor(name * 100) / 100, line: Math.max(1.4, Math.floor(line * 100) / 100) };
}

// The label's lines, translated. Weights are what was poured when the
// batch records it, otherwise the targets (labelWeights, as in bench mode).
// The bottle as the user entered it when the batch has it (0015), else the
// total by the batch's basis. The lot typed on this page wins over the
// stored one; an empty typed lot means no lot on the label.
export function bottleText(batch) {
  if (Number(batch.amount) > 0 && UNIT_LABELS[batch.unit]) return `${Number(fmt2(Number(batch.amount)))} ${UNIT_LABELS[batch.unit]}`;
  return batch.basis === "weight" ? `${Number(fmt2(Number(batch.total_g)))} g` : `${Number(fmt2(Number(batch.total_ml)))} mL`;
}

export function labelFields(batch, { t, lot }) {
  lot = lot ?? batch.lot ?? "";
  const weights = labelWeights(Number(batch.oil_g), Number(batch.ethanol_g), Number(batch.actual_oil_g) || null, Number(batch.actual_ethanol_g) || null);
  const fields = [
    [t("bench.label.concentration"), `${batch.concentration_pct}%`],
    [t("bench.label.bottle"), bottleText(batch)],
    [t("bench.label.date"), batch.blend_date || ""],
  ];
  if (String(lot).trim()) fields.push([t("bench.label.lot"), String(lot).trim()]);
  // Compact (roll) labels: the facts above, without the weights.
  const compact = fields.slice();
  fields.push(
    [t("bench.label.oil"), `${fmt2(weights.oil)} g`],
    [t("bench.label.alcohol"), `${fmt2(weights.ethanol)} g`],
    [t("bench.label.total"), `${fmt2(weights.total)} g`],
  );
  return { name: batch.fragrance_name || t("bench.untitled"), fields, compact };
}

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

// Roll labels (D30, 12 mm high) carry every field on three rows: the name,
// the facts (concentration, bottle, date, lot) and the weights, each with a
// short label. Type is fitted to the printable width, so a long name or lot
// shrinks (down to a floor) instead of overflowing.
const ROLL_PAD = { x: 1.5, y: 0.8 };
const ROLL_LINE = 1.2;
const CHAR_EM = 0.54; // average glyph width in em, tabular figures

function fitMm(chars, width, max, min) {
  const size = Math.min(max, width / (Math.max(chars, 1) * CHAR_EM));
  return Math.max(min, Math.floor(size * 100) / 100);
}

export function compactLayout(batch, { t, lot }, { w, h }) {
  lot = lot ?? batch.lot ?? "";
  const inner = w - 2 * ROLL_PAD.x;
  const weights = labelWeights(Number(batch.oil_g), Number(batch.ethanol_g), Number(batch.actual_oil_g) || null, Number(batch.actual_ethanol_g) || null);
  const facts = [`${batch.concentration_pct}%`, bottleText(batch), batch.blend_date || ""];
  if (String(lot).trim()) facts.push(`${t("labels.short.lot")} ${String(lot).trim()}`);
  const grams = [
    `${t("labels.short.oil")} ${fmt2(weights.oil)}`,
    `${t("labels.short.alcohol")} ${fmt2(weights.ethanol)}`,
    `${t("labels.short.total")} ${fmt2(weights.total)} g`,
  ].filter(Boolean);
  const name = batch.fragrance_name || t("bench.untitled");
  const chars = (segs) => segs.join("").length + (segs.length - 1);
  // Rows share what is left under the name; none may exceed 2.5 mm.
  const nameSize = fitMm(name.length, inner, Math.min(3.6, h * 0.3), 2.2);
  const rowMax = Math.min(2.5, (h - 2 * ROLL_PAD.y - nameSize * 1.1) / (2 * ROLL_LINE));
  const rows = [facts, grams].map((segments) => ({ segments, size: fitMm(chars(segments), inner, rowMax, 1.6) }));
  return { name, nameSize, rows };
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
  fields.push(
    [t("bench.label.oil"), `${fmt2(weights.oil)} g`],
    [t("bench.label.alcohol"), `${fmt2(weights.ethanol)} g`],
    [t("bench.label.total"), `${fmt2(weights.total)} g`],
  );
  return { name: batch.fragrance_name || t("bench.untitled"), fields };
}

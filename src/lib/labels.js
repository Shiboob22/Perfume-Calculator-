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

// Roll labels (D30, 12 mm high) carry every field on three blocks: the name
// (one line, or two when it is long), the facts (concentration, bottle, date,
// lot) and the weights, each with a short label. Type is fitted to the
// printable width from measured text widths; what still cannot fit at the
// smallest legible size is cut with an ellipsis, never left to overflow.
const ROLL = { padX: 1.5, padY: 0.8, nameLine: 1.1, rowLine: 1.2, gap: 1, safety: 0.97,
  nameMax: 3.6, name2Max: 2.5, rowMax: 2.5, nameMin: 2.2, rowMin: 2.0, rowFloor: 1.6 };
const CHAR_EM = 0.54; // fallback estimate: average glyph width in em

// Width of `text` in mm at a 1 mm font size. The browser passes a measured
// one (canvas, real font); tests and SSR use the estimate.
export const estimateEm = (text) => Array.from(String(text)).length * CHAR_EM;

const floor2 = (n) => Math.floor(n * 100) / 100;

function clip(text, avail, size, em) {
  if (em(text) * size <= avail) return text;
  const chars = Array.from(text);
  while (chars.length > 1 && em(chars.join("").trimEnd() + "…") * size > avail) chars.pop();
  return chars.join("").trimEnd() + "…";
}

// One line: the largest size ≤ max (floored at min) at which `text` fits.
function fitLine(text, avail, max, min, em) {
  const size = Math.max(min, floor2(Math.min(max, avail / Math.max(em(text), 0.01))));
  return { size, text: clip(text, avail, size, em) };
}

// Two lines for a long name: words split where the longer line is shortest.
function splitName(name, em) {
  const words = name.split(/\s+/).filter(Boolean);
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const widest = Math.max(em(lines[0]), em(lines[1]));
    if (!best || widest < best.widest) best = { lines, widest };
  }
  return best;
}

export function compactLayout(batch, { t, lot }, { w, h }, em = estimateEm) {
  lot = lot ?? batch.lot ?? "";
  const avail = (w - 2 * ROLL.padX) * ROLL.safety;
  const box = h - 2 * ROLL.padY;
  const weights = labelWeights(Number(batch.oil_g), Number(batch.ethanol_g), Number(batch.actual_oil_g) || null, Number(batch.actual_ethanol_g) || null);
  const facts = [`${batch.concentration_pct}%`, bottleText(batch), batch.blend_date || ""];
  if (String(lot).trim()) facts.push(`${t("labels.short.lot")} ${String(lot).trim()}`);
  const grams = [
    `${t("labels.short.oil")} ${fmt2(weights.oil)}`,
    `${t("labels.short.alcohol")} ${fmt2(weights.ethanol)}`,
    `${t("labels.short.total")} ${fmt2(weights.total)} g`,
  ];
  const name = (batch.fragrance_name || t("bench.untitled")).trim();

  // Name: one line when it fits at a good size, else two smaller lines.
  const one = fitLine(name, avail, ROLL.nameMax, ROLL.nameMin, em);
  let nameLines = [one.text], nameSize = one.size;
  const split = one.size < 2.8 ? splitName(name, em) : null;
  if (split) {
    const fits = split.lines.map((l) => fitLine(l, avail, ROLL.name2Max, ROLL.rowMin, em));
    nameSize = Math.min(...fits.map((f) => f.size));
    nameLines = fits.map((f, i) => clip(split.lines[i], avail, nameSize, em));
  }
  // The two rows below keep at least rowMin; the name gives way first.
  const nameH = () => nameLines.length * nameSize * ROLL.nameLine;
  const roomFor = 2 * ROLL.rowMin * ROLL.rowLine;
  if (nameH() > box - roomFor) {
    nameSize = floor2((box - roomFor) / (nameLines.length * ROLL.nameLine));
    nameLines = nameLines.map((l) => clip(l, avail, nameSize, em));
  }
  const rowMax = Math.min(ROLL.rowMax, (box - nameH()) / (2 * ROLL.rowLine));

  // A row of segments spread across the width, with a minimum gap between.
  const row = (segments) => {
    const gaps = (segments.length - 1) * ROLL.gap;
    // Only the last segment (the lot, free text) is ever clipped, and before
    // the row shrinks: at the smallest legible size it gets what is left.
    const head = segments.slice(0, -1);
    const headEm = head.reduce((n, sg) => n + em(sg), 0);
    const left = Math.max(avail - gaps - headEm * ROLL.rowMin, 0);
    const last = clip(segments[segments.length - 1], left, ROLL.rowMin, em);
    const all = [...head, last];
    const total = all.reduce((n, sg) => n + em(sg), 0);
    const size = Math.max(ROLL.rowFloor, floor2(Math.min(rowMax, (avail - gaps) / Math.max(total, 0.01))));
    return { segments: all, size };
  };
  return { name: nameLines.join(" "), nameLines, nameSize, rows: [row(facts), row(grams)] };
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

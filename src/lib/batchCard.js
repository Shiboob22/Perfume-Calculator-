// Renders a logged batch to a shareable PNG "card" via the Canvas 2D API.
// Zero-dependency on purpose: html2canvas/satori would add bundle weight for
// what is a fixed, well-known layout. Colours/tiers come from the shared
// theme so the exported card reads as the same product as the app.
// The card follows the app's language: labels through t(), dates in the
// locale, right-to-left layout and the Arabic brand fonts in Arabic.
import { COLORS } from "./theme";
import { TIERS, TIER_COLORS } from "./tiers";
import { batchStartedAt, batchReadyAt, formatExact } from "./batchTiming";
import { actualStrength } from "./calc";
import { dirOf } from "../i18n/core";
import { loadArabicFonts } from "../i18n/arabicFonts";

function round2(n) {
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n * 100) / 100).toFixed(2);
}

// Logical card size (portrait, comfortable for phone share sheets). The bitmap
// is rendered at SCALE× for crisp text on hi-dpi screens.
const W = 1000;
const H = 1400;
const SCALE = 2;
const PAD = 70; // outer paper margin around the inner frame
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";
// Arabic: the app's faces (arabicFonts.js). Amiri's subset is Arabic only,
// so Latin names fall through to Georgia. Labels use a proportional face:
// monospaced Arabic stretches badly.
const SERIF_AR = "Amiri, Georgia, 'Geeza Pro', 'Noto Naskh Arabic', serif";
const LABEL_AR = "'IBM Plex Sans Arabic', 'Geeza Pro', 'Noto Sans Arabic', Tahoma, sans-serif";

// Unicode isolates. Text from the user or the catalog (a Latin name like
// "1 Million", notes ending in "."), and ISO dates, would otherwise be
// reordered by the bidi algorithm inside a right-to-left line.
const FSI = "⁨"; // first-strong isolate: direction from the text itself
const LRI = "⁦"; // left-to-right isolate: dates, figures
const PDI = "⁩";
export const isolate = (s) => `${FSI}${s}${PDI}`;
export const ltr = (s) => `${LRI}${s}${PDI}`;

// Break `text` into lines that fit `maxWidth` at the ctx's current font.
function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The rows of the card as [label, value] pairs, translated. Pure, so it
// can be tested without a canvas. Figures stay Western (round2 strings),
// matching the scale, whatever the digit setting.
export function cardRows(batch, { t, locale }) {
  const rows = [
    [t("batches.oil"), t("batchCard.gramsMl", { g: round2(batch.oil_g), ml: round2(batch.oil_ml) })],
    [t("batches.ethanol"), t("batchCard.gramsMl", { g: round2(batch.ethanol_g), ml: round2(batch.ethanol_ml) })],
    [t("batches.total"), t("batchCard.grams", { g: round2(batch.total_g) })],
  ];
  const actual = actualStrength(batch);
  if (actual !== null) {
    rows.push([t("batchCard.actualPour"), t("batchCard.actualPourValue", { oil: round2(Number(batch.actual_oil_g)), ethanol: round2(Number(batch.actual_ethanol_g)) })]);
    rows.push([t("batchCard.actualRatioLabel"), t(`batchCard.actualRatio.${actual.basisKnown ? actual.basis : "assumed"}`, { pct: round2(actual.pct) })]);
  }
  if (batch.oil_cost) rows.push([t("calc.oilCost"), round2(batch.oil_cost)]);
  if (batch.price_per_gram) rows.push([t("calc.pricePerGram"), round2(Number(batch.price_per_gram))]);
  const started = batchStartedAt(batch);
  const ready = batchReadyAt(batch);
  if (started) rows.push([t("batches.created"), formatExact(started, locale)]);
  if (ready) rows.push([t("batches.bestFrom"), formatExact(ready, locale)]);
  if (batch.oil_type) rows.push([t("batchCard.oilType"), isolate(batch.oil_type)]);
  if (batch.blended_by) rows.push([t("calc.blendedBy"), isolate(batch.blended_by)]);
  return rows;
}

// Draw the card for one batch onto a fresh canvas and return it.
export function renderBatchCard(batch, { t, locale = "en" }) {
  const dir = dirOf(locale);
  const rtl = dir === "rtl";
  const serif = rtl ? SERIF_AR : SERIF;
  const label = rtl ? LABEL_AR : MONO;
  // Arabic has only upright faces; "italic" would make the browser slant
  // the script mechanically.
  const it = rtl ? "normal" : "italic";

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  // A detached canvas does not inherit <html dir>; set it explicitly.
  canvas.dir = dir;
  const ctx = canvas.getContext("2d");
  ctx.direction = dir;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  const tierColor = TIER_COLORS[batch.tier] || COLORS.forest;
  const tierLabel = TIERS[batch.tier] ? t(`families.${batch.tier}.label`) : batch.tier || "";

  // Paper background + inner card frame.
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, W, H);
  const fx = PAD;
  const fy = PAD;
  const fw = W - PAD * 2;
  const fh = H - PAD * 2;
  ctx.fillStyle = COLORS.card;
  ctx.fillRect(fx, fy, fw, fh);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2);

  // Tier accent strip along the top of the frame.
  ctx.fillStyle = tierColor;
  ctx.fillRect(fx, fy, fw, 14);

  const cx = W / 2;
  const inner = fw - 100; // text column width inside the frame
  let y = fy + 110;

  // Flacon mark — a minimal bottle glyph echoing FlaconMark.jsx.
  ctx.save();
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 12, y - 46); // neck
  ctx.lineTo(cx + 12, y - 46);
  ctx.moveTo(cx - 10, y - 46);
  ctx.lineTo(cx - 10, y - 34);
  ctx.lineTo(cx - 26, y - 18);
  ctx.lineTo(cx - 26, y + 22);
  ctx.arc(cx, y + 22, 26, Math.PI, 0, true); // rounded shoulders + base
  ctx.lineTo(cx + 26, y - 18);
  ctx.lineTo(cx + 10, y - 34);
  ctx.lineTo(cx + 10, y - 46);
  ctx.stroke();
  ctx.restore();
  // Clear the full height of the flacon (base sits ~48px below anchor) plus
  // the name's cap height, so a wrapped 2-line title never collides with it.
  y += 116;

  // Fragrance name (serif, wrapped, centred). Isolate each line after
  // wrapping, so an isolate never spans two lines.
  ctx.fillStyle = COLORS.forestDeep;
  ctx.textAlign = "center";
  ctx.font = `${it} 700 52px ${serif}`;
  const nameLines = wrapLines(ctx, batch.fragrance_name || t("bench.untitled"), inner);
  for (const l of nameLines.slice(0, 3)) {
    ctx.fillText(isolate(l), cx, y);
    y += 60;
  }
  y += 6;

  // Meta line: date · tier · concentration.
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `24px ${label}`;
  const meta = [batch.blend_date && ltr(batch.blend_date), tierLabel, batch.concentration_pct != null ? ltr(`${batch.concentration_pct}%`) : null]
    .filter(Boolean)
    .join("  ·  ");
  ctx.fillText(meta, cx, y);
  y += 46;

  // Divider.
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fx + 50, y);
  ctx.lineTo(fx + fw - 50, y);
  ctx.stroke();
  y += 60;

  // Recipe rows: label at the start edge, value at the end edge. With
  // ctx.direction set, "start"/"end" follow the language; the x positions
  // swap so the label sits on the right in Arabic.
  const rowLeft = fx + 50;
  const rowRight = fx + fw - 50;
  const startX = rtl ? rowRight : rowLeft;
  const endX = rtl ? rowLeft : rowRight;
  ctx.font = `26px ${label}`;
  for (const [name, value] of cardRows(batch, { t, locale })) {
    ctx.textAlign = "start";
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fillText(name, startX, y);
    ctx.textAlign = "end";
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(String(value), endX, y);
    y += 48;
  }

  // Notes, if any — serif, wrapped, a few lines max.
  if (batch.notes) {
    y += 14;
    ctx.textAlign = "start";
    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = `${it} 24px ${serif}`;
    const noteLines = wrapLines(ctx, batch.notes, inner);
    for (const l of noteLines.slice(0, 4)) {
      ctx.fillText(isolate(l), startX, y);
      y += 34;
    }
  }

  // Footer brand line, anchored to the bottom of the frame.
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.forestDeep;
  ctx.font = `${it} 26px ${serif}`;
  ctx.fillText(t("brand"), cx, fy + fh - 46);

  return canvas;
}

// A file name from the fragrance name, in any script ("عود الليل" →
// "عود-الليل"); letters and digits only.
export function safeFileName(batch) {
  const base = String(batch.fragrance_name || "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const date = batch.blend_date || "";
  return `${base || "batch"}${date ? "-" + date : ""}-card.png`;
}

// Canvas text never waits for a webfont: load the Arabic faces the card
// draws with first, or the first Arabic card falls back to a system font.
async function arabicFontsReady() {
  await loadArabicFonts();
  if (!document.fonts?.load) return;
  const sample = "عطر";
  await Promise.all([
    document.fonts.load("700 52px Amiri", sample),
    document.fonts.load("400 24px Amiri", sample),
    document.fonts.load("400 26px 'IBM Plex Sans Arabic'", sample),
  ]).catch(() => {});
}

// Render + trigger a PNG download for one batch.
export async function downloadBatchCard(batch, { t, locale = "en" }) {
  if (dirOf(locale) === "rtl") await arabicFontsReady();
  const canvas = renderBatchCard(batch, { t, locale });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create the image.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeFileName(batch);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

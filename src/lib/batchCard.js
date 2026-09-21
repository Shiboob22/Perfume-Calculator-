// Renders a logged batch to a shareable PNG "card" via the Canvas 2D API.
// Zero-dependency on purpose: html2canvas/satori would add bundle weight for
// what is a fixed, well-known layout. Colours/tiers come from the shared
// theme so the exported card reads as the same product as the app.
import { COLORS } from "./theme";
import { TIERS, TIER_COLORS } from "./tiers";

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

// Draw the card for one batch onto a fresh canvas and return it.
export function renderBatchCard(batch) {
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  const tierColor = TIER_COLORS[batch.tier] || COLORS.forest;
  const tierLabel = TIERS[batch.tier]?.label || batch.tier || "";

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

  // Fragrance name (serif italic, wrapped, centred).
  ctx.fillStyle = COLORS.forestDeep;
  ctx.textAlign = "center";
  ctx.font = `italic 600 52px ${SERIF}`;
  const nameLines = wrapLines(ctx, batch.fragrance_name || "Untitled batch", inner);
  for (const l of nameLines.slice(0, 3)) {
    ctx.fillText(l, cx, y);
    y += 60;
  }
  y += 6;

  // Meta line: date · tier · concentration.
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `24px ${MONO}`;
  const meta = [batch.blend_date, tierLabel, batch.concentration_pct != null ? `${batch.concentration_pct}%` : null]
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

  // Recipe rows: label left, value right, in the mono voice used in-app.
  const rows = [
    ["Oil", `${round2(batch.oil_g)} g  /  ${round2(batch.oil_ml)} mL`],
    ["Ethanol", `${round2(batch.ethanol_g)} g  /  ${round2(batch.ethanol_ml)} mL`],
    ["Total", `${round2(batch.total_g)} g`],
  ];
  if (batch.oil_cost) rows.push(["Oil cost", round2(batch.oil_cost)]);
  if (batch.oil_type) rows.push(["Oil type", batch.oil_type]);
  if (batch.blended_by) rows.push(["Blended by", batch.blended_by]);

  const rowLeft = fx + 50;
  const rowRight = fx + fw - 50;
  ctx.font = `26px ${MONO}`;
  for (const [label, value] of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fillText(label, rowLeft, y);
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(String(value), rowRight, y);
    y += 48;
  }

  // Notes, if any — italic serif, wrapped, a few lines max.
  if (batch.notes) {
    y += 14;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = `italic 24px ${SERIF}`;
    const noteLines = wrapLines(ctx, batch.notes, inner);
    for (const l of noteLines.slice(0, 4)) {
      ctx.fillText(l, rowLeft, y);
      y += 34;
    }
  }

  // Footer brand line, anchored to the bottom of the frame.
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.forestDeep;
  ctx.font = `italic 26px ${SERIF}`;
  ctx.fillText("The Scent Handbook", cx, fy + fh - 46);

  return canvas;
}

function safeFileName(batch) {
  const base = (batch.fragrance_name || "batch").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  const date = batch.blend_date || "";
  return `${base || "batch"}${date ? "-" + date : ""}-card.png`;
}

// Render + trigger a PNG download for one batch.
export function downloadBatchCard(batch) {
  const canvas = renderBatchCard(batch);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFileName(batch);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

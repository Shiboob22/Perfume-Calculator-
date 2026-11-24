import qrcode from "qrcode-generator";

/** The address in a bottle's QR: the buyer page for that order (0040). */
export const buyerUrl = (site, code) => `${String(site).replace(/\/$/, "")}/o/${code}`;

/**
 * One SVG path for a QR code of `text` (error correction M), in module
 * units with a 2-module quiet zone. Returns { size, d } for
 * <svg viewBox="0 0 size size"><path d={d}/></svg>; crisp at any print size.
 */
export function qrSvg(text) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
  return { size: n + 4, d };
}

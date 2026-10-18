// Arabic webfonts, fetched only once someone switches to Arabic, so English
// pages never download them. Arabic subsets only: Latin text keeps the
// brand fonts, glyph by glyph.
//   Readex Pro — UI text and prose (the role of Instrument Sans)
//   Reem Kufi  — display lines and big numerals (the role of Instrument Serif)
let loading = null;
export function loadArabicFonts() {
  // Public pages already carry the faces (prerendered, font-display: optional).
  if (typeof document !== "undefined" && document.querySelector("link[data-ar-fonts]")) return Promise.resolve();
  loading ??= Promise.all([
    import("./arabic-readex.css"),
    import("./arabic-reem.css"),
  ]).catch(() => { loading = null; }); // system Arabic fonts remain the fallback
  return loading;
}

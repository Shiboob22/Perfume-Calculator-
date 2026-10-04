// Arabic webfonts, fetched only once someone switches to Arabic, so English
// pages never download them. Arabic subsets only: Latin text keeps the
// brand fonts, glyph by glyph.
//   Tajawal — UI text and headings (the role of Poppins)
//   Amiri   — body copy (the role of Lora)
let loading = null;
export function loadArabicFonts() {
  loading ??= Promise.all([
    import("@fontsource/tajawal/arabic-400.css"),
    import("@fontsource/tajawal/arabic-500.css"),
    import("@fontsource/tajawal/arabic-700.css"),
    import("@fontsource/amiri/arabic-400.css"),
    import("@fontsource/amiri/arabic-700.css"),
  ]).catch(() => { loading = null; }); // system Arabic fonts remain the fallback
  return loading;
}

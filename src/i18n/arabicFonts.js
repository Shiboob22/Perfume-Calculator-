// Arabic webfonts, fetched only once someone switches to Arabic, so English
// pages never download them. Arabic subsets only: Latin text keeps the
// brand fonts, glyph by glyph.
//   IBM Plex Sans Arabic — UI text (pairs with IBM Plex Mono)
//   Amiri               — display / headings (the serif role of Cormorant)
let loading = null;
export function loadArabicFonts() {
  loading ??= Promise.all([
    import("@fontsource/ibm-plex-sans-arabic/arabic-400.css"),
    import("@fontsource/ibm-plex-sans-arabic/arabic-500.css"),
    import("@fontsource/ibm-plex-sans-arabic/arabic-600.css"),
    import("@fontsource/amiri/arabic-400.css"),
    import("@fontsource/amiri/arabic-700.css"),
  ]).catch(() => { loading = null; }); // system Arabic fonts remain the fallback
  return loading;
}

// None of the three brand fonts has Arabic glyphs, so Arabic text falls
// through, glyph by glyph, to IBM Plex Sans Arabic (UI) or Amiri (serif
// display) — loaded only in Arabic, see src/i18n/arabicFonts.js — and then
// to system Arabic fonts. In the mono stack they sit before ui-monospace,
// whose Arabic is a stretched monospaced face.
const ARABIC_SYSTEM = ["'Geeza Pro'", "'Noto Sans Arabic'", "'Segoe UI'", "Tahoma"];
const ARABIC_FALLBACK = ["'IBM Plex Sans Arabic'", ...ARABIC_SYSTEM];

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Cormorant Garamond'", "'Amiri'", "Georgia", ...ARABIC_SYSTEM, "serif"],
        sans: ["'Space Grotesk'", ...ARABIC_FALLBACK, "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", ...ARABIC_FALLBACK, "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

// None of the three brand fonts has Arabic glyphs. Until Phase 6 adds Arabic
// webfonts, Arabic text falls through to these system fonts. In the mono stack
// they sit before ui-monospace, whose Arabic is a stretched monospaced face.
const ARABIC_FALLBACK = ["'Geeza Pro'", "'Noto Sans Arabic'", "'Segoe UI'", "Tahoma"];

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", ...ARABIC_FALLBACK, "serif"],
        sans: ["'Space Grotesk'", ...ARABIC_FALLBACK, "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", ...ARABIC_FALLBACK, "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

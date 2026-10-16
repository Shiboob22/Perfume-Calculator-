// None of the brand fonts has Arabic glyphs, so Arabic text falls through,
// glyph by glyph, to IBM Plex Sans Arabic (UI) or Noto Naskh Arabic (display, serif —
// loaded only in Arabic, see src/i18n/arabicFonts.js — and then to system
// Arabic fonts.
const ARABIC_SYSTEM = ["'Geeza Pro'", "'Noto Sans Arabic'", "'Segoe UI'", "Tahoma"];

import plugin from "tailwindcss/plugin";
import { COLORS, PALETTES, paletteVars } from "./src/lib/theme.js";

const light = paletteVars(PALETTES.light);
const dark = paletteVars(PALETTES.dark);

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Focus rings in the palette's focus colour, fully opaque (WCAG 1.4.11).
      ringColor: { DEFAULT: COLORS.focus },
      ringOpacity: { DEFAULT: "1" },
      fontFamily: {
        serif: ["'Newsreader Variable'", "'Newsreader Fallback'", "'Noto Naskh Arabic Variable'", "Georgia", ...ARABIC_SYSTEM, "serif"],
        sans: ["'Hanken Grotesk Variable'", "'IBM Plex Sans Arabic'", ...ARABIC_SYSTEM, "system-ui", "sans-serif"],
        // Kyphira System 1.0 has no monospace: figures are Hanken Grotesk with tabular numerals.
        // `font-mono` stays as a class name for older components and resolves to the UI face.
        mono: ["'Hanken Grotesk Variable'", "'IBM Plex Sans Arabic'", ...ARABIC_SYSTEM, "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [
    // The palettes as CSS custom properties. Light by default; dark when the
    // system asks and the reader hasn't chosen light, or when they chose dark.
    plugin(({ addBase }) => addBase({
      ":root": { ...light, colorScheme: "light" },
      "@media (prefers-color-scheme: dark)": { ':root:not([data-theme="light"])': { ...dark, colorScheme: "dark" } },
      ':root[data-theme="dark"]': { ...dark, colorScheme: "dark" },
    })),
  ],
};

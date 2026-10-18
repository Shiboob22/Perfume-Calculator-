// None of the brand fonts has Arabic glyphs, so Arabic text falls through,
// glyph by glyph, to Readex Pro (UI and prose; loaded only in Arabic, see
// src/i18n/arabicFonts.js) and then to system Arabic fonts. Arabic display
// lines take Reem Kufi through the `.ar-display` class (src/index.css).
const ARABIC_SYSTEM = ["'Geeza Pro'", "'Noto Sans Arabic'", "'Segoe UI'", "Tahoma"];

import plugin from "tailwindcss/plugin";
import { COLORS, PALETTES, paletteVars } from "./src/lib/theme.js";
import { motionVars } from "./src/motion/config.js";

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
      // Kyphira board: 2 px corners everywhere (circles only for the ember and avatars).
      borderRadius: { DEFAULT: "2px" },
      fontFamily: {
        serif: ["'Instrument Serif'", "'Instrument Serif Fallback'", "'Readex Pro Variable'", "Georgia", ...ARABIC_SYSTEM, "serif"],
        sans: ["'Instrument Sans Variable'", "'Instrument Sans Fallback'", "'Readex Pro Variable'", ...ARABIC_SYSTEM, "system-ui", "sans-serif"],
        // No monospace: figures are Instrument Sans with tabular numerals
        // (`.font-mono` in index.css switches them on), so columns of grams still line up.
        mono: ["'Instrument Sans Variable'", "'Instrument Sans Fallback'", "'Readex Pro Variable'", ...ARABIC_SYSTEM, "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [
    // The palettes as CSS custom properties. Light by default; dark when the
    // system asks and the reader hasn't chosen light, or when they chose dark.
    plugin(({ addBase }) => addBase({
      // The motion tokens (src/motion/config.js) ride along; inert until the motion flag is on.
      ":root": { ...light, colorScheme: "light", ...motionVars() },
      "@media (prefers-color-scheme: dark)": { ':root:not([data-theme="light"])': { ...dark, colorScheme: "dark" } },
      ':root[data-theme="dark"]': { ...dark, colorScheme: "dark" },
    })),
  ],
};

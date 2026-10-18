// Draws the link-preview images for shared recipes, one per family and
// language (public/og/recipe-<family>-<en|ar>.png, 1200×630), with the
// site's fonts and colours. Run by hand when the design or a family label
// changes; the PNGs are committed. Uses Playwright's Chromium (a dev
// dependency already, for the e2e tests).
//   npx vite-node scripts/make-og-images.mjs   (vite-node resolves the src/ imports)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import KyphiraLogo from "../src/components/kx/KyphiraLogo.jsx";
import { PALETTES } from "../src/lib/theme.js";

const C = PALETTES.light; // a PNG can't follow the reader's theme: paper
import { TIER_COLORS } from "../src/lib/tiers.js";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";

const vfont = (pkg, file) => pathToFileURL(resolve("node_modules/@fontsource-variable", pkg, "files", file)).href;
const font = (pkg, file) => pathToFileURL(resolve("node_modules/@fontsource", pkg, "files", file)).href;
const FACES = `
  @font-face { font-family: "Instrument Serif"; src: url(${font("instrument-serif", "instrument-serif-latin-400-normal.woff2")}); }
  @font-face { font-family: "Instrument Serif"; font-style: italic; src: url(${font("instrument-serif", "instrument-serif-latin-400-italic.woff2")}); }
  @font-face { font-family: "Instrument Sans"; font-weight: 100 900; src: url(${vfont("instrument-sans", "instrument-sans-latin-wght-normal.woff2")}); }
  @font-face { font-family: "Readex Pro"; font-weight: 160 700; src: url(${vfont("readex-pro", "readex-pro-arabic-wght-normal.woff2")}); }
  @font-face { font-family: "Reem Kufi"; font-weight: 400 700; src: url(${vfont("reem-kufi", "reem-kufi-arabic-wght-normal.woff2")}); }
`;

// The Kyphira symbol (design/logo/): ink flacon and smoke, the brand's brass flame.
// The family's colour is the strip along the top of the frame. `currentColor` is the card's ink.
const flacon = () => renderToStaticMarkup(React.createElement(KyphiraLogo, { form: "symbol", height: 150 }));

function card(family, lang) {
  const m = lang === "ar" ? ar : en;
  const rtl = lang === "ar";
  const display = rtl ? "Reem Kufi, Instrument Serif" : "Instrument Serif";
  const ui = rtl ? "Readex Pro, Instrument Sans" : "Instrument Sans";
  return `<!doctype html><html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>
    ${FACES}
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; background: ${C.sand}; color: ${C.ink}; display: flex; }
    .frame { margin: 36px 52px 52px 36px; flex: 1; border: 2px solid ${C.ink}; background: ${C.card}; box-shadow: 16px 16px 0 ${C.line}; position: relative; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
    .strip { position: absolute; inset: 0 0 auto 0; height: 14px; background: ${TIER_COLORS[family]}; }
    .eyebrow { font: 500 28px ${ui}; color: ${C.dim}; letter-spacing: ${rtl ? "0" : "0.15em"}; text-transform: uppercase; }
    .family { font: 400 108px ${display}; letter-spacing: ${rtl ? "0" : "-0.04em"}; color: ${C.ink}; margin-top: 18px; line-height: ${rtl ? 1.3 : 1.05}; }
    .row { display: flex; align-items: flex-end; justify-content: space-between; }
    .brand { font: 400 52px ${display}; letter-spacing: -0.02em; color: ${C.ink}; } .tag { font: ${rtl ? "500 26px Readex Pro" : "italic 400 26px Instrument Serif"}; color: ${C.inkSoft}; margin-top: 8px; }
  </style></head><body><div class="frame"><div class="strip"></div>
    <div><div class="eyebrow">${m.recipe.eyebrow}</div><div class="family">${m.families[family].label}</div></div>
    <div class="row"><div><div class="brand">${m.brand}</div><div class="tag">${m.brandTagline}</div></div>${flacon()}</div>
  </div></body></html>`;
}

const out = resolve("public/og");
mkdirSync(out, { recursive: true });
// Installed Chrome locally (as playwright.config.js does), bundled Chromium in CI.
const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const family of Object.keys(TIER_COLORS)) {
  for (const lang of ["en", "ar"]) {
    await page.setContent(card(family, lang), { waitUntil: "load" });
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.screenshot({ path: `${out}/recipe-${family}-${lang}.png` });
  }
}
await browser.close();
console.log(`make-og-images: ${Object.keys(TIER_COLORS).length * 2} images in public/og`);

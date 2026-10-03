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
import { COLORS } from "../src/lib/theme.js";
import { TIER_COLORS } from "../src/lib/tiers.js";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";

const font = (pkg, file) => pathToFileURL(resolve("node_modules/@fontsource", pkg, "files", file)).href;
const FACES = `
  @font-face { font-family: Cormorant; font-style: italic; font-weight: 500; src: url(${font("cormorant-garamond", "cormorant-garamond-latin-500-italic.woff2")}); }
  @font-face { font-family: Grotesk; font-weight: 500; src: url(${font("space-grotesk", "space-grotesk-latin-500-normal.woff2")}); }
  @font-face { font-family: Amiri; font-weight: 700; src: url(${font("amiri", "amiri-arabic-700-normal.woff2")}); }
  @font-face { font-family: PlexArabic; font-weight: 500; src: url(${font("ibm-plex-sans-arabic", "ibm-plex-sans-arabic-arabic-500-normal.woff2")}); }
`;

const flacon = (color) => `<svg width="96" height="119" viewBox="0 0 42 52" fill="none">
  <rect x="14" y="4" width="14" height="9" rx="1.5" fill="${COLORS.brass}" />
  <rect x="17" y="0" width="8" height="5" rx="1" fill="${COLORS.brass}" />
  <path d="M10 15 C10 12 14 13 14 13 L28 13 C28 13 32 12 32 15 L34 46 C34 49.3 31.3 52 28 52 L14 52 C10.7 52 8 49.3 8 46 Z" fill="${color}" />
</svg>`;

function card(family, lang) {
  const m = lang === "ar" ? ar : en;
  const rtl = lang === "ar";
  const display = rtl ? "Amiri, Cormorant" : "Cormorant";
  const label = rtl ? "PlexArabic, Grotesk" : "Grotesk";
  return `<!doctype html><html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>
    ${FACES}
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; background: ${COLORS.paper}; color: ${COLORS.ink}; display: flex; }
    .frame { margin: 40px; flex: 1; border: 2px solid ${COLORS.line}; background: ${COLORS.card}; position: relative; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
    .strip { position: absolute; inset: 0 0 auto 0; height: 14px; background: ${TIER_COLORS[family]}; }
    .eyebrow { font: 500 30px ${label}; color: ${COLORS.amberDeep}; letter-spacing: ${rtl ? "0" : "0.14em"}; text-transform: uppercase; }
    .family { font: ${rtl ? "700" : "italic 500"} 108px ${display}; color: ${COLORS.forestDeep}; margin-top: 18px; line-height: 1.1; }
    .row { display: flex; align-items: flex-end; justify-content: space-between; }
    .brand { font: italic 500 52px Cormorant; color: ${COLORS.forestDeep}; }
  </style></head><body><div class="frame"><div class="strip"></div>
    <div><div class="eyebrow">${m.recipe.eyebrow}</div><div class="family">${m.families[family].label}</div></div>
    <div class="row"><div class="brand">The Scent Handbook</div>${flacon(TIER_COLORS[family])}</div>
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

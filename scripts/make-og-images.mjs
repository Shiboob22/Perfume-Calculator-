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
import { PALETTES } from "../src/lib/theme.js";

const C = PALETTES.light; // a PNG can't follow the reader's theme: paper
import { TIER_COLORS } from "../src/lib/tiers.js";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";

const font = (pkg, file) => pathToFileURL(resolve("node_modules/@fontsource", pkg, "files", file)).href;
const FACES = `
  @font-face { font-family: Poppins; font-weight: 500; src: url(${font("poppins", "poppins-latin-500-normal.woff2")}); }
  @font-face { font-family: Lora; font-style: italic; font-weight: 400; src: url(${font("lora", "lora-latin-400-italic.woff2")}); }
  @font-face { font-family: Tajawal; font-weight: 500; src: url(${font("tajawal", "tajawal-arabic-500-normal.woff2")}); }
`;

// The brand flacon (as FlaconMark): ink outline and cap, the family's colour as the liquid line.
const flacon = (color) => `<svg width="92" height="118" viewBox="0 0 28 36" fill="none">
  <rect x="10" y="1" width="8" height="5" fill="${C.ink}" />
  <path d="M12 6v3.5M16 6v3.5" stroke="${C.ink}" stroke-width="1.2" />
  <rect x="3.7" y="10.2" width="20.6" height="24.1" stroke="${C.ink}" stroke-width="1.2" />
  <path d="M6.5 24.5h15" stroke="${color}" stroke-width="2.6" />
</svg>`;

function card(family, lang) {
  const m = lang === "ar" ? ar : en;
  const rtl = lang === "ar";
  const display = rtl ? "Tajawal, Poppins" : "Poppins";
  return `<!doctype html><html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>
    ${FACES}
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; background: ${C.sand}; color: ${C.ink}; display: flex; }
    .frame { margin: 36px 52px 52px 36px; flex: 1; border: 2px solid ${C.ink}; background: ${C.card}; box-shadow: 16px 16px 0 ${C.line}; position: relative; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
    .strip { position: absolute; inset: 0 0 auto 0; height: 14px; background: ${TIER_COLORS[family]}; }
    .eyebrow { font: 500 28px ${display}; color: ${C.dim}; letter-spacing: ${rtl ? "0" : "0.15em"}; text-transform: uppercase; }
    .family { font: 500 108px ${display}; letter-spacing: ${rtl ? "0" : "-0.04em"}; color: ${C.ink}; margin-top: 18px; line-height: ${rtl ? 1.3 : 1.05}; }
    .row { display: flex; align-items: flex-end; justify-content: space-between; }
    .brand { font: 500 48px Poppins; letter-spacing: -0.03em; color: ${C.ink}; } .tag { font: ${rtl ? "500 26px Tajawal" : "italic 400 26px Lora"}; color: ${C.inkSoft}; margin-top: 8px; }
  </style></head><body><div class="frame"><div class="strip"></div>
    <div><div class="eyebrow">${m.recipe.eyebrow}</div><div class="family">${m.families[family].label}</div></div>
    <div class="row"><div><div class="brand">${m.brand}</div><div class="tag">${m.brandTagline}</div></div>${flacon(TIER_COLORS[family])}</div>
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

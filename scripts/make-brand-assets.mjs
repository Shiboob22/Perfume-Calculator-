// Writes the Kyphira mark as static SVG files for each design direction:
//   public/brand/kyphira-<A|B|C>-<ink|mono|reversed>.svg   the mark alone
//   public/brand/icon-<A|B|C>.svg                          app icon / favicon: paper tile
//   public/brand/icon-<A|B|C>-dark.svg                     the same on the ink ground
// Run: npx vite-node scripts/make-brand-assets.mjs
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import KyphiraMark, { MARK_VARIANTS } from "../src/components/kx/KyphiraMark.jsx";
import { PALETTES } from "../src/lib/theme.js";

const L = PALETTES.light;
const D = PALETTES.dark;
mkdirSync("public/brand", { recursive: true });
const svg = (el) => renderToStaticMarkup(el).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
const mark = (v, ink, smoke, size = 48) => React.createElement(KyphiraMark, { variant: v, size, inkColor: ink, smokeColor: smoke, title: "Kyphira" });

for (const v of MARK_VARIANTS) {
  writeFileSync(`public/brand/kyphira-${v}-ink.svg`, svg(mark(v, L.ink, L.resin)));
  writeFileSync(`public/brand/kyphira-${v}-mono.svg`, svg(mark(v, L.ink, L.ink)));
  writeFileSync(`public/brand/kyphira-${v}-reversed.svg`, svg(mark(v, D.ink, D.resin)));
  // A 64×64 tile: the 48×48 mark centred with a margin, on the page ground.
  const tile = (bg, ink, smoke) => {
    const inner = svg(mark(v, ink, smoke, 40)).replace(/^<svg [^>]*?>/, "").replace(/<\/svg>$/, "");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><g transform="translate(8 8) scale(${40 / 48})">${inner}</g></svg>`;
  };
  writeFileSync(`public/brand/icon-${v}.svg`, tile(L.paper, L.ink, L.resin));
  writeFileSync(`public/brand/icon-${v}-dark.svg`, tile(D.paper, D.ink, D.resin));
}
console.log(`brand: ${MARK_VARIANTS.length * 5} SVG files in public/brand/`);

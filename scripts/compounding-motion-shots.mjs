/* global document, window */
// Frames of the scroll scene in motion: for each stage, the viewport as the
// stage arrives (its top at 75% of the screen) and as it settles (its top at
// 8%), plus the scale's reading. EN and AR, phone and desktop. Needs a build
// with VITE_FLAG_COMPOUNDING=1 served by scripts/serve-dist.mjs.
//   node scripts/compounding-motion-shots.mjs <out-dir> [base-url]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [, , out, base = "http://localhost:4173"] = process.argv;
if (!out) throw new Error("usage: node scripts/compounding-motion-shots.mjs <out-dir> [base-url]");
mkdirSync(out, { recursive: true });
const STAGES = ["afternoon", "sixteen", "pour", "dusk", "burn", "handoff"];
const AT = [["arrive", 0.75], ["settled", 0.08]];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [locale, path] of [["en", "/"], ["ar", "/ar"]]) {
  for (const [name, width, height] of [["375", 375, 800], ["1440", 1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    for (const [i, id] of STAGES.entries()) {
      for (const [when, frac] of AT) {
        if (i === 0 && when === "arrive") continue; // the first stage is already on screen at load
        await page.evaluate(({ id, frac }) => {
          const el = document.querySelector(`[data-stage="${id}"]`);
          window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * frac);
        }, { id, frac });
        await page.waitForTimeout(350);
        await page.screenshot({ path: `${out}/${i + 1}-${id}_${when}_${locale}_${name}.png` });
      }
    }
    await ctx.close();
  }
}
await browser.close();

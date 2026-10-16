/* global document */
// Screenshots of each stage of the home page's scroll scene (static
// composition), EN and AR, phone and desktop. Needs a build with
// VITE_FLAG_COMPOUNDING=1 served by scripts/serve-dist.mjs.
//   node scripts/compounding-shots.mjs <out-dir> [base-url]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [, , out, base = "http://localhost:4173"] = process.argv;
if (!out) throw new Error("usage: node scripts/compounding-shots.mjs <out-dir> [base-url]");
mkdirSync(out, { recursive: true });
const STAGES = ["afternoon", "sixteen", "pour", "dusk", "burn", "handoff"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [locale, path] of [["en", "/"], ["ar", "/ar"]]) {
  for (const [name, width, height] of [["375", 375, 800], ["1440", 1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(locale, name, "horizontal overflow px:", overflow);
    for (const [i, id] of STAGES.entries()) {
      await page.locator(`[data-stage="${id}"]`).screenshot({ path: `${out}/${i + 1}-${id}_${locale}_${name}.png` });
    }
    await ctx.close();
  }
}
await browser.close();

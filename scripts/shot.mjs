// Full-page screenshots of a few URLs at 375 and 1440, light or dark.
//   node scripts/shot.mjs <outdir> <base-url> <path[,path…]> [light|dark] [widths]
// Uses CHROMIUM_PATH if set, else the installed Chrome.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [outdir, base, list, theme = "light", widths = "375,1440"] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" });
const errors = [];
for (const path of list.split(",")) {
  for (const w of widths.split(",").map(Number)) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 600 ? 812 : 900 }, reducedMotion: "reduce", colorScheme: theme });
    page.on("console", (m) => m.type() === "error" && errors.push(`${path}@${w}: ${m.text()}`));
    page.on("pageerror", (e) => errors.push(`${path}@${w} pageerror: ${e.message}`));
    await page.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch { /* storage blocked */ } }, theme);
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const name = `${path.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home"}-${theme}-${w}.png`;
    await page.screenshot({ path: `${outdir}/${name}`, fullPage: true });
    console.log(name, overflow ? "OVERFLOW-X" : "ok");
    await page.close();
  }
}
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();

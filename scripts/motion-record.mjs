/* global document, window, localStorage, innerHeight, innerWidth */
// Records the current build for the animation pass: for each page, at 1440 and
// 375, in English and Arabic, with motion ON, scrolls the page in steps and
// saves a filmstrip of viewport frames plus a full-page shot. Also logs console
// errors and horizontal overflow.
//   node scripts/motion-record.mjs <outdir> <base-url> [widths] [pages]
// Rooms are rendered through the dev-only /dev/<screen> route (no sign-in).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [outdir, base = "http://localhost:5199", widths = "1440,375", only] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });

const PAGES = [
  ["home", { en: "/", ar: "/ar" }],
  ["pricing", { en: "/pricing", ar: "/ar/pricing" }],
  ["library", { en: "/library", ar: "/ar/library" }],
  ["guide", { en: "/library/at-the-bench", ar: "/ar/library/at-the-bench" }],
  ["bench", { en: "/dev/calculator", ar: "/dev/calculator" }],
  ["journal", { en: "/dev/journal", ar: "/dev/journal" }],
  ["wardrobe", { en: "/dev/wardrobe", ar: "/dev/wardrobe" }],
  ["atlas", { en: "/dev/atlas", ar: "/dev/atlas" }],
  ["salon", { en: "/dev/salon", ar: "/dev/salon" }],
  ["nose", { en: "/dev/nose", ar: "/dev/nose" }],
  ["account", { en: "/dev/account", ar: "/dev/account" }],
  ["onboarding", { en: "/dev/onboarding", ar: "/dev/onboarding" }],
];
const want = only ? only.split(",") : null;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" });
const errors = [];
for (const [name, paths] of PAGES) {
  if (want && !want.includes(name)) continue;
  for (const lang of ["en", "ar"]) {
    for (const w of widths.split(",").map(Number)) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 812 : 900 }, deviceScaleFactor: 1, reducedMotion: "no-preference", colorScheme: process.env.THEME || "light" });
      const page = await ctx.newPage();
      page.on("console", (m) => m.type() === "error" && errors.push(`${name}/${lang}@${w}: ${m.text()}`));
      page.on("pageerror", (e) => errors.push(`${name}/${lang}@${w} pageerror: ${e.message}`));
      await page.addInitScript(([l, theme]) => { try { localStorage.setItem("sh-locale", l); localStorage.setItem("theme", theme); } catch { /* blocked */ } }, [lang, process.env.THEME || "light"]);
      await page.goto(base + paths[lang], { waitUntil: "load" });
      await page.waitForTimeout(1500);
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const vh = await page.evaluate(() => innerHeight);
      const frames = Math.min(10, Math.max(1, Math.ceil(total / vh)));
      const step = frames > 1 ? (total - vh) / (frames - 1) : 0;
      for (let i = 0; i < frames; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), Math.round(step * i));
        await page.waitForTimeout(450);
        await page.screenshot({ path: `${outdir}/${process.env.THEME === "dark" ? "dark-" : ""}${name}-${lang}-${w}-f${String(i).padStart(2, "0")}.png` });
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      console.log(`${name} ${lang} ${w}: ${total}px, ${frames} frames${overflow ? " OVERFLOW-X" : ""}`);
      await ctx.close();
    }
  }
}
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();

/* global document, window, innerHeight, getComputedStyle, localStorage */
// Scrubs a pinned stretch of the home page forwards, then backwards, and saves a frame at each stop.
//   node scripts/pin-scrub.mjs <outdir> <base> <selector> [lang] [width] [stops]
import { chromium, firefox, webkit } from "@playwright/test";
const ENGINE = process.env.ENGINE || "chromium"; // chromium | firefox | webkit
const THEME = process.env.THEME || "light";
import { mkdirSync } from "node:fs";
const [outdir, base = "http://localhost:5199", sel = ".wg", lang = "en", width = "1440", stops = "0,0.15,0.3,0.45,0.6,0.75,0.9,1"] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const browser = ENGINE === "firefox" ? await firefox.launch() : ENGINE === "webkit" ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: +width, height: +width < 600 ? 812 : 900 }, reducedMotion: "no-preference" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => m.type() === "error" && !/401/.test(m.text()) && errs.push(m.text()));
await page.addInitScript(([l, th]) => { try { localStorage.setItem("sh-locale", l); localStorage.setItem("theme", th); } catch { /* */ } }, [lang, THEME]);
await page.goto(base + (lang === "ar" ? "/ar" : "/"), { waitUntil: "load" });
await page.waitForTimeout(1500);
const geo = await page.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { top: r.top + window.scrollY, h: r.height, vh: innerHeight }; }, sel);
console.log(ENGINE, THEME, JSON.stringify(geo), "fallback:", await page.evaluate(() => document.querySelector("[data-compounding]")?.hasAttribute("data-fallback")), "native:", await page.evaluate(() => CSS.supports("animation-timeline: view()")));
const list = stops.split(",").map(Number);
const order = [...list, ...[...list].reverse().slice(1)];
let i = 0;
for (const f of order) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(geo.top + f * (geo.h - geo.vh)));
  await page.waitForTimeout(350);
  const info = await page.evaluate(() => { const r = document.querySelector(".wg-read"); return r ? getComputedStyle(r, "::before").content : ""; });
  await page.screenshot({ path: `${outdir}/${ENGINE}-${THEME}-${sel.replace(/\W/g, "")}-${lang}-${width}-${String(i++).padStart(2, "0")}-${Math.round(f * 100)}${i > list.length ? "back" : ""}.png` });
  console.log(f, info);
}
console.log(errs.length ? "ERRORS " + errs.join("; ") : "no errors");
await browser.close();

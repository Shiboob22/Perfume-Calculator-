/* global window */
// Screen recordings for the animation pass (webm): the home scroll, then one
// short capture per room through the dev routes. Needs `vite dev` with the flags on.
//   node scripts/record-videos.mjs <outdir> [base-url]
import { chromium } from "@playwright/test";
import { mkdirSync, renameSync, readdirSync } from "node:fs";
const [out, base = "http://localhost:5199"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" });
async function clip(name, path, run, { width = 1440, height = 900, lang = "en" } = {}) {
  const dir = `${out}/.tmp-${name}`;
  const ctx = await browser.newContext({ viewport: { width, height }, recordVideo: { dir, size: { width: Math.min(width, 1280), height: Math.round(Math.min(width, 1280) * height / width) } } });
  const page = await ctx.newPage();
  await page.addInitScript((l) => { try { localStorage.setItem("sh-locale", l); localStorage.setItem("theme", "light"); } catch { /* */ } }, lang);
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForTimeout(1800);
  await run(page);
  await ctx.close();
  const f = readdirSync(dir).find((x) => x.endsWith(".webm"));
  renameSync(`${dir}/${f}`, `${out}/${name}.webm`);
}
const scrollTo = async (page, y, ms = 1400) => { const steps = 28; const from = await page.evaluate(() => window.scrollY); for (let i = 1; i <= steps; i++) { await page.evaluate((v) => window.scrollTo(0, v), from + (y - from) * i / steps); await page.waitForTimeout(ms / steps); } };
const total = (page) => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
await clip("home-scroll-en-1440", "/", async (p) => { const t = await total(p); await scrollTo(p, t, 9000); await scrollTo(p, 0, 3500); });
await clip("home-scroll-ar-1440", "/ar", async (p) => { const t = await total(p); await scrollTo(p, t, 9000); }, { lang: "ar" });
await clip("home-scroll-en-375", "/", async (p) => { const t = await total(p); await scrollTo(p, t, 9000); }, { width: 375, height: 812 });
await clip("bench", "/dev/calculator", async (p) => { await p.getByRole("button", { name: /50 mL/ }).first().click().catch(() => {}); await p.waitForTimeout(500); await p.getByRole("button", { name: /30 Extrait|Extrait/ }).first().click().catch(() => {}); await p.waitForTimeout(1500); });
for (const room of ["wardrobe", "atlas", "salon", "nose", "account"]) await clip(room, `/dev/${room}`, async (p) => { await p.mouse.move(400, 300); await p.mouse.move(900, 500, { steps: 20 }); await p.waitForTimeout(1500); });
await clip("library-opener", "/library/at-the-bench", async (p) => { await scrollTo(p, 1200, 2500); });
await browser.close();
console.log("done");

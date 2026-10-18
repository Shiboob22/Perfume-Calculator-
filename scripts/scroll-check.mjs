/* global document, window, CSS, DOMMatrix, getComputedStyle, innerHeight */
// Scrolls the home page with motion on and reports the scene's marks at a few
// positions: the beam's and the pan's scale, the gauge reading.
//   node scripts/scroll-check.mjs [base-url] [path]
import { chromium } from "@playwright/test";

const base = process.argv[2] || "http://localhost:4173";
const path = process.argv[3] || "/";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base + path, { waitUntil: "networkidle" });
const native = await page.evaluate(() => CSS.supports("animation-timeline: view()"));
console.log("native scroll timelines:", native);
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (const f of [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1]) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * f));
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const scale = (el) => (el ? new DOMMatrix(getComputedStyle(el).transform).a.toFixed(2) : "-");
    const beams = [...document.querySelectorAll(".m-beam")].map(scale);
    const pan = document.querySelector(".m-pan");
    const fill = document.querySelector(".cmp-fill");
    return { beams: beams.join("/"), panY: pan ? new DOMMatrix(getComputedStyle(pan).transform).d.toFixed(2) : "-", gaugeFill: fill ? new DOMMatrix(getComputedStyle(fill).transform).d.toFixed(2) : "-" };
  });
  console.log(`${String(Math.round(f * 100)).padStart(3)}%`, JSON.stringify(r));
}
await browser.close();

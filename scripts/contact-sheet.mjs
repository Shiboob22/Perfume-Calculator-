// Tiles a set of PNGs into one image: node scripts/contact-sheet.mjs <out.png> <cols> <tileWidth> <files…>
import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
const [out, cols, tw, ...files] = process.argv.slice(2);
const html = `<body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:6px">${files.map((f) => `<img src="file://${resolve(f)}" style="width:${tw}px;display:block">`).join("")}</body>`;
const htmlPath = out.replace(/\.png$/, ".html");
writeFileSync(htmlPath, html);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" });
const page = await browser.newPage({ viewport: { width: (+tw + 6) * +cols, height: 400 } });
await page.goto("file://" + resolve(htmlPath)); await page.waitForLoadState("load"); await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: true });
await browser.close();

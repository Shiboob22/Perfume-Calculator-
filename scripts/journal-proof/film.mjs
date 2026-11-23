/* global document, localStorage, scrollY, scrollTo, requestAnimationFrame */
// Records the J6 film and stills against the signed-in harness (see docs/redesign/journal/J6-report.md).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = process.env.OUT || "docs/redesign/journal/film"; mkdirSync(OUT, { recursive: true });
const ID = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${n}`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, recordVideo: { dir: OUT, size: { width: 390, height: 844 } }, reducedMotion: "no-preference" });
await ctx.addInitScript(() => { try { localStorage.setItem("kyphira.renameNoticeDismissed", "1"); } catch {} });
const page = await ctx.newPage();
const pause = (ms) => page.waitForTimeout(ms);
const still = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const smooth = async (y, ms = 900) => { await page.evaluate(([y, ms]) => new Promise((r) => { const s = scrollY, t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / ms); scrollTo(0, s + (y - s) * (1 - Math.pow(1 - k, 3))); k < 1 ? requestAnimationFrame(step) : r(); }; requestAnimationFrame(step); }), [y, ms]); };

await page.goto("http://127.0.0.1:4180/journal?batch=" + ID(4));
await page.getByRole("region", { name: "Smell today" }).waitFor();
await pause(1800); await still("1-smell-today");
// A quick note.
await page.getByRole("button", { name: "Add a note" }).first().click();
await pause(900);
const dlg = page.getByRole("dialog"); await dlg.getByRole("button", { name: "5 of 5", exact: true }).click(); await pause(400);
await dlg.getByRole("button", { name: "Rounder" }).click(); await pause(400);
await dlg.getByLabel("Note", { exact: true }).fill("Soft and round now."); await pause(700);
await still("2-quick-note");
await dlg.getByRole("button", { name: "Save note" }).click(); await pause(1800);
// The curve of a batch with notes.
await page.goto("http://127.0.0.1:4180/journal?batch=" + ID(7));
await page.locator("[data-curve]").waitFor(); await pause(600);
await page.locator("[data-curve]").scrollIntoViewIfNeeded(); await smooth(await page.evaluate(() => document.querySelector("[data-curve]").getBoundingClientRect().top + scrollY - 70)); await pause(1800);
await still("3-the-curve");
await smooth(await page.evaluate(() => document.querySelector("[data-oil]").getBoundingClientRect().top + scrollY - 70)); await pause(1800);
await still("4-your-batches-of-this-oil");
await smooth(await page.evaluate(() => document.querySelector("[data-compare]").getBoundingClientRect().top + scrollY - 70)); await pause(600);
await page.locator("#journal-compare-pick").selectOption(ID(6)); await pause(1500);
await still("5-compare");
await smooth(await page.evaluate(() => document.querySelector("[data-record]").getBoundingClientRect().top + scrollY - 70)); await pause(1500);
await page.close(); await ctx.close(); await browser.close();

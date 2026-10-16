/* global document, window, requestAnimationFrame */
// LCP, CLS and frame rate of the scroll scene on a throttled phone profile:
// 375x667 at 2x, CPU 4x slower, network 1.6 Mbps down / 150 ms. Needs a build
// with VITE_FLAG_COMPOUNDING=1 served by scripts/serve-dist.mjs.
//   node scripts/compounding-perf.mjs [base-url] [runs]
import { chromium } from "@playwright/test";

const base = process.argv[2] || "http://localhost:4173";
const runs = Number(process.argv[3] || 3);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const out = {};
for (const [name, path, extra] of [["en", "/", {}], ["ar", "/ar", {}], ["en-lowpower", "/", { low: true }]]) {
  const res = [];
  for (let r = 0; r < runs; r++) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await page.addInitScript((low) => {
      window.__m = { lcp: 0, cls: 0 };
      if (low) window.__cmp = { low: true };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    }, Boolean(extra.low));
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const load = await page.evaluate(() => ({ ...window.__m }));
    // Scroll the whole scene with touch-like gestures while counting frames.
    await page.evaluate(() => { window.__f = []; const t = (n) => { window.__f.push(n); requestAnimationFrame(t); }; requestAnimationFrame(t); });
    const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const t0 = Date.now();
    for (let y = 0; y < total; y += 400) {
      await cdp.send("Input.synthesizeScrollGesture", { x: 180, y: 500, yDistance: -400, speed: 1600, gestureSourceType: "touch" });
    }
    const secs = (Date.now() - t0) / 1000;
    const f = await page.evaluate(() => window.__f);
    const dts = f.slice(1).map((v, i) => v - f[i]);
    const slow = dts.filter((d) => d > 20).length;
    const long = dts.filter((d) => d > 50).length;
    const sorted = [...dts].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const jsHeap = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__m.cls);
    res.push({ lcp: Math.round(load.lcp), cls: Number(Math.max(load.cls, after).toFixed(4)), fps: Number((f.length / secs).toFixed(1)), p95ms: Number(p95.toFixed(1)), over20ms: slow, over50ms: long, frames: f.length, heapMB: Number((jsHeap / 1048576).toFixed(1)) });
    await ctx.close();
  }
  out[name] = { median: Object.fromEntries(Object.keys(res[0]).map((k) => [k, median(res.map((x) => x[k]))])), runs: res };
}
await browser.close();
console.log(JSON.stringify(out, null, 2));

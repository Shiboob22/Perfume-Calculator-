import { test, expect } from "@playwright/test";
import http from "node:http";

// The service worker (scripts/build-sw.mjs) asks the network for pages first:
// after a release, the very next load shows the new page, not the copy kept
// from the last visit (the home page used to stay on the previous release
// until the worker updated in the background). Offline, a page seen before
// comes from the cache and any other from the app shell.

test.skip(({ browserName }) => browserName !== "chromium", "offline emulation and service worker control are checked in Chromium");
test.describe.configure({ mode: "serial" });

// A front for the test server that can "release" a new build: once released,
// every page it serves carries <meta name="release">. Its own origin, so its
// service worker is not shared with other tests.
async function releasableSite() {
  const site = { released: false };
  const server = http.createServer((req, res) => {
    const headers = { ...req.headers, host: "localhost:4173" };
    delete headers["accept-encoding"];
    const up = http.request({ host: "localhost", port: 4173, path: req.url, method: req.method, headers }, (r) => {
      if (!site.released || !String(r.headers["content-type"]).includes("text/html")) {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
        return;
      }
      let body = "";
      r.setEncoding("utf8");
      r.on("data", (c) => { body += c; });
      r.on("end", () => {
        const out = body.replace("<head>", '<head><meta name="release" content="next">');
        const h = { ...r.headers };
        delete h["content-length"];
        res.writeHead(r.statusCode, h);
        res.end(out);
      });
    });
    req.pipe(up);
  });
  await new Promise((done) => server.listen(0, "localhost", done));
  site.url = `http://localhost:${server.address().port}`;
  site.close = () => new Promise((done) => server.close(done));
  return site;
}

async function controlled(page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

const released = (page) => page.locator('meta[name="release"]');

test("after a release, the next load of a page or the app shows the new build", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one browser is enough");
  const site = await releasableSite();
  try {
    await page.goto(`${site.url}/`);
    await controlled(page);
    await page.goto(`${site.url}/bench`);
    await page.goto(`${site.url}/ar`);
    await expect(released(page)).toHaveCount(0);

    site.released = true;
    for (const path of ["/", "/ar", "/bench"]) {
      await page.goto(`${site.url}${path}`);
      expect(await page.evaluate(() => navigator.serviceWorker.controller !== null), path).toBe(true);
      await expect(released(page), path).toHaveCount(1);
    }
  } finally {
    await site.close();
  }
});

test("offline, a page seen before comes from the cache and any other from the app shell", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "one browser is enough");
  await page.goto("/");
  await controlled(page);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator("[data-home-bench]")).toBeVisible();
    await page.goto("/library/the-calculation"); // never visited
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

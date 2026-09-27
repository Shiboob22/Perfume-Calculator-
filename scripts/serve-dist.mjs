// Serves dist/ the way Vercel does, for the Playwright tests: a file or a
// folder's index.html; /app/* falls back to the app shell (vercel.json
// rewrite); anything else is 404.html with status 404. /api is not served
// here — the e2e tests cover what works without the functions.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = join(process.cwd(), "dist");
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".xml": "application/xml", ".txt": "text/plain",
};

async function file(path) {
  try {
    const s = await stat(path);
    if (s.isFile()) return path;
    if (s.isDirectory()) return (await stat(join(path, "index.html"))).isFile() ? join(path, "index.html") : null;
  } catch {}
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const safe = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  // Vercel's own platform scripts (Web Analytics): an empty stub here.
  if (url.pathname.startsWith("/_vercel/")) {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    return res.end("");
  }
  let status = 200;
  let path = await file(join(ROOT, safe));
  if (!path && (url.pathname === "/app" || url.pathname.startsWith("/app/"))) path = join(ROOT, "app", "index.html");
  if (!path) { status = 404; path = join(ROOT, "404.html"); }
  const body = await readFile(path);
  res.writeHead(status, {
    "Content-Type": TYPES[extname(path)] || "application/octet-stream",
    "Cache-Control": path.endsWith("sw.js") ? "no-cache" : "no-store",
  });
  res.end(body);
}).listen(PORT, () => console.log(`serving dist/ on http://localhost:${PORT}`));

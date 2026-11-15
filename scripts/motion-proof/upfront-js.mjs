// Motion M6: the JavaScript a first visit downloads before anything else,
// gzipped: the module script and its modulepreloads in a built page.
// Usage: node scripts/motion-proof/upfront-js.mjs [dist] -> JSON per page.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const dist = process.argv[2] || "dist";
const pages = { home: "index.html", homeAr: "ar/index.html", pricing: "pricing/index.html", app: "app/index.html" };
const out = {};
for (const [name, file] of Object.entries(pages)) {
  const p = join(dist, file);
  if (!existsSync(p)) continue;
  const html = readFileSync(p, "utf8");
  const srcs = new Set([...html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g), ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map((m) => m[1]));
  let gz = 0;
  for (const s of srcs) gz += gzipSync(readFileSync(join(dist, s.replace(/^\//, "")))).length;
  out[name] = { files: srcs.size, kbGzip: Math.round(gz / 102.4) / 10 };
}
console.log(JSON.stringify(out, null, 2));

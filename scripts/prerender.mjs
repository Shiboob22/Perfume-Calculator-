// Writes every public page as static HTML after `vite build`, so the site is
// readable without JavaScript and crawlable: per-page title, description,
// canonical, hreflang en/ar and Open Graph, plus sitemap.xml and robots.txt.
// The signed-in app (/app) gets the plain shell and renders in the browser.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const DIST = "dist";
const { render, publicPaths, headFor, headHtml } = await import(pathToFileURL(join("dist-ssr", "entry-server.js")).href);
const template = readFileSync(join(DIST, "index.html"), "utf8");

for (const marker of ['<html lang="en">', "<title>Kyphira</title>", '<div id="root"></div>']) {
  if (!template.includes(marker)) throw new Error(`prerender: index.html no longer contains ${marker}`);
}

function write(file, html) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// The faces above the fold (headline, body, buttons, figures): preloaded so first paint already uses
// them. Without this, the headline reflows when the display face arrives and
// pushes the page down (measured CLS 0.11 on the home page on Slow 4G).
const CRITICAL_FONTS = ["inter-tight-latin-wght-normal-", "fraunces-latin-opsz-normal-", "fraunces-latin-opsz-italic-", "ibm-plex-mono-latin-400-normal-"];
const assets = readdirSync(join(DIST, "assets"));
const preloads = CRITICAL_FONTS.map((prefix) => {
  const file = assets.find((f) => f.startsWith(prefix) && f.endsWith(".woff2"));
  if (!file) throw new Error(`prerender: no built font starting ${prefix}`);
  return `<link rel="preload" href="/assets/${file}" as="font" type="font/woff2" crossorigin />`;
}).join("\n    ");

// Arabic pages: the Arabic faces and their @font-face rules are in the first
// response (not fetched after hydration), with font-display: optional. A face
// that is not in by first paint is left out for that view (the system Arabic
// font stays) instead of swapping in later and moving the lines; on the next
// view it comes from the cache. That is what keeps the layout shift at 0.
// Public pages only: the app keeps the swapping copies it loads itself.
const arabicCssFiles = assets.filter((f) => f.startsWith("arabic-") && f.endsWith(".css"));
const arabicOptional = arabicCssFiles.map((f) => readFileSync(join(DIST, "assets", f), "utf8").replaceAll("font-display:swap", "font-display:optional").replaceAll("font-display: swap", "font-display: optional")).join("\n");
writeFileSync(join(DIST, "assets", "arabic-public.css"), arabicOptional);
const arabicHead = [
  '<link rel="stylesheet" href="/assets/arabic-public.css" data-ar-fonts />',
  ...assets.filter((f) => /^(ibm-plex-sans-arabic-arabic-(400|500|600)|amiri-arabic-400)-normal-.*\.woff2$/.test(f)).map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin />`),
].join("\n    ");

function page(url, head) {
  return template
    .replace('<html lang="en">', `<html lang="${head.locale}" dir="${head.dir}">`)
    .replace("<title>Kyphira</title>", `${preloads}\n    ${head.locale === "ar" ? `${arabicHead}\n    ` : ""}${headHtml(head)}`)
    .replace('<div id="root"></div>', `<div id="root">${render(url)}</div>`);
}

// The app shell first: index.html is about to become the prerendered home.
write(join(DIST, "app", "index.html"), template.replace("<title>Kyphira</title>", '<title>Kyphira</title>\n    <meta name="robots" content="noindex" />'));

const paths = publicPaths();
for (const url of paths) {
  const head = headFor(url);
  write(url === "/" ? join(DIST, "index.html") : join(DIST, url, "index.html"), page(url, head));
}

// Not-found page for any other URL (Vercel serves 404.html).
const notFound = { ...headFor("/"), title: "Page not found — Kyphira" };
write(join(DIST, "404.html"), page("/this-page-does-not-exist", notFound).replace("<head>", '<head>\n    <meta name="robots" content="noindex" />'));

const site = headFor("/").canonical.replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);
const entries = paths.filter((p) => !p.startsWith("/ar") && !headFor(p).noindex).map((p) => {
  const h = headFor(p);
  const alt = Object.entries(h.alternates).map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`).join("\n");
  const both = [h.alternates.en, h.alternates.ar].filter(Boolean); // no Arabic draft guides
  return both.map((loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n${alt}\n  </url>`).join("\n");
});
write(join(DIST, "sitemap-pages.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`);
// The sitemap index: the pages above, written now, and the shared recipes,
// listed live by api/recipe.ts (they change between builds).
write(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${site}/sitemap-pages.xml</loc><lastmod>${today}</lastmod></sitemap>\n  <sitemap><loc>${site}/sitemap-recipes.xml</loc></sitemap>\n</sitemapindex>\n`);
write(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /bench\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`);

// The stylesheet for the server-rendered recipe pages (api/recipe.ts), at a
// name that doesn't change between builds: the site CSS plus the Arabic
// @font-face rules (fonts download only when Arabic text needs them).
const css = assets.filter((f) => f.endsWith(".css"));
const siteCss = css.filter((f) => f.startsWith("index-"));
if (siteCss.length !== 1) throw new Error(`prerender: expected one index-*.css, found ${siteCss.length}`);
const arabicCss = css.filter((f) => f.startsWith("arabic-"));
write(join(DIST, "r-assets", "site.css"), [...siteCss, ...arabicCss].map((f) => readFileSync(join(DIST, "assets", f), "utf8")).join("\n"));

console.log(`prerender: ${paths.length} pages, sitemap index, robots.txt, 404.html, app shell, recipe stylesheet`);

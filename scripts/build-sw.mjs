// Last build step: the service worker, so the app and bench mode open with no
// connection once visited. /api is never cached; batches logged offline wait
// in the outbox instead.
//
// Pages come from the network first. A page answered from the cache first
// stays on the previous release after a deploy until the worker updates in
// the background (one or two visits later, longer on an iPhone that closes
// Safari before the download ends): the home page kept the old bench card
// after section I shipped. So every page load asks the server, and the copy
// kept from the last visit is used only offline or after NETWORK_TIMEOUT_S;
// a page never visited falls back to the app shell, which renders any route.
// The hashed scripts, styles and fonts stay precached: a new release has new
// names, so they are never stale. The two stylesheets with fixed names that
// pages link directly are fetched like pages.
import { generateSW } from "workbox-build";
import { writeFileSync } from "node:fs";

// The live release, for the app's update check (src/lib/freshness.js). Never
// precached (not in globPatterns) and served with no-store (vercel.json).
writeFileSync("dist/version.json", JSON.stringify({ release: process.env.VITE_RELEASE || (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7) }));

const NETWORK_TIMEOUT_S = 3;

const { count, size, warnings } = await generateSW({
  globDirectory: "dist",
  // HTML is not precached (pages are network first), except the app shell as the offline fallback.
  globPatterns: ["**/*.{js,css,woff2,svg,webmanifest}", "app/index.html"],
  // The home page's three.js chunk (about 125 KB gzipped) loads only where the
  // 3D pour runs; precaching it would send it to every visitor.
  globIgnores: ["sw.js", "workbox-*.js", "brand/**", "assets/arabic-public.css", "r-assets/**", "assets/scene-*.js"],
  swDest: "dist/sw.js",
  navigationPreload: true,
  runtimeCaching: [
    {
      urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/api/"),
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: NETWORK_TIMEOUT_S,
        expiration: { maxEntries: 60 },
        precacheFallback: { fallbackURL: "/app/index.html" },
      },
    },
    {
      urlPattern: ({ url }) => url.pathname === "/assets/arabic-public.css" || url.pathname === "/r-assets/site.css",
      handler: "NetworkFirst",
      options: { cacheName: "page-styles", networkTimeoutSeconds: NETWORK_TIMEOUT_S, expiration: { maxEntries: 4 } },
    },
  ],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
});
for (const w of warnings) console.warn("build-sw:", w);
console.log(`build-sw: precached ${count} files (${Math.round(size / 1024)} KiB)`);

// Last build step: a service worker that precaches the finished dist/ —
// after prerender, so /app/index.html and every page are included — so the
// app and bench mode open with no connection once visited. /api is never
// cached; batches logged offline wait in the outbox instead.
import { generateSW } from "workbox-build";

const { count, size, warnings } = await generateSW({
  globDirectory: "dist",
  globPatterns: ["**/*.{js,css,html,woff2,svg,webmanifest}"],
  globIgnores: ["sw.js", "workbox-*.js"],
  swDest: "dist/sw.js",
  navigateFallback: "/app/index.html",
  navigateFallbackAllowlist: [/^\/app(\/|$)/],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
});
for (const w of warnings) console.warn("build-sw:", w);
console.log(`build-sw: precached ${count} files (${Math.round(size / 1024)} KiB)`);

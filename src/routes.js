// URL layout for the signed-in app and the public library. No imports: the
// router, the build scripts and the tests all read it.
//
// Kyphira's rooms: The Bench lives at /bench (calculator) and /bench/journal
// (batches); The Wardrobe at /wardrobe (behind a flag, see lib/flags.js); the rest of the app tabs stay under /app/<tab> until their own
// rooms are built. The Library replaces /guides.

// Paths that serve the signed-in app shell.
export const APP_PREFIXES = ["/app", "/bench", "/wardrobe"];

export function isAppPath(pathname) {
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// The URL of an app tab.
export function tabPath(id) {
  if (id === "calculator") return "/bench";
  if (id === "batches") return "/bench/journal";
  if (id === "wardrobe") return "/wardrobe";
  return `/app/${id}`;
}

// The app tab (or page) a URL shows. `param` is the :tab segment of /app/:tab.
export function tabFromPath(pathname, param) {
  if (pathname === "/bench") return "calculator";
  if (pathname === "/bench/journal") return "batches";
  if (pathname === "/wardrobe" || pathname.startsWith("/wardrobe/")) return "wardrobe";
  return param;
}

// Old address → new address (permanent). Query strings are kept by the
// platform. Mirrored in vercel.json "redirects" and scripts/serve-dist.mjs;
// src/routes.test.js checks the three agree.
export const REDIRECTS = [
  { source: "/app/calculator", destination: "/bench" },
  { source: "/app/batches", destination: "/bench/journal" },
  { source: "/guides", destination: "/library" },
  { source: "/guides/:slug", destination: "/library/:slug" },
  { source: "/ar/guides", destination: "/ar/library" },
  { source: "/ar/guides/:slug", destination: "/ar/library/:slug" },
];

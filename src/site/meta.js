// Public routes and their <head>: one source for the build-time prerender
// (scripts/prerender.mjs) and for client-side navigation.
import { createTranslator } from "../i18n/core";
import en from "../i18n/messages/en";
import ar from "../i18n/messages/ar";
import { GUIDES, guideBySlug } from "../content/guides";

const CATALOGS = { en, ar };

// The canonical origin. Set VITE_SITE_URL once the custom domain exists.
export const SITE_URL = (import.meta.env?.VITE_SITE_URL || "https://scent-handbook-app.vercel.app").replace(/\/$/, "");

// "/guides" in Arabic is "/ar/guides"; "/" is "/ar".
export function localePath(locale, path) {
  if (locale !== "ar") return path;
  return path === "/" ? "/ar" : `/ar${path}`;
}

// Split "/ar/guides/x" into { locale: "ar", path: "/guides/x" }.
export function parsePath(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/ar") return { locale: "ar", path: "/" };
  if (clean.startsWith("/ar/")) return { locale: "ar", path: clean.slice(3) };
  return { locale: "en", path: clean };
}

// Every public page, in both languages: what the prerender writes out.
export function publicPaths() {
  const base = ["/", "/pricing", "/guides", ...GUIDES.map((g) => `/guides/${g.slug}`)];
  return base.flatMap((p) => [localePath("en", p), localePath("ar", p)]);
}

// Title, description and alternates for a public URL; null for unknown pages.
export function headFor(pathname) {
  const { locale, path } = parsePath(pathname);
  const t = createTranslator(locale, CATALOGS);
  let title;
  let description;
  let type = "website";

  if (path === "/") {
    title = t("site.home.metaTitle");
    description = t("site.home.metaDescription");
  } else if (path === "/pricing") {
    title = t("site.pricing.metaTitle");
    description = t("site.pricing.metaDescription");
  } else if (path === "/guides") {
    title = t("site.guides.metaTitle");
    description = t("site.guides.metaDescription");
  } else if (path.startsWith("/guides/")) {
    const guide = guideBySlug(path.slice("/guides/".length));
    if (!guide) return null;
    const g = guide[locale];
    title = `${g.title} — The Scent Handbook`;
    description = g.summary;
    type = "article";
  } else {
    return null;
  }

  return {
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    title,
    description,
    type,
    canonical: SITE_URL + localePath(locale, path),
    alternates: {
      en: SITE_URL + localePath("en", path),
      ar: SITE_URL + localePath("ar", path),
      "x-default": SITE_URL + localePath("en", path),
    },
  };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// The <head> tags for a page, as HTML.
export function headHtml(head) {
  return [
    `<title>${esc(head.title)}</title>`,
    `<meta name="description" content="${esc(head.description)}" />`,
    `<link rel="canonical" href="${esc(head.canonical)}" />`,
    ...Object.entries(head.alternates).map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${esc(href)}" />`),
    `<meta property="og:type" content="${head.type}" />`,
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta property="og:url" content="${esc(head.canonical)}" />`,
    `<meta property="og:site_name" content="The Scent Handbook" />`,
    `<meta property="og:locale" content="${head.locale === "ar" ? "ar_EG" : "en_US"}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join("\n    ");
}

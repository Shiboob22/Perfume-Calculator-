// The public page of a shared recipe (/r/<slug>, /ar/r/<slug>), as a whole
// HTML document. Rendered per request by api/recipe.ts from the row
// recipe_by_slug() returns, which holds only public fields (0013). Plain
// HTML and the site's stylesheet, no JavaScript: the same page for people,
// crawlers and link previews. Every value from the database is escaped
// here, whatever was cleaned before it was stored.
// Its Tailwind classes are picked up from this file at build time.
import { createTranslator } from "../i18n/core";
import en from "../i18n/messages/en";
import ar from "../i18n/messages/ar";
import { COLORS } from "./theme";

const CATALOGS = { en, ar };
const OG_LOCALE = { en: "en_US", ar: "ar_EG" };
const FAMILIES = ["fresh", "floral", "woody", "oriental", "gourmand"];

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 84.5 → "84.50" (grams, as on the scale); 100 → "100" (bottle sizes).
const grams = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);
const size = (n) => String(Math.round(Number(n) * 100) / 100);

export const recipePath = (lang, slug) => `${lang === "ar" ? "/ar" : ""}/r/${encodeURIComponent(slug)}`;

/** The calculator link that rebuilds this recipe ("Make this blend"). */
export function calculatorHref(r) {
  const byWeight = r.basis === "weight";
  const q = new URLSearchParams({
    family: r.tier,
    conc: size(r.concentration_pct),
    size: size(byWeight ? r.total_g : r.total_ml),
    unit: byWeight ? "g" : "ml",
  });
  return `/app/calculator?${q}`;
}

function bottleText(t, r) {
  return r.basis === "weight" ? t("recipe.grams", { g: size(r.total_g) }) : t("recipe.ml", { n: size(r.total_ml) });
}

// The note, kept as the blender wrote it: paragraphs and line breaks.
function noteHtml(note) {
  return String(note)
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/**
 * The page. `site` is the canonical origin, `stylesheet` the site CSS URL,
 * `reportEmail` where "Report this recipe" writes to (the link is left out
 * without one).
 */
export function recipePageHtml(r, { lang = "en", site, stylesheet, reportEmail = "" }) {
  const locale = lang === "ar" ? "ar" : "en";
  const other = locale === "ar" ? "en" : "ar";
  const t = createTranslator(locale, CATALOGS);
  const family = FAMILIES.includes(r.tier) ? t(`families.${r.tier}.label`) : r.tier;
  const pct = size(r.concentration_pct);
  const basis = r.basis === "weight" ? "weight" : "volume";
  const url = site + recipePath(locale, r.slug);
  const title = t("recipe.metaTitle", { name: r.fragrance_name, pct });
  const description = r.public_note
    ? Array.from(r.public_note.replace(/\s+/g, " ")).slice(0, 155).join("")
    : t("recipe.metaDescription", { family, pct, size: bottleText(t, r) });
  const image = `${site}/og/recipe-${FAMILIES.includes(r.tier) ? r.tier : "fresh"}-${locale}.png`;

  const head = [
    `<meta charset="UTF-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<title>${esc(title)}</title>`,
    ...(r.indexable ? [] : [`<meta name="robots" content="noindex" />`]),
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="theme-color" content="${COLORS.paper}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<link rel="alternate" hreflang="en" href="${esc(site + recipePath("en", r.slug))}" />`,
    `<link rel="alternate" hreflang="ar" href="${esc(site + recipePath("ar", r.slug))}" />`,
    `<link rel="alternate" hreflang="x-default" href="${esc(site + recipePath("en", r.slug))}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:site_name" content="The Scent Handbook" />`,
    `<meta property="og:locale" content="${OG_LOCALE[locale]}" />`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[other]}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="icon" href="/icon.svg" type="image/svg+xml" />`,
    `<link rel="stylesheet" href="${esc(stylesheet)}" />`,
  ].join("\n    ");

  const rows = [
    [t("recipe.strength"), t(`recipe.strengthValue.${basis}`, { pct })],
    [t("recipe.bottle"), bottleText(t, r)],
    [t("recipe.oil"), t("recipe.grams", { g: grams(r.oil_g) })],
    [t("recipe.alcohol"), t("recipe.grams", { g: grams(r.ethanol_g) })],
    [t("recipe.total"), t("recipe.grams", { g: grams(r.total_g) })],
    ...(r.rest_days != null ? [[t("recipe.rested"), t("recipe.restedValue", { count: r.rest_days })]] : []),
  ];
  const to = (p) => (locale === "ar" ? (p === "/" ? "/ar" : `/ar${p}`) : p);
  const report = reportEmail
    ? `<a href="mailto:${esc(reportEmail)}?subject=${encodeURIComponent(t("recipe.reportSubject", { slug: r.slug }))}" class="underline">${esc(t("recipe.report"))}</a>`
    : "";

  return `<!doctype html>
<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">
  <head>
    ${head}
  </head>
  <body>
    <div class="min-h-screen flex flex-col" style="background-color:${COLORS.paper};color:${COLORS.ink}">
      <header class="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-6 pb-4 flex items-center gap-4 flex-wrap">
        <a href="${to("/")}" class="flex items-center gap-3 me-auto" aria-label="${esc(t("site.nav.home"))}">
          <span class="font-serif italic text-xl" style="color:${COLORS.forestDeep}">${esc(t("brand"))}</span>
        </a>
        <nav class="flex items-center gap-4 text-sm">
          <a href="${to("/guides")}" class="hover:underline underline-offset-4">${esc(t("site.nav.guides"))}</a>
          <a href="${to("/pricing")}" class="hover:underline underline-offset-4">${esc(t("site.nav.pricing"))}</a>
          <a href="${recipePath(other, r.slug)}" lang="${other}" hreflang="${other}" title="${esc(t("site.nav.languageLabel"))}" class="hover:underline underline-offset-4" style="color:${COLORS.inkSoft}">${esc(t("site.nav.language"))}</a>
          <a href="/app" class="px-3 py-1.5 rounded-lg text-sm font-semibold" style="background:${COLORS.amber};color:${COLORS.onAmber}">${esc(t("site.nav.openApp"))}</a>
        </nav>
      </header>
      <main class="flex-1 w-full">
        <article class="w-full max-w-2xl mx-auto px-4 sm:px-8 pt-8">
          <p class="text-xs font-mono uppercase tracking-wider" style="color:${COLORS.amberDeep}">${esc(t("recipe.eyebrow"))}</p>
          <h1 class="mt-2 text-4xl font-serif italic" style="color:${COLORS.forestDeep}"><bdi>${esc(r.fragrance_name)}</bdi></h1>
          <p class="mt-2 text-sm font-mono" style="color:${COLORS.inkSoft}">${esc(family)} · ${esc(t(`recipe.strengthValue.${basis}`, { pct }))}</p>
          <table class="mt-8 w-full text-sm border-collapse">
            <tbody>
              ${rows.map(([k, v]) => `<tr style="border-bottom:1px solid ${COLORS.line}"><th scope="row" class="py-2 text-start font-normal" style="color:${COLORS.inkSoft}">${esc(k)}</th><td class="py-2 text-end font-mono"><bdi>${esc(v)}</bdi></td></tr>`).join("\n              ")}
            </tbody>
          </table>
          ${r.public_note ? `<section class="mt-8">
            <h2 class="text-xs font-mono uppercase tracking-wider" style="color:${COLORS.amberDeep}">${esc(t("recipe.note"))}</h2>
            <div class="mt-2 space-y-3 font-serif text-lg" lang="${r.note_lang === "ar" ? "ar" : "en"}" dir="auto">${noteHtml(r.public_note)}</div>
          </section>` : ""}
          <div class="mt-10 p-5 border rounded-lg" style="border-color:${COLORS.amberDeep};background-color:${COLORS.card}">
            <a href="${esc(calculatorHref(r))}" class="inline-block px-5 py-2 rounded-lg text-sm font-semibold" style="background:${COLORS.amber};color:${COLORS.onAmber}">${esc(t("recipe.cta"))}</a>
            <p class="mt-2 text-xs" style="color:${COLORS.inkSoft}">${esc(t("recipe.ctaLead"))} <a href="${to("/guides")}" class="underline">${esc(t("recipe.method"))}</a></p>
          </div>
          <p class="mt-8 text-xs" style="color:${COLORS.dim}">${esc(t("recipe.disclaimer"))} ${esc(t("site.safety.text"))}</p>
          ${report ? `<p class="mt-3 text-xs" style="color:${COLORS.inkSoft}">${report}</p>` : ""}
        </article>
      </main>
      <footer class="w-full max-w-5xl mx-auto px-4 sm:px-8 py-10 mt-16 text-sm flex flex-wrap gap-x-6 gap-y-2" style="border-top:1px solid ${COLORS.line};color:${COLORS.inkSoft}">
        <span class="font-serif italic" style="color:${COLORS.forestDeep}">${esc(t("brand"))}</span>
        <a href="${to("/privacy")}" class="hover:underline">${esc(t("site.nav.privacy"))}</a>
        <a href="${to("/terms")}" class="hover:underline">${esc(t("site.nav.terms"))}</a>
        <span class="ms-auto">${esc(t("site.footer.rights"))}</span>
      </footer>
    </div>
  </body>
</html>
`;
}

/** The page for a recipe that isn't (or is no longer) shared: a 404. */
export function goneHtml({ lang = "en", stylesheet }) {
  const locale = lang === "ar" ? "ar" : "en";
  const t = createTranslator(locale, CATALOGS);
  return `<!doctype html>
<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>${esc(t("recipe.goneTitle"))} — The Scent Handbook</title>
    <link rel="stylesheet" href="${esc(stylesheet)}" />
  </head>
  <body>
    <main class="min-h-screen max-w-2xl mx-auto px-4 sm:px-8 pt-16" style="background-color:${COLORS.paper};color:${COLORS.ink}">
      <h1 class="text-3xl font-serif italic" style="color:${COLORS.forestDeep}">${esc(t("recipe.goneTitle"))}</h1>
      <p class="mt-3 text-sm" style="color:${COLORS.inkSoft}">${esc(t("recipe.goneText"))}</p>
      <p class="mt-6"><a href="${locale === "ar" ? "/ar" : "/"}" class="underline" style="color:${COLORS.amber}">${esc(t("brand"))}</a></p>
    </main>
  </body>
</html>
`;
}

// The public page of a shared recipe (/r/<slug>, /ar/r/<slug>), as a whole
// HTML document. Rendered per request by api/recipe.ts from the row
// recipe_by_slug() returns, which holds only public fields (0013). Plain
// HTML and the site's stylesheet, no JavaScript: the same page for people,
// crawlers and link previews. Every value from the database is escaped
// here, whatever was cleaned before it was stored.
// Its Tailwind classes are picked up from this file at build time.
import { createTranslator } from "../i18n/core.js";
import en from "../i18n/messages/en.js";
import ar from "../i18n/messages/ar.js";
import { COLORS, OFFSET_SHADOW, TYPE } from "./theme.js";
import { cleanName } from "./cleanName.js";
import { BRAND, brandName } from "../brand.js";

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

// Static SVG (the page has no script): the brand flacon, the drop that opens
// the note, and the forward arrow (mirrored in Arabic).
const FLACON_SVG = (h) => `<svg aria-hidden="true" width="${Math.round(h * 0.78)}" height="${h}" viewBox="0 0 28 36" fill="none" class="shrink-0"><rect x="10" y="1" width="8" height="5" fill="${COLORS.ink}"/><path d="M12 6v3.5M16 6v3.5" stroke="${COLORS.ink}" stroke-width="1.4"/><rect x="3.7" y="10.2" width="20.6" height="24.1" stroke="${COLORS.ink}" stroke-width="1.4"/><path d="M6.5 24.5h15" stroke="${COLORS.oil}" stroke-width="2.4"/></svg>`;
const DROP_SVG = `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${COLORS.ink}" stroke-width="1.5" stroke-linejoin="round" class="shrink-0 mt-1"><path d="M12 3c-3 3.8-5 6.6-5 9.3a5 5 0 0 0 10 0C17 9.6 15 6.8 12 3Z"/><path d="M7 12.5h10a5 5 0 0 1-10 0Z" fill="${COLORS.oil}" stroke="none"/></svg>`;
const ARROW_SVG = `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="rtl:-scale-x-100"><path d="M4 12h15.5M14 6.5l5.5 5.5-5.5 5.5"/></svg>`;

/** Oil against ethanol by weight, as on the calculator. */
function ratioHtml(t, r) {
  const oil = Number(r.oil_g), eth = Number(r.ethanol_g);
  if (!(oil > 0) || !(eth >= 0)) return "";
  const ratio = eth / oil; // as weightRatio() in calc/blend.ts, which this plain-JS module can't import
  const share = (oil / (oil + eth)) * 100;
  return `<div class="mt-6" aria-hidden="true">
              <div class="flex h-3 w-full overflow-hidden" style="border:1px solid ${COLORS.ink}"><span class="block h-full" style="width:${share.toFixed(1)}%;background:${COLORS.oil}"></span><span class="block h-full flex-1" style="background:${COLORS.mist}"></span></div>
              <p class="mt-2 font-mono text-xs" dir="ltr" style="color:${COLORS.dim}">1 : ${grams(ratio)}</p>
            </div>`;
}

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
  const name = cleanName(r.fragrance_name);
  if (name) q.set("name", name);
  q.set("ref", "recipe"); // where a sign-up came from (profiles.signup_ref)
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
    `<meta property="og:site_name" content="${BRAND.name}" />`,
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
    <div class="min-h-screen flex flex-col" style="background-color:${COLORS.sand};color:${COLORS.ink}">
      <header class="w-full" style="border-bottom:1px solid ${COLORS.line};background-color:${COLORS.paper}">
        <div class="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14 py-3 flex flex-wrap items-center gap-x-8 gap-y-1">
          <a href="${to("/")}" class="inline-flex items-center gap-3 me-auto" aria-label="${esc(t("site.nav.home"))}">${FLACON_SVG(30)}
            <span class="flex flex-col leading-none"><span class="font-sans font-medium text-[19px] tracking-[-0.03em]">${esc(t("brand"))}</span><span class="font-serif italic text-[13px] mt-1">${esc(t("brandTagline"))}</span><span class="font-serif italic text-[12px] mt-0.5" style="color:${COLORS.brass}">${esc(t("brandSignature"))}</span></span>
          </a>
          <nav class="flex items-center gap-x-6 flex-wrap text-sm">
            <a href="${to("/guides")}" class="min-h-[44px] inline-flex items-center hover:underline underline-offset-4">${esc(t("site.nav.guides"))}</a>
            <a href="/app/calculator" class="min-h-[44px] inline-flex items-center hover:underline underline-offset-4">${esc(t("site.nav.calculator"))}</a>
            <a href="/app/batches" class="min-h-[44px] inline-flex items-center hover:underline underline-offset-4">${esc(t("site.nav.journal"))}</a>
            <a href="${to("/pricing")}" class="min-h-[44px] inline-flex items-center hover:underline underline-offset-4">${esc(t("site.nav.pricing"))}</a>
            <a href="${recipePath(other, r.slug)}" lang="${other}" hreflang="${other}" title="${esc(t("site.nav.languageLabel"))}" class="min-h-[44px] inline-flex items-center hover:underline underline-offset-4">${esc(t("site.nav.language"))}</a>
          </nav>
        </div>
      </header>
      <main class="flex-1 w-full px-4 sm:px-8 py-12">
        <article class="w-full max-w-2xl mx-auto" style="background-color:${COLORS.card};border:1px solid ${COLORS.ink};box-shadow:${OFFSET_SHADOW.replace(COLORS.sand, COLORS.line)}">
          <div class="flex items-center justify-between gap-3 px-6 py-3" style="border-bottom:1px solid ${COLORS.line}">
            <p class="${TYPE.label}" style="color:${COLORS.dim}">${esc(t("recipe.eyebrow"))}</p>
            <p class="font-mono text-xs" dir="ltr" style="color:${COLORS.dim}">${esc(r.slug)}</p>
          </div>
          <div class="p-6 sm:p-8">
            <div class="flex items-start justify-between gap-6">
              <div>
                <h1 class="${TYPE.title}"><bdi>${esc(r.fragrance_name)}</bdi></h1>
                <p class="mt-2 font-serif italic" style="color:${COLORS.inkSoft}">${esc(family)}</p>
              </div>
              ${FLACON_SVG(96)}
            </div>
            <table class="mt-8 w-full text-sm border-collapse" style="border-top:1px solid ${COLORS.ink}">
              <tbody>
                ${rows.map(([k, v]) => `<tr style="border-bottom:1px solid ${COLORS.line}"><th scope="row" class="py-3 text-start font-normal ${TYPE.label}" style="color:${COLORS.dim}">${esc(k)}</th><td class="py-3 text-end font-mono text-base"><bdi>${esc(v)}</bdi></td></tr>`).join("\n                ")}
              </tbody>
            </table>
            ${ratioHtml(t, r)}
            ${r.public_note ? `<section class="mt-8 flex gap-3">
              ${DROP_SVG}
              <div>
                <h2 class="${TYPE.label}" style="color:${COLORS.dim}">${esc(t("recipe.note"))}</h2>
                <div class="mt-2 space-y-3 font-serif italic text-lg" lang="${r.note_lang === "ar" ? "ar" : "en"}" dir="auto">${noteHtml(r.public_note)}</div>
              </div>
            </section>` : ""}
          </div>
          <div class="px-6 py-5 flex flex-wrap items-center justify-between gap-3" style="border-top:1px solid ${COLORS.line}">
            <p class="text-xs max-w-[22rem]" style="color:${COLORS.inkSoft}">${esc(t("recipe.ctaLead"))} <a href="${to("/guides")}" class="underline">${esc(t("recipe.method"))}</a></p>
            <a href="${esc(calculatorHref(r))}" class="inline-flex items-center gap-2 px-5 min-h-[48px] font-medium" style="background:${COLORS.amber};color:${COLORS.onAmber}">${esc(t("recipe.cta"))} ${ARROW_SVG}</a>
          </div>
        </article>
        <div class="max-w-2xl mx-auto">
          <p class="mt-10 text-xs" style="color:${COLORS.dim}">${esc(t("recipe.disclaimer"))} ${esc(t("site.safety.text"))}</p>
          ${report ? `<p class="mt-3 text-xs" style="color:${COLORS.inkSoft}">${report}</p>` : ""}
        </div>
      </main>
      <footer class="w-full" style="background-color:${COLORS.inkBand};color:${COLORS.onInk}">
        <div class="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14 py-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span class="font-serif italic">${esc(t("site.footer.line"))}</span>
          <span>${esc(t("site.footer.safety"))}</span>
          <a href="${to("/privacy")}" class="hover:underline">${esc(t("site.nav.privacy"))}</a>
          <a href="${to("/terms")}" class="hover:underline">${esc(t("site.nav.terms"))}</a>
          <span class="ms-auto">${esc(t("site.footer.rights"))}</span>
        </div>
      </footer>
    </div>
  </body>
</html>
`;
}

/**
 * The page for a recipe that isn't (or is no longer) shared (a 404), or,
 * with failed: true, for one that couldn't be loaded just now.
 */
export function goneHtml({ lang = "en", stylesheet, failed = false }) {
  const locale = lang === "ar" ? "ar" : "en";
  const t = createTranslator(locale, CATALOGS);
  const title = t(failed ? "recipe.errorTitle" : "recipe.goneTitle");
  return `<!doctype html>
<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>${esc(title)} — ${brandName(locale)}</title>
    <link rel="stylesheet" href="${esc(stylesheet)}" />
  </head>
  <body>
    <main class="min-h-screen max-w-2xl mx-auto px-4 sm:px-8 pt-16" style="background-color:${COLORS.paper};color:${COLORS.ink}">
      <h1 class="${TYPE.title}">${esc(title)}</h1>
      <p class="mt-3 text-sm" style="color:${COLORS.inkSoft}">${esc(t(failed ? "recipe.errorText" : "recipe.goneText"))}</p>
      <p class="mt-6"><a href="${locale === "ar" ? "/ar" : "/"}" class="underline" style="color:${COLORS.forest}">${esc(t("brand"))}</a></p>
    </main>
  </body>
</html>
`;
}

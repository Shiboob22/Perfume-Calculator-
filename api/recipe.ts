import type { VercelRequest, VercelResponse } from '@vercel/node';
import { anonClient, isTimeout } from './_lib/http.js';
// @ts-ignore: plain JS shared with the browser build
import { recipePageHtml, goneHtml, recipePath } from '../src/lib/recipePage.js';

// Public shared recipes, server-rendered (vercel.json rewrites to here):
//   /r/<slug>, /ar/r/<slug>   → ?slug=<slug>&lang=en|ar   the recipe page
//   /sitemap-recipes.xml      → ?sitemap=1                indexable recipes
// Reads with the ANON key: recipe_by_slug() and recipe_sitemap() (0013)
// return published rows and public fields only, whatever this code asks.
// Pages are cached at the CDN for 5 minutes and not served stale beyond
// that, so a recipe that is unshared disappears within 5 minutes.

const SITE = (process.env.VITE_SITE_URL || 'https://scent-handbook-app.vercel.app').replace(/\/$/, '');
const RELEASE = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7);
const STYLESHEET = `/r-assets/site.css?v=${RELEASE}`;
const REPORT_EMAIL = process.env.REPORT_EMAIL || '';
const PAGE_CACHE = 'public, max-age=0, s-maxage=300';
const PER_SITEMAP = 50000;

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function sitemap(req: VercelRequest, res: VercelResponse) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const { data, error } = await anonClient().rpc('recipe_sitemap', { p_offset: (page - 1) * PER_SITEMAP, p_limit: PER_SITEMAP });
  if (error) throw error;
  const urls = (data ?? []).map((r: { slug: string; updated_at: string }) => {
    const en = SITE + recipePath('en', r.slug);
    const ar = SITE + recipePath('ar', r.slug);
    const alt = [`<xhtml:link rel="alternate" hreflang="en" href="${xmlEsc(en)}" />`, `<xhtml:link rel="alternate" hreflang="ar" href="${xmlEsc(ar)}" />`].join('\n    ');
    const lastmod = String(r.updated_at).slice(0, 10);
    return [en, ar].map((loc) => `  <url>\n    <loc>${xmlEsc(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    ${alt}\n  </url>`).join('\n');
  });
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  const lang = req.query.lang === 'ar' ? 'ar' : 'en';
  try {
    if (req.query.sitemap) return await sitemap(req, res);

    const slug = String(req.query.slug ?? '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const { data, error } = slug && slug.length <= 120
      ? await anonClient().rpc('recipe_by_slug', { p_slug: slug })
      : { data: [], error: null };
    if (error) throw error;
    const recipe = Array.isArray(data) ? data[0] : null;
    if (!recipe) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
      return res.status(404).send(goneHtml({ lang, stylesheet: STYLESHEET }));
    }
    res.setHeader('Cache-Control', PAGE_CACHE);
    return res.status(200).send(recipePageHtml(recipe, { lang, site: SITE, stylesheet: STYLESHEET, reportEmail: REPORT_EMAIL }));
  } catch (err: any) {
    // Never cache a failure.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '30');
    const status = isTimeout(err) ? 503 : 500;
    if (req.query.sitemap) return res.status(status).send('');
    return res.status(status).send(goneHtml({ lang, stylesheet: STYLESHEET, failed: true }));
  }
}

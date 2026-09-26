import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

// Supabase calls must never hang a request: on 2026-09-24 some calls stalled
// 18-153 s on the network path. Reads get 5 s per try (PostgREST retries GETs
// on its own); writes get 15 s and are not retried.
function timedFetch(input: Parameters<typeof fetch>[0], init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase();
  const ms = method === 'GET' || method === 'HEAD' ? 5_000 : 15_000;
  // Nothing here passes its own abort signal; if something ever does, keep it.
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(ms) });
}

function isTimeout(err: any) {
  return /TimeoutError/.test(String(err?.message ?? ''));
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: timedFetch } });

// Verify the caller's Supabase session token. Returns the user id, or null
// when no valid token is present. Used to gate DB writes: reads stay open so
// anonymous search still works, but only authenticated callers may persist
// scraped rows into the shared `fragrances` table.
async function getUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return null;
  try {
    const { data: { user } } = await createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: timedFetch }
    }).auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// Map main accords to one of the app's 5 families. Specific families are
// checked before `fresh`, which is also the fallback — otherwise a sweet
// gourmand that happens to list a "Citrus" accord (e.g. Naxos) misclassifies
// as fresh.
function classifyTier(accords: string[]): string {
  const a = accords.map(x => x.toLowerCase());
  const has = (terms: string[]) => a.some(x => terms.some(t => x.includes(t)));
  if (has(['vanilla', 'sweet', 'gourmand', 'caramel', 'chocolate', 'honey', 'praline', 'tobacco'])) return 'gourmand';
  if (has(['amber', 'oriental', 'warm spicy', 'balsamic', 'resinous', 'oud', 'spicy'])) return 'oriental';
  if (has(['floral', 'powdery', 'rose', 'white floral'])) return 'floral';
  if (has(['woody', 'earthy', 'mossy', 'aromatic'])) return 'woody';
  if (has(['citrus', 'fresh', 'green', 'aquatic', 'ozonic'])) return 'fresh';
  return 'fresh';
}

// Live Parfumo Scraper Helper
async function fetchParfumoData(query: string) {
  try {
    const searchUrl = `https://www.parfumo.com/s_perfumes.php?lt=4&q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(8_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();

    // Extract the first perfume result's detail URL. Result cards wrap the
    // link in `<div class="name"><a href="https://www.parfumo.com/Perfumes/
    // <Brand>/<slug>">`. Anchoring on the name div avoids matching the site
    // nav links (/Perfumes, /Perfumes/Tops/Women) the old regex caught.
    const linkMatch =
      searchHtml.match(/<div class="name">\s*<a href="(https:\/\/www\.parfumo\.com\/Perfumes\/[^"]+)"/i) ||
      searchHtml.match(/class="image">\s*<a href="(https:\/\/www\.parfumo\.com\/Perfumes\/[^"]+)"/i);
    if (!linkMatch) return null;

    const detailUrl = linkMatch[1].replace(/&amp;/g, '&');
    const detailRes = await fetch(detailUrl, {
      signal: AbortSignal.timeout(8_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!detailRes.ok) return null;
    const detailHtml = await detailRes.text();

    // Name: og:title is "<Name> by <Brand>". Store as "<Brand> <Name>" so it
    // matches the app's curated rows (e.g. "Xerjoff Naxos").
    const ogTitle = detailHtml.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]?.trim();
    let perfumeName = query;
    if (ogTitle) {
      const byMatch = ogTitle.match(/^(.+?)\s+by\s+(.+)$/i);
      perfumeName = byMatch ? `${byMatch[2].trim()} ${byMatch[1].trim()}` : ogTitle;
    }

    // Notes: each note is a `<span ... data-nt="t|m|b|n" ...>` whose first inner
    // <img> carries the note name in its alt attribute. t/m/b are the pyramid
    // levels; `n` is a flat, un-tiered note list some perfumes use instead of a
    // pyramid (e.g. Baccarat Rouge 540). Fold `n` into top so those notes still
    // surface — the schema has only top/middle/base columns.
    const noteRe = /data-nt="([tmbn])"[^>]*>\s*<span[^>]*>\s*<img[^>]*\salt="([^"]+)"/gi;
    const grouped: Record<string, string[]> = { t: [], m: [], b: [], n: [] };
    for (const match of Array.from(detailHtml.matchAll(noteRe))) {
      const level = match[1].toLowerCase();
      const note = match[2].trim();
      if (note && !grouped[level].includes(note)) grouped[level].push(note);
    }
    const topNotes = Array.from(new Set([...grouped.t, ...grouped.n]));
    const middleNotes = grouped.m;
    const baseNotes = grouped.b;

    // Accords: the "Main accords" block lists each accord as
    // `<div class="text-xs grey"><name></div>` inside s-circle containers.
    let accords: string[] = [];
    const accIdx = detailHtml.indexOf('Main accords');
    if (accIdx >= 0) {
      const accBlock = detailHtml.slice(accIdx, accIdx + 2000);
      accords = Array.from(
        new Set(
          Array.from(accBlock.matchAll(/<div class="text-xs grey">([^<]+)<\/div>/gi)).map(m => m[1].trim())
        )
      ).filter(Boolean).slice(0, 6);
    }

    // Bottle photo: og:image is the padded social card; swap it to the clean
    // square product image and drop the query string. Client sizes it.
    const ogImage = detailHtml.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
    const imageUrl = ogImage
      ? ogImage.split('?')[0].replace('/perfume_social/', '/perfumes/')
      : null;

    if (topNotes.length === 0 && middleNotes.length === 0 && baseNotes.length === 0) {
      return null;
    }

    return {
      name: perfumeName,
      tier: classifyTier(accords),
      source: 'Parfumo',
      top_notes: topNotes,
      middle_notes: middleNotes,
      base_notes: baseNotes,
      accords: accords,
      image_url: imageUrl
    };
  } catch (err) {
    console.error('Parfumo fetch error:', err);
    return null;
  }
}

// Does a scraped perfume name actually relate to what the user searched?
// Parfumo can answer a blocked/unknown query with a generic landing page whose
// first result link is an unrelated perfume — which previously surfaced the
// SAME perfume (Naxos) for every query. Require at least one query token to
// appear in the scraped name before trusting it.
function queryMatchesName(query: string, name: string): boolean {
  const n = (name || '').toLowerCase();
  const tokens = query.split(/\s+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return n.includes(query);
  return tokens.some((t) => n.includes(t));
}

// Same folding as the `search_text` column (supabase-catalog-search.sql):
// lowercase, accents and apostrophes removed. Characters that are wildcards or
// PostgREST syntax are dropped rather than escaped — names never need them.
function normalizeQuery(q: string): string {
  return q
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[%_*,()\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RESULT_LIMIT = 20;

// Catalog answers are the same for everyone and change rarely: let the CDN
// serve repeats. (Vercel never caches a request that carries Authorization,
// which is why the client searches anonymously and sends its session only on
// the live-lookup retry.)
const CATALOG_CACHE = 'public, s-maxage=600, stale-while-revalidate=86400';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawQuery = (req.query.q as string || '').trim();
  const query = rawQuery.toLowerCase();

  try {
    // Empty-state shelf: the most-rated perfumes that have a bottle photo.
    if (req.query.popular) {
      const { data, error } = await supabase
        .from('fragrances')
        .select('*')
        .not('image_url', 'is', null)
        .order('popularity', { ascending: false, nullsFirst: false })
        .limit(12);
      if (error) throw error;
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({ source: 'database', results: data || [] });
    }

    const offset = Math.min(Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0), 1000);

    // Browse like Fragrantica: perfumes with a note or accord, or a house's
    // line-up. Array-literal syntax characters are stripped (never in names).
    const clean = (v: unknown) => String(v || '').replace(/[{}"\\,]/g, '').trim().slice(0, 80);
    const note = clean(req.query.note), accord = clean(req.query.accord), brand = clean(req.query.brand);
    if (note || accord || brand) {
      let browse = supabase.from('fragrances').select('*');
      if (note) browse = browse.contains('all_notes', [note]);
      if (accord) browse = browse.contains('accords', [accord]);
      if (brand) browse = browse.eq('brand', brand);
      const { data, error } = await browse
        .order('priority', { ascending: false })
        .order('popularity', { ascending: false, nullsFirst: false })
        .range(offset, offset + RESULT_LIMIT - 1);
      if (error) throw error;
      res.setHeader('Cache-Control', CATALOG_CACHE);
      const rows = data || [];
      return res.status(200).json({ source: 'database', match: 'browse', results: rows, hasMore: rows.length === RESULT_LIMIT });
    }

    if (!query || query.length < 2) {
      return res.status(200).json({ source: 'database', results: [] });
    }

    // 1. Search the catalog first, and PREFER it. Any name match wins — a row
    //    without notes still yields a coherent detail page, and returning the
    //    real match stops a flaky scrape from replacing it with an unrelated
    //    perfume. Every word must appear, in any order and ignoring accents
    //    ("sauvage dior", "lancome la vie"). With ~82k rows, rank the matches:
    //    rows the app or user added first (priority), then by Fragrantica votes.
    const normalized = normalizeQuery(rawQuery);
    const words = normalized.split(' ').filter(Boolean).slice(0, 6);
    if (words.length === 0) {
      return res.status(200).json({ source: 'database', results: [] });
    }
    let search = supabase.from('fragrances').select('*');
    for (const w of words) search = search.ilike('search_text', `%${w}%`);
    const { data: dbResults, error } = await search
      .order('priority', { ascending: false })
      .order('popularity', { ascending: false, nullsFirst: false })
      .range(offset, offset + RESULT_LIMIT - 1);

    if (error) throw error;

    if (dbResults && dbResults.length > 0) {
      res.setHeader('Cache-Control', CATALOG_CACHE);
      return res.status(200).json({
        source: 'database', match: 'exact', results: dbResults, hasMore: dbResults.length === RESULT_LIMIT,
      });
    }
    // Paging past the last exact match: stop, don't fall through to fuzzy/scrape.
    if (offset > 0) {
      res.setHeader('Cache-Control', CATALOG_CACHE);
      return res.status(200).json({ source: 'database', match: 'exact', results: [], hasMore: false });
    }

    // 1b. Nothing contains every word → typo-tolerant match ("aventis",
    //     "bacarat rouge") before resorting to a live scrape.
    if (normalized.length >= 3) {
      const { data: fuzzy, error: fuzzyErr } = await supabase
        .rpc('search_fragrances_fuzzy', { q: normalized, lim: RESULT_LIMIT });
      if (fuzzyErr) throw fuzzyErr;
      if (fuzzy && fuzzy.length > 0) {
        res.setHeader('Cache-Control', CATALOG_CACHE);
        return res.status(200).json({ source: 'database', match: 'fuzzy', results: fuzzy });
      }
    }

    // Not in the catalog. A live lookup is slow (two Parfumo pages), so only
    // do it when asked: the client retries with live=1 and its session, so a
    // found perfume is saved. A token alone also counts, for older clients.
    // Not cached — the next request may find the row the lookup saved.
    res.setHeader('Cache-Control', 'no-store');
    if (req.query.live !== '1' && !req.headers.authorization) {
      return res.status(200).json({ source: 'database', results: [], tryLive: true });
    }

    // 2. No catalog match → try a live Parfumo scrape, but only trust it when
    //    the scraped name actually relates to the query (guards the generic /
    //    blocked-page case that returned the same perfume for everything).
    const scrapedData = await fetchParfumoData(query);

    if (scrapedData && queryMatchesName(query, scrapedData.name)) {
      // Persist to the shared catalog only for authenticated callers.
      const userId = await getUserId(req);
      let savedRecord: any[] | null = null;
      if (userId) {
        const { data } = await supabase
          .from('fragrances')
          .upsert([scrapedData], { onConflict: 'name', ignoreDuplicates: true })
          .select();
        savedRecord = data;
      }
      return res.status(200).json({
        source: 'Parfumo (Live Scraped)',
        results: savedRecord && savedRecord.length > 0 ? savedRecord : [scrapedData],
      });
    }

    // Nothing relevant found.
    return res.status(200).json({ source: 'database', results: [] });
  } catch (err: any) {
    if (isTimeout(err)) return res.status(503).json({ error: 'Database is slow to respond — please try again.' });
    return res.status(500).json({ error: err.message || 'Search execution failed' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      global: { headers: { Authorization: `Bearer ${token}` } }
    }).auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// A catalog column counts as "empty" (and therefore safe to fill from a scrape)
// when it is null/undefined, an empty array, or an empty string.
function isEmpty(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

// Build an enrichment patch that fills ONLY the empty note/accord columns of an
// existing row from scraped data. Populated values are never touched, so curated
// data stays the source of truth — we only close the gaps. `tier` is deliberately
// NOT enriched: classifyTier is a heuristic guess, so a user-triggered scrape may
// not mutate the classification of a row the caller did not create.
function buildEnrichPatch(existing: any, scraped: any): Record<string, any> {
  const patch: Record<string, any> = {};
  for (const col of ['top_notes', 'middle_notes', 'base_notes', 'accords']) {
    if (isEmpty(existing[col]) && !isEmpty(scraped[col])) patch[col] = scraped[col];
  }
  return patch;
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
      accords: accords
    };
  } catch (err) {
    console.error('Parfumo fetch error:', err);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = (req.query.q as string || '').trim().toLowerCase();

  if (!query || query.length < 2) {
    return res.status(200).json({ source: 'database', results: [] });
  }

  try {
    // 1. Search database first
    const { data: dbResults, error } = await supabase
      .from('fragrances')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) throw error;

    // Check if we have a valid result with notes populated
    const validDbResult = dbResults?.find(r => r.top_notes && r.top_notes.length > 0);

    if (validDbResult) {
      return res.status(200).json({ source: 'database', results: dbResults });
    }

    // 2. Live fetch from Parfumo if missing or unpopulated
    const scrapedData = await fetchParfumoData(query);

    if (scrapedData) {
      // Only persist to the shared catalog for authenticated callers. Anonymous
      // callers still get the live result, but cannot write to the DB — this
      // closes the unauthenticated write path through the service-role client.
      const userId = await getUserId(req);
      let savedRecord: any[] | null = null;
      if (userId) {
        // Only enrich the row whose name EXACTLY matches the scraped perfume
        // (case-insensitive). No "any row missing notes" fallback: that could
        // fill an unrelated row (a different perfume that merely ilike-matched
        // the query) with this scrape's data. Exact match guarantees we are
        // filling the correct perfume's own gaps.
        const existing = dbResults?.find(
          r => r.name?.toLowerCase() === scrapedData.name.toLowerCase()
        );

        if (existing) {
          // ENRICH in place: fill only the empty columns, never overwrite
          // curated data. This keeps the catalog fresh over time while
          // preserving curated values as the source of truth.
          const patch = buildEnrichPatch(existing, scrapedData);
          if (Object.keys(patch).length > 0) {
            const { data } = await supabase
              .from('fragrances')
              .update(patch)
              .eq('id', existing.id)
              .select();
            savedRecord = data;
          } else {
            savedRecord = [existing];
          }
        } else {
          // No matching row: insert the genuinely-new name. ignoreDuplicates
          // still guards the unique `name` key against a race.
          const { data } = await supabase
            .from('fragrances')
            .upsert([scrapedData], { onConflict: 'name', ignoreDuplicates: true })
            .select();
          savedRecord = data;
        }
      }

      return res.status(200).json({
        source: 'Parfumo (Live Scraped)',
        results: savedRecord && savedRecord.length > 0 ? savedRecord : [scrapedData]
      });
    }

    // Fallback to existing DB entries if scraper yielded no match
    return res.status(200).json({
      source: 'database',
      results: dbResults || []
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Search execution failed' });
  }
}

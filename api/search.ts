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

function classifyTier(accords: string[]): string {
  const lowerAccords = accords.map(a => a.toLowerCase());
  if (lowerAccords.some(a => ['woody', 'earthy', 'mossy', 'aromatic'].some(t => a.includes(t)))) return 'woody';
  if (lowerAccords.some(a => ['citrus', 'fresh', 'green', 'aquatic', 'ozonic'].some(t => a.includes(t)))) return 'fresh';
  if (lowerAccords.some(a => ['floral', 'powdery', 'rose', 'white floral'].some(t => a.includes(t)))) return 'floral';
  if (lowerAccords.some(a => ['vanilla', 'sweet', 'gourmand', 'caramel', 'chocolate'].some(t => a.includes(t)))) return 'gourmand';
  if (lowerAccords.some(a => ['amber', 'oriental', 'warm spicy', 'balsamic', 'resinous', 'oud'].some(t => a.includes(t)))) return 'oriental';
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

    // Extract first perfume detail URL
    const linkMatch = searchHtml.match(/href="(\/Perfumes\/[^"]+)"/i);
    if (!linkMatch) return null;

    const detailUrl = `https://www.parfumo.com${linkMatch[1]}`;
    const detailRes = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!detailRes.ok) return null;
    const detailHtml = await detailRes.text();

    // Extract Fragrance Name
    const titleMatch = detailHtml.match(/<h1[^>]* itemprop="name"[^>]*>([^<]+)<\/h1>/i) || detailHtml.match(/<title>([^|-]+)/i);
    const perfumeName = titleMatch ? titleMatch[1].trim() : query;

    // Helper regex to extract list items inside note blocks
    const parseNoteBlock = (htmlSection: string): string[] => {
      const matches = htmlSection.match(/<span[^>]*class="[^"]*note[^"]*"[^>]*>([^<]+)<\/span>/gi) ||
                      htmlSection.match(/<a[^>]*href="\/Notes\/[^"]*"[^>]*>([^<]+)<\/a>/gi);
      if (!matches) return [];
      return Array.from(new Set(matches.map(m => m.replace(/<[^>]+>/g, '').trim()))).filter(Boolean);
    };

    // Extract Top, Middle, Base Notes
    const topBlock = detailHtml.match(/Top Notes[\s\S]*?(?=Heart Notes|Base Notes|<div class="clear")/i)?.[0] || '';
    const middleBlock = detailHtml.match(/Heart Notes[\s\S]*?(?=Base Notes|<div class="clear")/i)?.[0] || '';
    const baseBlock = detailHtml.match(/Base Notes[\s\S]*?(?=<div class="clear"|Notes)/i)?.[0] || '';

    const topNotes = parseNoteBlock(topBlock);
    const middleNotes = parseNoteBlock(middleBlock);
    const baseNotes = parseNoteBlock(baseBlock);

    // Extract Accords
    const accordMatches = detailHtml.match(/<span[^>]*class="[^"]*accord[^"]*"[^>]*>([^<]+)<\/span>/gi) ||
                          detailHtml.match(/<div[^>]*class="[^"]*main-accords[^"]*"[\s\S]*?<\/div>/gi);
    const accords = accordMatches 
      ? Array.from(new Set(accordMatches.map(m => m.replace(/<[^>]+>/g, '').trim()))).slice(0, 6)
      : [];

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

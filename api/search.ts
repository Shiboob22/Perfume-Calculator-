import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      tier: 'scraped',
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
      // Upsert scraped result into Supabase for instant caching next time
      const { data: savedRecord } = await supabase
        .from('fragrances')
        .upsert([scrapedData], { onConflict: 'name' })
        .select();

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

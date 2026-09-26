export interface SearchResult {
  id: string;
  name: string;
  tier?: string;
  source?: string;
  image_url?: string | null;
  brand?: string | null;
  year?: number | null;
  rating?: number | string | null;
  popularity?: number | null;
  gender?: 'women' | 'men' | 'unisex' | null;
  [key: string]: unknown;
}

export interface SearchResponse {
  results: SearchResult[];
  /** 'fuzzy' when no name contained every word and typo matching was used. */
  match?: 'exact' | 'fuzzy' | 'browse';
  /** A further page exists (request again with offset = results so far). */
  hasMore?: boolean;
}

export type BrowseKind = 'note' | 'accord' | 'brand';

export interface SimilarResponse {
  basis: 'accords' | 'family';
  similar: SearchResult[];
  sameBrand: SearchResult[];
}

import { supabase } from './supabaseClient';

// The session token goes only on the live-lookup retry, so the server may
// save what the scrape finds. Everything else is sent without it: Vercel's
// CDN skips any request that carries Authorization, and catalog answers are
// the same for everyone.
async function optionalAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// In-memory answers for this page view: retyping a query, backspacing, or
// reopening a perfume shows the result instantly. Requests in flight are
// shared; failures are dropped so the next try goes to the network.
const MAX_CACHED = 200;
const memo = new Map<string, Promise<any>>();
function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit) {
    memo.delete(key); // re-insert: Map order doubles as least-recently-used
    memo.set(key, hit);
    return hit;
  }
  const p = load();
  memo.set(key, p);
  p.catch(() => memo.delete(key));
  if (memo.size > MAX_CACHED) memo.delete(memo.keys().next().value!);
  return p;
}

// Case and spacing don't change the answer; folding them here also makes
// "Sauvage" and "sauvage " share one CDN entry.
const normalize = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');

export async function searchCatalog(query: string, offset = 0): Promise<SearchResponse> {
  const q = normalize(query || '');
  if (q.length < 2) return { results: [] };
  const url = `/api/search?q=${encodeURIComponent(q)}&offset=${offset}`;

  try {
    const data = await remember(`q:${q}:${offset}`, async () => {
      const first = await getJson(url);
      // Not in the catalog: ask for a live lookup, as the signed-in user.
      if (first.tryLive) return getJson(`${url}&live=1`, await optionalAuthHeaders());
      return first;
    });
    return { results: data.results || [], match: data.match, hasMore: !!data.hasMore };
  } catch (error) {
    console.error('Search API error:', error);
    return { results: [] };
  }
}

/** Perfumes with a note or accord, or a house's line-up, most-rated first. */
export async function browseCatalog(kind: BrowseKind, value: string, offset = 0): Promise<SearchResponse> {
  const url = `/api/search?${kind}=${encodeURIComponent(value)}&offset=${offset}`;
  try {
    const data = await remember(url, () => getJson(url));
    return { results: data.results || [], match: 'browse', hasMore: !!data.hasMore };
  } catch (error) {
    console.error('Browse API error:', error);
    return { results: [] };
  }
}

export async function fetchFragranceSuggestions(query: string): Promise<SearchResult[]> {
  return (await searchCatalog(query)).results;
}

/** Most-rated perfumes with a bottle photo, for the empty search state. */
export async function fetchPopular(): Promise<SearchResult[]> {
  try {
    return (await remember('popular', () => getJson('/api/search?popular=1'))).results || [];
  } catch (error) {
    console.error('Popular API error:', error);
    return [];
  }
}

/** "Reminds me of" (other houses, by accords/notes) + "More from <brand>". */
export async function fetchSimilar(id: string): Promise<SimilarResponse> {
  const url = `/api/similar?id=${encodeURIComponent(id)}`;
  return remember(url, () => getJson(url));
}

/**
 * Wake the catalog functions while the user is still reading the page, so the
 * first search or perfume view doesn't pay a serverless cold start (~1-3 s).
 * Cached answers come from the CDN and never wake a function on their own.
 */
export function warmUp() {
  for (const url of ['/api/search?warm=1', '/api/similar?warm=1']) {
    fetch(url, { cache: 'no-store' }).catch(() => {});
  }
}

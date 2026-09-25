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
  match?: 'exact' | 'fuzzy';
}

export interface SimilarResponse {
  basis: 'accords' | 'family';
  similar: SearchResult[];
  sameBrand: SearchResult[];
}

import { supabase } from './supabaseClient';

// Attach the user's session token when one exists, so the server may cache
// scraped results. Search still works without it (server returns live results
// without persisting), so a missing session is not an error here.
async function optionalAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function searchCatalog(query: string): Promise<SearchResponse> {
  if (!query || query.trim().length < 2) return { results: [] };

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
      headers: await optionalAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return { results: data.results || [], match: data.match };
  } catch (error) {
    console.error('Search API error:', error);
    return { results: [] };
  }
}

export async function fetchFragranceSuggestions(query: string): Promise<SearchResult[]> {
  return (await searchCatalog(query)).results;
}

/** Most-rated perfumes with a bottle photo, for the empty search state. */
export async function fetchPopular(): Promise<SearchResult[]> {
  try {
    const res = await fetch('/api/search?popular=1');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return (await res.json()).results || [];
  } catch (error) {
    console.error('Popular API error:', error);
    return [];
  }
}

/** "Reminds me of" (other houses, by accords/notes) + "More from <brand>". */
export async function fetchSimilar(id: string): Promise<SimilarResponse> {
  const res = await fetch(`/api/similar?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface SearchResult {
  id: string;
  name: string;
  tier?: string;
  source?: string;
  image_url?: string | null;
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

export async function fetchFragranceSuggestions(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
      headers: await optionalAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Search API error:', error);
    return [];
  }
}

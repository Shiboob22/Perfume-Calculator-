export interface SearchResult {
  id: string;
  name: string;
  tier?: string;
  source?: string;
}

export async function fetchFragranceSuggestions(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Search API error:', error);
    return [];
  }
}

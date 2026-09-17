import React, { useState, useEffect } from 'react';
import { fetchFragranceSuggestions, SearchResult } from '../lib/searchApi';

export function SearchTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedPerfume, setSelectedPerfume] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        const data = await fetchFragranceSuggestions(query);
        setResults(data);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-w-5xl mx-auto">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Search saved perfumes
          </label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fragrance (e.g. Naxos)..."
              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-800"
            />
            {loading && (
              <span className="absolute right-3 top-2.5 text-xs text-neutral-400 animate-pulse">
                Searching...
              </span>
            )}
          </div>
        </div>

        {query.trim().length >= 2 && results.length === 0 && !loading && (
          <p className="text-sm text-neutral-500">No saved perfumes match "{query}".</p>
        )}

        {results.length > 0 && (
          <div className="border border-neutral-200 rounded-md overflow-hidden divide-y divide-neutral-100 bg-white shadow-sm">
            {results.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedPerfume(item)}
                className={`p-3 cursor-pointer hover:bg-neutral-50 transition-colors flex justify-between items-center ${
                  selectedPerfume?.id === item.id ? 'bg-neutral-100 font-medium' : ''
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-neutral-900">{item.name}</div>
                  {item.tier && (
                    <span className="text-xs text-neutral-500 uppercase tracking-wider">
                      {item.tier}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-md flex flex-col justify-center items-center text-center">
        {selectedPerfume ? (
          <div className="w-full text-left space-y-3">
            <h3 className="text-xl font-bold text-neutral-900">{selectedPerfume.name}</h3>
            {selectedPerfume.tier && (
              <div className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-neutral-200 text-neutral-800 rounded">
                Tier: {selectedPerfume.tier}
              </div>
            )}
            <div className="pt-4 border-t border-neutral-200 text-xs text-neutral-500 space-y-1">
              <p><span className="font-semibold text-neutral-700">Source:</span> {selectedPerfume.source || 'Database'}</p>
              <p><span className="font-semibold text-neutral-700">ID:</span> {selectedPerfume.id}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Select a result to see its note pyramid and accords.
          </p>
        )}
      </div>
    </div>
  );
}

export default SearchTab;

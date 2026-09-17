import React, { useState, useEffect } from 'react';
import { fetchFragranceSuggestions } from '../lib/searchApi';

export function PerfumeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedPerfume, setSelectedPerfume] = useState(null);
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
      {/* Search Input and Results Column */}
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

      {/* Detail View Container: Pyramid & Accords */}
      <div className="p-6 bg-white border border-neutral-200 rounded-md flex flex-col space-y-4 shadow-sm">
        {selectedPerfume ? (
          <div className="w-full space-y-5">
            <div>
              <h3 className="text-xl font-bold text-neutral-900">{selectedPerfume.name}</h3>
              {selectedPerfume.tier && (
                <div className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-800 rounded border border-neutral-200">
                  TIER: {selectedPerfume.tier}
                </div>
              )}
            </div>

            {/* Main Accords */}
            {selectedPerfume.accords && selectedPerfume.accords.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider">Main Accords</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPerfume.accords.map((acc, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/60 rounded">
                      {acc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Note Pyramid */}
            <div className="space-y-3 pt-2 border-t border-neutral-100">
              <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider">Official Note Pyramid</span>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-neutral-50 rounded border border-neutral-100">
                  <span className="font-semibold text-neutral-700 block mb-0.5">Top Notes</span>
                  <span className="text-neutral-600">
                    {selectedPerfume.top_notes?.join(', ') || 'Not specified'}
                  </span>
                </div>

                <div className="p-2.5 bg-neutral-50 rounded border border-neutral-100">
                  <span className="font-semibold text-neutral-700 block mb-0.5">Heart / Middle Notes</span>
                  <span className="text-neutral-600">
                    {selectedPerfume.middle_notes?.join(', ') || 'Not specified'}
                  </span>
                </div>

                <div className="p-2.5 bg-neutral-50 rounded border border-neutral-100">
                  <span className="font-semibold text-neutral-700 block mb-0.5">Base Notes</span>
                  <span className="text-neutral-600">
                    {selectedPerfume.base_notes?.join(', ') || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[10px] font-mono text-neutral-400 flex justify-between">
              <span>Source: {selectedPerfume.source || 'Database'}</span>
              <span>ID: {selectedPerfume.id.substring(0, 8)}...</span>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-sm text-neutral-400 py-12">
            Select a result to see its note pyramid and accords.
          </div>
        )}
      </div>
    </div>
  );
}

export default PerfumeSearch;

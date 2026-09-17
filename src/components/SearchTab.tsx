import React, { useState } from 'react';
import { FragranceAutocomplete } from './FragranceAutocomplete';
import { SearchResult } from '../lib/searchApi';

export const SearchTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFragrance, setSelectedFragrance] = useState<SearchResult | null>(null);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-neutral-900">Fragrance Search</h2>
        <p className="text-sm text-neutral-500">
          Search internal database or query live records by fragrance name.
        </p>
      </div>

      <FragranceAutocomplete
        value={searchQuery}
        onChange={setSearchQuery}
        onSelect={(item) => setSelectedFragrance(item)}
        placeholder="Search database (e.g. Naxos, Layton)..."
      />

      {selectedFragrance && (
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2">
          <h3 className="font-semibold text-lg text-neutral-900">{selectedFragrance.name}</h3>
          {selectedFragrance.tier && (
            <p className="text-xs uppercase font-mono bg-neutral-200 inline-block px-2 py-0.5 rounded text-neutral-700">
              Tier: {selectedFragrance.tier}
            </p>
          )}
          {selectedFragrance.source && (
            <p className="text-xs text-neutral-400">Source: {selectedFragrance.source}</p>
          )}
        </div>
      )}
    </div>
  );
};

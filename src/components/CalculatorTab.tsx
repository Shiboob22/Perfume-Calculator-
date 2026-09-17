import React, { useState } from 'react';
import { FragranceAutocomplete } from './FragranceAutocomplete';
import { SearchResult } from '../lib/searchApi';

export const CalculatorTab: React.FC = () => {
  const [fragranceName, setFragranceName] = useState('');
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-neutral-900">Dilution & Ratio Calculator</h2>
        <p className="text-sm text-neutral-500">
          Select or enter a fragrance to calculate fragrance oil to alcohol ratios.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">Fragrance Target</label>
        <FragranceAutocomplete
          value={fragranceName}
          onChange={setFragranceName}
          onSelect={(item) => {
            setFragranceName(item.name);
            setSelectedItem(item);
          }}
          placeholder="Enter or search fragrance name..."
        />
      </div>

      {selectedItem && (
        <div className="p-3 bg-neutral-100 border border-neutral-200 rounded text-xs text-neutral-600">
          Loaded formula context for <span className="font-semibold">{selectedItem.name}</span>
        </div>
      )}
    </div>
  );
};

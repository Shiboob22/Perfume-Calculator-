import React, { useState } from 'react';
import { FragranceAutocomplete } from './FragranceAutocomplete';
import { SearchResult } from '../lib/searchApi';

const TIER_CONCENTRATION_MAP: Record<string, number> = {
  gourmand: 20,
  'amber-oriental': 22,
  'amber-floral': 20,
  'woody-floral': 18,
  'fresh-citrus': 15,
  'spicy-aromatic': 18,
  'woody-chypre': 18,
};

export const CalculatorTab: React.FC = () => {
  const [fragranceName, setFragranceName] = useState('');
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [targetConcentration, setTargetConcentration] = useState<number>(20);
  const [batchSize, setBatchSize] = useState<number>(30);
  const [logging, setLogging] = useState(false);
  const [logStatus, setLogStatus] = useState<string | null>(null);

  const handleSelect = (item: SearchResult) => {
    setFragranceName(item.name);
    setSelectedItem(item);

    if (item.tier && TIER_CONCENTRATION_MAP[item.tier.toLowerCase()]) {
      setTargetConcentration(TIER_CONCENTRATION_MAP[item.tier.toLowerCase()]);
    }
  };

  const oilAmount = parseFloat(((batchSize * targetConcentration) / 100).toFixed(2));
  const alcoholAmount = parseFloat((batchSize - oilAmount).toFixed(2));

  const handleLogBatch = async () => {
    if (!fragranceName.trim()) {
      setLogStatus('Please select or enter a fragrance name first.');
      return;
    }

    setLogging(true);
    setLogStatus(null);

    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fragrance_name: fragranceName,
          total_volume: batchSize,
          concentration: targetConcentration,
          oil_amount: oilAmount,
          alcohol_amount: alcoholAmount
        })
      });

      if (!res.ok) throw new Error('Failed to save batch');

      setLogStatus('Batch logged successfully!');
    } catch (err: any) {
      setLogStatus(`Error: ${err.message}`);
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 bg-white border border-neutral-200 rounded-lg shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-neutral-900">Batch & Ratio Calculator</h2>
        <p className="text-sm text-neutral-500">
          Select a fragrance target to auto-fill recommended oil ratios.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Fragrance Target
          </label>
          <FragranceAutocomplete
            value={fragranceName}
            onChange={setFragranceName}
            onSelect={handleSelect}
            placeholder="Search catalog (e.g. Aventus, Layton, Tobacco Vanille)..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Batch Volume (mL)
            </label>
            <input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Target Concentration (%)
            </label>
            <input
              type="number"
              value={targetConcentration}
              onChange={(e) => setTargetConcentration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="p-3 bg-neutral-100 border border-neutral-200 rounded text-xs text-neutral-600 flex justify-between items-center">
          <span>Active context: <strong className="text-neutral-900">{selectedItem.name}</strong></span>
          {selectedItem.tier && <span className="uppercase font-mono bg-white px-2 py-0.5 rounded border border-neutral-200">{selectedItem.tier}</span>}
        </div>
      )}

      <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Batch Readout
        </div>
        <div className="flex justify-between text-sm">
          <span>Fragrance Oil ({targetConcentration}%):</span>
          <span className="font-bold text-neutral-900">{oilAmount} mL</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Ethanol 96%:</span>
          <span className="font-bold text-neutral-900">{alcoholAmount} mL</span>
        </div>

        <button
          onClick={handleLogBatch}
          disabled={logging}
          className="w-full mt-2 py-2 px-4 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {logging ? 'Logging...' : 'Log this batch'}
        </button>

        {logStatus && (
          <p className={`text-xs text-center ${logStatus.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
            {logStatus}
          </p>
        )}
      </div>
    </div>
  );
};

export default CalculatorTab;

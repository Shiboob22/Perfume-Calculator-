import React, { useEffect, useState } from 'react';

interface Batch {
  id: string;
  fragrance_name: string;
  total_volume: number;
  concentration: number;
  oil_amount: number;
  alcohol_amount: number;
  created_at: string;
}

export const BatchesTab: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/batches');
      const data = await res.json();
      if (data.batches) setBatches(data.batches);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Formulation History</h2>
          <p className="text-xs text-neutral-500">Log of past batch calculations saved to Supabase.</p>
        </div>
        <button
          onClick={fetchBatches}
          className="text-xs font-mono bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1.5 rounded border border-neutral-300 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-neutral-400 animate-pulse">
          Loading formulation logs...
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-lg">
          No batches logged yet. Formulate a batch in the Calculator tab to start logging!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batches.map((batch) => (
            <div key={batch.id} className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-neutral-900 text-base">{batch.fragrance_name}</h3>
                <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                  {batch.concentration}% Conc.
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-neutral-100">
                <div>
                  <span className="text-neutral-400 block text-[10px]">Volume</span>
                  <span className="font-medium text-neutral-800">{batch.total_volume} mL</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Fragrance Oil</span>
                  <span className="font-semibold text-amber-900">{batch.oil_amount} mL</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Ethanol 96%</span>
                  <span className="font-semibold text-neutral-800">{batch.alcohol_amount} mL</span>
                </div>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono pt-1 text-right">
                {new Date(batch.created_at).toLocaleDateString()} at {new Date(batch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BatchesTab;

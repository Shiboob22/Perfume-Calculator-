import React, { useState, useEffect } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  tier: string;
  stock_g: number;
  low_threshold_g: number;
  cost_per_g?: number;
}

export const InventoryTab: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [restockAmounts, setRestockAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleRestock = async (id: string) => {
    const amount = restockAmounts[id] || 10;
    try {
      await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, restock_g: amount }),
      });
      fetchInventory();
    } catch (err) {
      console.error('Restock failed:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name} from inventory?`)) return;
    try {
      await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Inventory</h2>
          <p className="text-xs text-neutral-500">
            Stock decrements automatically each time you log a batch on the Calculator tab.
          </p>
        </div>
        <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-3 py-1 rounded border border-neutral-200">
          {items.length} tracked oils
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-neutral-400 animate-pulse">
          Loading inventory...
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-neutral-900 text-base">{item.name}</h3>
                  <span className="text-xs text-neutral-500">{item.tier}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-neutral-900">{item.stock_g.toFixed(2)} g</div>
                  <div className="text-[10px] text-neutral-400">threshold {item.low_threshold_g.toFixed(2)}g</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Restock amount (g)"
                    value={restockAmounts[item.id] || ''}
                    onChange={(e) =>
                      setRestockAmounts({ ...restockAmounts, [item.id]: Number(e.target.value) })
                    }
                    className="px-3 py-1 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black w-40"
                  />
                  <button
                    onClick={() => handleRestock(item.id)}
                    className="px-3 py-1 bg-neutral-900 text-white text-xs rounded hover:bg-neutral-800 transition-colors"
                  >
                    Add stock
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(item.id, item.name)}
                  className="text-xs text-red-600 hover:text-red-800 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryTab;

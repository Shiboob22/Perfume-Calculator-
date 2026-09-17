import React, { useState, useEffect } from 'react';

export function InventoryTab() {
  const [items, setItems] = useState([]);
  const [restockAmounts, setRestockAmounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

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

  const handleRestock = async (id) => {
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => (item.id || item.fragrance_id) !== id));
      } else {
        alert('Failed to delete item from inventory.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('An error occurred while deleting.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Inventory</h2>
          <p className="text-xs text-neutral-500">
            Stock decrements automatically each time you log a batch on the Calculator tab. Restock manually below.
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
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-lg">
          No inventory items found.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const itemId = item.id || item.fragrance_id;
            return (
              <div
                key={itemId}
                className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-neutral-900 text-base">{item.name}</h3>
                    <span className="text-xs text-neutral-500">{item.tier}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-neutral-900">
                      {Number(item.stock_g).toFixed(2)} g
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      threshold {Number(item.low_threshold_g || 10).toFixed(2)}g
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-neutral-100">
                  <div className="flex items-center space-x-2 flex-1">
                    <input
                      type="number"
                      placeholder="Restock amount (g)"
                      value={restockAmounts[itemId] || ''}
                      onChange={(e) =>
                        setRestockAmounts({ ...restockAmounts, [itemId]: Number(e.target.value) })
                      }
                      className="px-3 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black w-full max-w-[200px]"
                    />
                    <button
                      onClick={() => handleRestock(itemId)}
                      className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded hover:bg-neutral-800 transition-colors shrink-0"
                    >
                      Add stock
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(itemId, item.name)}
                    disabled={deletingId === itemId}
                    className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded font-medium transition-colors shrink-0 disabled:opacity-50"
                  >
                    {deletingId === itemId ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InventoryTab;

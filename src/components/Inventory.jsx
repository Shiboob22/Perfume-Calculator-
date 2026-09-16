import React, { useEffect, useState } from "react";
import { COLORS } from "../lib/theme";
import { TIERS } from "../lib/tiers";
import { listInventory, adjustInventory, setLowStockThreshold } from "../lib/fragranceApi";

function round2(n) {
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n * 100) / 100).toFixed(2);
}

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restockAmounts, setRestockAmounts] = useState({});

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setRows(await listInventory());
    } catch (e) {
      setError(e.message || "Could not load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleRestock(fragranceId) {
    const amount = parseFloat(restockAmounts[fragranceId]);
    if (!amount || amount <= 0) return;
    try {
      await adjustInventory(fragranceId, amount);
      setRestockAmounts({ ...restockAmounts, [fragranceId]: "" });
      refresh();
    } catch (e) {
      setError(e.message || "Could not restock.");
    }
  }

  async function handleThresholdChange(fragranceId, value) {
    const threshold = parseFloat(value);
    if (!Number.isFinite(threshold)) return;
    try {
      await setLowStockThreshold(fragranceId, threshold);
      setRows((prev) => prev.map((r) => (r.fragrance_id === fragranceId ? { ...r, low_stock_threshold_g: threshold } : r)));
    } catch (e) { /* non-critical, leave UI as typed */ }
  }

  const lowStock = rows.filter((r) => r.stock_g <= r.low_stock_threshold_g);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-serif font-semibold" style={{ color: COLORS.forestDeep }}>Inventory</h2>
        {rows.length > 0 && (
          <span className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>{rows.length} tracked oils</span>
        )}
      </div>
      <p className="text-xs font-mono mb-6" style={{ color: COLORS.inkSoft }}>
        Stock decrements automatically each time you log a batch on the Calculator tab. Restock manually below.
      </p>

      {loading && <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>Loading…</p>}
      {error && <p className="text-sm font-mono" style={{ color: "#8C4A3A" }}>{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>
          No inventory tracked yet — stock rows appear automatically once you log your first batch for a fragrance.
        </p>
      )}

      {lowStock.length > 0 && (
        <div className="mb-4 px-4 py-3 border text-sm font-mono" style={{ borderColor: "#8C4A3A", color: "#8C4A3A", backgroundColor: "#F7EDEA" }}>
          {lowStock.length} oil{lowStock.length > 1 ? "s" : ""} at or below threshold: {lowStock.map((r) => r.fragrances?.name).join(", ")}
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const low = r.stock_g <= r.low_stock_threshold_g;
          return (
            <div key={r.fragrance_id} className="p-4 border" style={{ borderColor: low ? "#8C4A3A" : COLORS.line, backgroundColor: COLORS.card }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-serif font-semibold" style={{ color: COLORS.forestDeep }}>
                    {r.fragrances?.name || "Unknown fragrance"}
                  </div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: COLORS.inkSoft }}>
                    {TIERS[r.fragrances?.tier]?.label || r.fragrances?.tier}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold" style={{ color: low ? "#8C4A3A" : COLORS.ink }}>
                    {round2(r.stock_g)} g
                  </div>
                  <div className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>
                    threshold {round2(r.low_stock_threshold_g)}g
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2 items-center">
                <input
                  type="number" step="0.1" placeholder="Restock amount (g)"
                  value={restockAmounts[r.fragrance_id] || ""}
                  onChange={(e) => setRestockAmounts({ ...restockAmounts, [r.fragrance_id]: e.target.value })}
                  className="flex-1 min-w-0 px-3 py-1.5 font-mono text-xs border"
                  style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}
                />
                <button
                  type="button"
                  onClick={() => handleRestock(r.fragrance_id)}
                  className="px-3 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: COLORS.forest, color: "#fff" }}
                >
                  Add stock
                </button>
                <input
                  type="number" step="1" title="Low-stock threshold (g)"
                  defaultValue={r.low_stock_threshold_g}
                  onBlur={(e) => handleThresholdChange(r.fragrance_id, e.target.value)}
                  className="w-20 px-2 py-1.5 font-mono text-xs border"
                  style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

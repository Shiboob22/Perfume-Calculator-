import React, { useEffect, useState } from "react";
import { COLORS } from "../lib/theme";
import { TIERS } from "../lib/tiers";
import { listBatches, deleteBatch } from "../lib/fragranceApi";
import { downloadBatchCard } from "../lib/batchCard";
import { batchInsights } from "../lib/aiApi";

function round2(n) {
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n * 100) / 100).toFixed(2);
}

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  async function handleInsights() {
    setInsightsLoading(true); setInsightsError("");
    try {
      setInsights(await batchInsights());
    } catch (e) {
      setInsightsError(e.message || "Could not reach Gemini.");
    } finally {
      setInsightsLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listBatches(100);
      setBatches(data);
    } catch (e) {
      setError(e.message || "Could not load batch history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleDelete(id) {
    try {
      await deleteBatch(id);
      setBatches((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      setError(e.message || "Could not delete that batch.");
    }
  }

  const totalOilCost = batches.reduce((sum, b) => sum + (b.oil_cost || 0), 0);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-serif font-semibold" style={{ color: COLORS.forestDeep }}>Batch history</h2>
        {batches.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>
              {batches.length} batches · {round2(totalOilCost)} total oil cost
            </span>
            <button
              type="button"
              onClick={handleInsights}
              disabled={insightsLoading}
              className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider border rounded-lg disabled:opacity-50"
              style={{ borderColor: COLORS.amberDeep, color: COLORS.amber }}
            >
              {insightsLoading ? "Thinking…" : "AI insights"}
            </button>
          </div>
        )}
      </div>

      {insightsError && <p className="text-sm font-mono mb-4" style={{ color: COLORS.danger }}>{insightsError}</p>}
      {insights && (
        <div className="mb-6 p-4 border rounded-lg whitespace-pre-wrap text-sm" style={{ borderColor: COLORS.amberDeep, backgroundColor: COLORS.card, color: COLORS.ink }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: COLORS.amberDeep }}>Gemini · insights</span>
            <button type="button" onClick={() => setInsights("")} className="text-xs font-mono underline" style={{ color: COLORS.inkSoft }}>
              Hide
            </button>
          </div>
          {insights}
        </div>
      )}

      {loading && <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>Loading…</p>}
      {error && <p className="text-sm font-mono" style={{ color: COLORS.danger }}>{error}</p>}
      {!loading && !error && batches.length === 0 && (
        <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>
          No batches logged yet — use "Log this batch" on the Calculator tab after computing a blend.
        </p>
      )}

      <div className="space-y-3">
        {batches.map((b) => (
          <div key={b.id} className="p-4 border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.card }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-serif font-semibold" style={{ color: COLORS.forestDeep }}>{b.fragrance_name}</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: COLORS.inkSoft }}>
                  {b.blend_date} · {TIERS[b.tier]?.label || b.tier} · {b.concentration_pct}%
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <button
                  type="button"
                  onClick={() => downloadBatchCard(b)}
                  className="text-xs font-mono underline"
                  style={{ color: COLORS.forest }}
                >
                  Export card
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="text-xs font-mono underline"
                  style={{ color: COLORS.inkSoft }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm font-mono" style={{ color: COLORS.ink }}>
              Oil {round2(b.oil_g)}g / {round2(b.oil_ml)}mL &nbsp;·&nbsp; Ethanol {round2(b.ethanol_g)}g / {round2(b.ethanol_ml)}mL
              &nbsp;·&nbsp; Total {round2(b.total_g)}g
              {b.oil_cost ? <> &nbsp;·&nbsp; Cost {round2(b.oil_cost)}</> : null}
            </div>
            {(b.oil_type || b.blended_by) && (
              <div className="text-xs font-mono mt-1" style={{ color: COLORS.inkSoft }}>
                {b.oil_type}{b.oil_type && b.blended_by ? " · " : ""}{b.blended_by ? "by " + b.blended_by : ""}
              </div>
            )}
            {b.notes && (
              <div className="text-sm italic mt-2" style={{ color: COLORS.inkSoft }}>{b.notes}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

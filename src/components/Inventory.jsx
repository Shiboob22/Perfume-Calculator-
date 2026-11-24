import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../lib/theme";
import { TIERS } from "../lib/tiers";
import { listInventory, adjustInventory, setLowStockThreshold } from "../lib/fragranceApi";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import EmptyState from "./EmptyState";
import ListSkeleton from "./kx/ListSkeleton";
import { useFlip } from "../motion";
import RoomHeader from "./kx/RoomHeader";
import { Link } from "../motion";

function round2(n) {
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n * 100) / 100).toFixed(2);
}

export default function Inventory() {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restockAmounts, setRestockAmounts] = useState({});
  // A row added or removed: the others slide to their places (motion M3).
  const listRef = useRef(null);
  useFlip(listRef, rows.map((r) => r.fragrance_id).join(","));

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setRows(await listInventory());
    } catch (e) {
      setError(errorText(t, e, "inventory.loadFailed"));
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
      setError(errorText(t, e, "inventory.restockFailed"));
    }
  }

  async function handleThresholdChange(fragranceId, value) {
    const threshold = parseFloat(value);
    if (!Number.isFinite(threshold)) return;
    try {
      await setLowStockThreshold(fragranceId, threshold);
      setRows((prev) => prev.map((r) => (r.fragrance_id === fragranceId ? { ...r, low_stock_threshold_g: threshold } : r)));
    } catch (e) {
      setError(errorText(t, e, "inventory.thresholdFailed"));
    }
  }

  const lowStock = rows.filter((r) => r.stock_g <= r.low_stock_threshold_g);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <RoomHeader name={t("inventory.title")} className="!mb-3">
        {rows.length > 0 && (
          <p className="text-xs font-mono mt-3" style={{ color: COLORS.inkSoft }}>{t("inventory.tracked", { count: rows.length })}</p>
        )}
      </RoomHeader>
      <p className="text-sm mb-3" style={{ color: COLORS.inkSoft }}>
        {t("inventory.intro")}
      </p>
      {/* Oils arrive from Search; say so on the page, not only when it is empty (audit M11). */}
      {rows.length > 0 && (
        <p className="text-sm mb-6">
          <Link to="/app/search" data-add-oil className="inline-flex items-center min-h-[44px] underline underline-offset-4" style={{ color: COLORS.actionText }}>{t("inventory.addOil")}</Link>
        </p>
      )}
      {rows.length === 0 && <div className="mb-6" />}

      {loading && <ListSkeleton label={t("app.loading")} rows={3} framed />}
      {error && <p className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <EmptyState text={t("inventory.empty")} action={t("inventory.emptyAction")} to="/app/search" />
      )}

      {lowStock.length > 0 && (
        <div className="mb-4 px-4 py-3 border rounded text-sm font-mono" style={{ borderColor: COLORS.danger, color: COLORS.danger, backgroundColor: COLORS.dangerBg }}>
          {t("inventory.lowStock", { count: lowStock.length, names: lowStock.map((r) => r.fragrances?.name).join(", ") })}
        </div>
      )}

      <div ref={listRef} className="space-y-3">
        {rows.map((r) => {
          const low = r.stock_g <= r.low_stock_threshold_g;
          return (
            <div key={r.fragrance_id} data-flip={r.fragrance_id} className="p-4 border rounded" style={{ borderColor: low ? COLORS.danger : COLORS.line, backgroundColor: COLORS.card }}>
              <div className="flex items-start justify-between">
                <div>
                  <div id={`inv-name-${r.fragrance_id}`} className="text-sm font-serif font-semibold" style={{ color: COLORS.forestDeep }}>
                    {r.fragrances?.name || t("inventory.unknown")}
                  </div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: COLORS.inkSoft }}>
                    {TIERS[r.fragrances?.tier] ? t(`families.${r.fragrances.tier}.label`) : r.fragrances?.tier}
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-sm font-mono font-semibold" style={{ color: low ? COLORS.danger : COLORS.ink }}>
                    {round2(r.stock_g)} g
                  </div>
                  <div className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>
                    {t("inventory.threshold", { grams: round2(r.low_stock_threshold_g) })}
                  </div>
                </div>
              </div>

              {/* Both boxes carry a visible label (audit M11); the oil's name joins it for screen readers. */}
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 items-end">
                <div className="flex-1 min-w-[9rem]">
                  <span id={`inv-add-${r.fragrance_id}`} className="block text-xs mb-1" style={{ color: COLORS.inkSoft }}>{t("inventory.stockField")}</span>
                  <span className="flex gap-2">
                    <input
                      type="number" step="0.1" inputMode="decimal"
                      aria-labelledby={`inv-add-${r.fragrance_id} inv-name-${r.fragrance_id}`}
                      value={restockAmounts[r.fragrance_id] || ""}
                      onChange={(e) => setRestockAmounts({ ...restockAmounts, [r.fragrance_id]: e.target.value })}
                      className="flex-1 min-w-0 px-3 min-h-[44px] font-mono text-sm border rounded"
                      style={{ borderColor: COLORS.field, backgroundColor: COLORS.cardHi, color: COLORS.ink }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRestock(r.fragrance_id)}
                      className="px-3 min-h-[44px] text-sm font-semibold rounded"
                      style={{ backgroundColor: COLORS.amber, color: COLORS.onAmber }}
                    >
                      {t("inventory.addStock")}
                    </button>
                  </span>
                </div>
                <label className="w-28">
                  <span id={`inv-warn-${r.fragrance_id}`} className="block text-xs mb-1" style={{ color: COLORS.inkSoft }}>{t("inventory.warnField")}</span>
                  <input
                    type="number" step="1" inputMode="decimal"
                    aria-labelledby={`inv-warn-${r.fragrance_id} inv-name-${r.fragrance_id}`}
                    defaultValue={r.low_stock_threshold_g}
                    onBlur={(e) => handleThresholdChange(r.fragrance_id, e.target.value)}
                    className="w-full px-2 min-h-[44px] font-mono text-sm border rounded"
                    style={{ borderColor: COLORS.field, backgroundColor: COLORS.cardHi, color: COLORS.ink }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

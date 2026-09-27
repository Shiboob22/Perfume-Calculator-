import React, { useEffect, useState } from "react";
import { COLORS } from "../lib/theme";
import { TIERS } from "../lib/tiers";
import { listBatches, deleteBatch } from "../lib/fragranceApi";
import { downloadBatchCard, actualOilPct } from "../lib/batchCard";
import { batchInsights } from "../lib/aiApi";
import { batchStartedAt, batchReadyAt, formatExact, readyCountdown } from "../lib/batchTiming";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { useEntitlements } from "../lib/useEntitlements";

function round2(n) {
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n * 100) / 100).toFixed(2);
}

function BatchTiming({ batch }) {
  const { t, locale } = useI18n();
  const started = batchStartedAt(batch);
  const ready = batchReadyAt(batch);
  if (!started) return null;
  const isReady = ready && ready <= new Date();
  const countdown = readyCountdown(ready);
  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
      <div>
        <span style={{ color: COLORS.inkSoft }}>{t("batches.created")} </span>
        <span style={{ color: COLORS.ink }}>{formatExact(started, locale)}</span>
      </div>
      {ready && (
        <div>
          <span style={{ color: COLORS.inkSoft }}>{t("batches.bestFrom")} </span>
          <span style={{ color: COLORS.ink }}>{formatExact(ready, locale)}</span>
          {countdown && (
            <span style={{ color: isReady ? COLORS.forest : COLORS.amberDeep }}> · {t(`batches.countdown.${countdown.key}`, { count: countdown.count })}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Batches() {
  const { t } = useI18n();
  const entitlements = useEntitlements();
  const capped = entitlements.loaded && !entitlements.features?.includes("batches.unlimited") && entitlements.batchCap != null;
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
      setInsightsError(errorText(t, e, "chat.unreachable"));
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
      setError(errorText(t, e, "batches.loadFailed"));
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
      setError(errorText(t, e, "batches.deleteFailed"));
    }
  }

  const totalOilCost = batches.reduce((sum, b) => sum + (b.oil_cost || 0), 0);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-serif font-semibold" style={{ color: COLORS.forestDeep }}>{t("batches.title")}</h2>
        {batches.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>
              {t("batches.summary", { count: batches.length, cost: round2(totalOilCost) })}
            </span>
            {entitlements.features?.includes("ai.ask") && <button
              type="button"
              onClick={handleInsights}
              disabled={insightsLoading}
              className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rtl:tracking-normal border rounded-lg disabled:opacity-50"
              style={{ borderColor: COLORS.amberDeep, color: COLORS.amber }}
            >
              {insightsLoading ? t("batches.thinking") : t("batches.insights")}
            </button>}
          </div>
        )}
      </div>

      {capped && (
        <p className="text-xs font-mono mb-4" style={{ color: batches.length >= entitlements.batchCap ? COLORS.danger : COLORS.inkSoft }}>
          {t("plan.usage", { used: batches.length, cap: entitlements.batchCap })}
          {batches.length >= entitlements.batchCap ? ` · ${t("plan.batchCap", { plan: t(`plan.names.${entitlements.plan}`), cap: entitlements.batchCap })}` : ""}
        </p>
      )}

      {insightsError && <p className="text-sm font-mono mb-4" style={{ color: COLORS.danger }}>{insightsError}</p>}
      {insights && (
        <div className="mb-6 p-4 border rounded-lg whitespace-pre-wrap text-sm" style={{ borderColor: COLORS.amberDeep, backgroundColor: COLORS.card, color: COLORS.ink }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider rtl:tracking-normal" style={{ color: COLORS.amberDeep }}>{t("batches.insightsLabel")}</span>
            <button type="button" onClick={() => setInsights("")} className="text-xs font-mono underline" style={{ color: COLORS.inkSoft }}>
              {t("batches.hide")}
            </button>
          </div>
          {insights}
        </div>
      )}

      {loading && <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>{t("app.loading")}</p>}
      {error && <p className="text-sm font-mono" style={{ color: COLORS.danger }}>{error}</p>}
      {!loading && !error && batches.length === 0 && (
        <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>
          {t("batches.empty")}
        </p>
      )}

      <div className="space-y-3">
        {batches.map((b) => (
          <div key={b.id} className="p-4 border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.card }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-serif font-semibold" style={{ color: COLORS.forestDeep }}>{b.fragrance_name}</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: COLORS.inkSoft }}>
                  {b.blend_date} · {TIERS[b.tier] ? t(`families.${b.tier}.label`) : b.tier} · {b.concentration_pct}%
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ms-3">
                <button
                  type="button"
                  onClick={() => downloadBatchCard(b)}
                  className="text-xs font-mono underline"
                  style={{ color: COLORS.forest }}
                >
                  {t("batches.exportCard")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="text-xs font-mono underline"
                  style={{ color: COLORS.inkSoft }}
                >
                  {t("batches.delete")}
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm font-mono" style={{ color: COLORS.ink }}>
              {t("batches.oil")} {round2(b.oil_g)} g / {round2(b.oil_ml)} mL &nbsp;·&nbsp; {t("batches.ethanol")} {round2(b.ethanol_g)} g / {round2(b.ethanol_ml)} mL
              &nbsp;·&nbsp; {t("batches.total")} {round2(b.total_g)} g
              {b.oil_cost ? <> &nbsp;·&nbsp; {t("batches.cost")} {round2(b.oil_cost)}</> : null}
              {b.price_per_gram ? <> ({round2(Number(b.price_per_gram))}{t("batches.perGram")})</> : null}
            </div>
            {actualOilPct(b) !== null && (
              <div className="text-xs font-mono mt-1" style={{ color: COLORS.ink }}>
                {t("batches.actualPour", { oil: round2(Number(b.actual_oil_g)), ethanol: round2(Number(b.actual_ethanol_g)), pct: round2(actualOilPct(b)), target: b.concentration_pct })}
              </div>
            )}
            <BatchTiming batch={b} />
            {(b.oil_type || b.blended_by) && (
              <div className="text-xs font-mono mt-1" style={{ color: COLORS.inkSoft }}>
                {b.oil_type}{b.oil_type && b.blended_by ? " · " : ""}{b.blended_by ? t("batches.by", { name: b.blended_by }) : ""}
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

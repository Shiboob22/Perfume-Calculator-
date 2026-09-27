import React, { useEffect, useMemo, useState } from "react";
import { COLORS } from "../lib/theme";
import { TIERS, TIER_COLORS, ML_PER_FLOZ, G_PER_OZ, ETHANOL_DENSITY_DEFAULT } from "../lib/tiers";
import {
  searchFragrances,
  getFragranceByExactName,
  ensureFragrance,
  getFragranceNotes,
  saveFragranceNotes,
  logBatch,
  adjustInventory,
  listBatches,
} from "../lib/fragranceApi";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { useEntitlements } from "../lib/useEntitlements";
import { can } from "../lib/entitlements";
import { blendTips } from "../lib/aiApi";

const UNIT_LABELS = { ml: "mL", floz: "fl oz", g: "g", oz: "oz" };

function round2(n) {
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n * 100) / 100).toFixed(2);
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Field({ label, hint, htmlFor, children }) {
  return (
    <div className="mb-5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold mb-2 tracking-wide rtl:tracking-normal" style={{ color: COLORS.ink }}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs mt-1" style={{ color: COLORS.ink }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
      style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: COLORS.cardHi }}
    />
  );
}

function AmountWithUnit({ id, unitLabel, value, onChange, unit, onUnitChange, units }) {
  return (
    <div className="flex gap-2">
      <input
        id={id}
        type="number"
        value={value}
        min="0.01"
        step="0.1"
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
        style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: COLORS.cardHi }}
      />
      <select
        aria-label={unitLabel}
        value={unit}
        onChange={(e) => onUnitChange(e.target.value)}
        className="px-2 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
        style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: COLORS.cardHi }}
      >
        {units.map((u) => (
          <option key={u.value} value={u.value}>{u.label}</option>
        ))}
      </select>
    </div>
  );
}

function ReadoutRow({ label, weight, volume, bold }) {
  const oz = weight / G_PER_OZ;
  const flOz = volume / ML_PER_FLOZ;
  return (
    <div
      className="flex items-start justify-between py-3"
      style={{
        borderBottom: bold ? "none" : `1px solid ${COLORS.line}`,
        borderTop: bold ? `1px solid ${COLORS.inkSoft}` : "none",
        marginTop: bold ? "6px" : "0",
        paddingTop: bold ? "14px" : "12px",
      }}
    >
      <span className={`text-sm ${bold ? "font-semibold" : ""}`} style={{ color: COLORS.ink }}>
        {label}
      </span>
      <span className="text-end">
        <span className={`block font-mono text-sm ${bold ? "font-semibold" : ""}`} style={{ color: COLORS.ink }}>
          {round2(weight)} g&nbsp;&nbsp;/&nbsp;&nbsp;{round2(volume)} mL
        </span>
        <span className="block font-mono text-xs mt-0.5" style={{ color: COLORS.ink }}>
          {round2(oz)} oz&nbsp;&nbsp;/&nbsp;&nbsp;{round2(flOz)} fl oz
        </span>
      </span>
    </div>
  );
}

/**
 * FragranceBlendCalculator
 * -------------------------
 * Supabase-backed: looks up (or creates) fragrances in the `fragrances`
 * table for auto-classification, loads/saves personal notes to
 * `fragrance_notes`, and "Log this batch" writes to `batches` while
 * decrementing `inventory` by the oil grams used. Replaces the previous
 * manual-density-only version and the HTML tool's localStorage-only
 * personal log — this is now the single source of truth.
 */
export default function FragranceBlendCalculator({ selectedPerfume, onClearSelection }) {
  const { t } = useI18n();
  const entitlements = useEntitlements();
  const [fragName, setFragName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [matched, setMatched] = useState(null); // resolved { id, name, tier } or null
  const debouncedName = useDebouncedValue(fragName, 200);

  const [tierKey, setTierKey] = useState("fresh");
  const [batchSize, setBatchSize] = useState(100);
  const [batchUnit, setBatchUnit] = useState("ml"); // ml | floz | g | oz
  const [concPct, setConcPct] = useState(20);
  const [densities, setDensities] = useState(() => ({
    ...Object.fromEntries(Object.entries(TIERS).map(([k, t]) => [k, t.density])),
    ethanol: ETHANOL_DENSITY_DEFAULT,
  }));

  const [oilType, setOilType] = useState("");
  const [pricePerGram, setPricePerGram] = useState("");
  const [notes, setNotes] = useState("");
  // What was really poured on the scale — often off the target by a little.
  const [actualOilG, setActualOilG] = useState("");
  const [actualEthG, setActualEthG] = useState("");
  const [blendedBy, setBlendedBy] = useState("");
  const [blendDate, setBlendDate] = useState(todayISO());

  const [logStatus, setLogStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  // Suppliers this user has typed before, newest first, as input suggestions.
  const [oilTypeOptions, setOilTypeOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    listBatches(100)
      .then((batches) => {
        if (cancelled) return;
        const seen = [...new Set(batches.map((b) => (b.oil_type || "").trim()).filter(Boolean))];
        setOilTypeOptions(seen);
      })
      .catch(() => {}); // suggestions only — the field works without them
    return () => { cancelled = true; };
  }, []);
  const [logError, setLogError] = useState("");
  // Shown under "Saved" when the batch saved but the stock step needs a word.
  const [logNote, setLogNote] = useState("");

  // Incoming selection from PerfumeSearch (scraped Fragrantica-style data)
  useEffect(() => {
    if (selectedPerfume?.name) setFragName(selectedPerfume.name);
  }, [selectedPerfume]);

  // Debounced suggestion search against the classification table
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!debouncedName.trim()) { setSuggestions([]); return; }
      try {
        const results = await searchFragrances(debouncedName, 6);
        if (!cancelled) setSuggestions(results);
      } catch (e) { if (!cancelled) setSuggestions([]); }
    }
    run();
    return () => { cancelled = true; };
  }, [debouncedName]);

  async function resolveAndLoad(name) {
    try {
      const found = await getFragranceByExactName(name);
      setMatched(found);
      if (found) {
        // Defensive: only trust found.tier if it's actually a valid tier
        // key. Guards against a malformed row (bad manual DB edit, future
        // schema drift) crashing the calculator instead of degrading.
        const validTier = TIERS[found.tier] ? found.tier : "fresh";
        setTierKey(validTier);
        setConcPct(TIERS[validTier].defaultConc);
        const noteRow = await getFragranceNotes(found.id);
        setOilType(noteRow?.oil_type || "");
        setPricePerGram(noteRow?.price_per_gram ?? "");
        setNotes(noteRow?.notes || "");
      } else {
        setOilType(""); setPricePerGram(""); setNotes("");
      }
    } catch (e) { /* offline or query failed — leave fields as-is */ }
  }

  useEffect(() => {
    if (debouncedName.trim()) resolveAndLoad(debouncedName);
    else setMatched(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName]);

  const result = useMemo(() => {
    const amount = Number(batchSize) || 0;
    const conc = Math.min(Math.max(Number(concPct) || 0, 0), 100) / 100;
    const oilDensity = densities[tierKey] || 1;
    const ethDensity = densities.ethanol || ETHANOL_DENSITY_DEFAULT;

    let oilG, oilMl, ethG, ethMl, totalG, totalMl;
    if (batchUnit === "ml" || batchUnit === "floz") {
      totalMl = batchUnit === "floz" ? amount * ML_PER_FLOZ : amount;
      oilMl = totalMl * conc; ethMl = totalMl * (1 - conc);
      oilG = oilMl * oilDensity; ethG = ethMl * ethDensity;
      totalG = oilG + ethG;
    } else {
      totalG = batchUnit === "oz" ? amount * G_PER_OZ : amount;
      oilG = totalG * conc; ethG = totalG * (1 - conc);
      oilMl = oilG / oilDensity; ethMl = ethG / ethDensity;
      totalMl = oilMl + ethMl;
    }
    // Actual pour: share of oil in what was really weighed out, on the same
    // basis as the target (by volume for mL / fl oz batches, by weight for
    // g / oz), so it reads directly against the concentration slider.
    const aOilG = Number(actualOilG) > 0 ? Number(actualOilG) : null;
    const aEthG = Number(actualEthG) > 0 ? Number(actualEthG) : null;
    let actual = null;
    if (aOilG !== null && aEthG !== null) {
      const byVolume = batchUnit === "ml" || batchUnit === "floz";
      const oilPart = byVolume ? aOilG / oilDensity : aOilG;
      const ethPart = byVolume ? aEthG / ethDensity : aEthG;
      actual = { oilPct: (oilPart / (oilPart + ethPart)) * 100, byVolume };
    }

    // Cost and stock follow the oil actually used when it was recorded.
    const usedOilG = aOilG ?? oilG;
    const price = Number(pricePerGram);
    const oilCost = price > 0 ? usedOilG * price : null;
    return { oilG, oilMl, ethG, ethMl, totalG, totalMl, oilCost, conc, actual, usedOilG };
  }, [batchSize, batchUnit, concPct, densities, tierKey, pricePerGram, actualOilG, actualEthG]);

  async function handleLogBatch() {
    if (!fragName.trim()) return;
    setLogStatus("saving"); setLogError(""); setLogNote("");
    try {
      let fragrance = matched;
      if (!fragrance) {
        fragrance = await ensureFragrance(fragName, tierKey);
        setMatched(fragrance);
      }
      await saveFragranceNotes(fragrance.id, { oilType, pricePerGram: pricePerGram || null, notes });
      await logBatch({
        fragrance_id: fragrance.id,
        fragrance_name: fragName.trim(),
        tier: tierKey,
        blend_date: blendDate,
        concentration_pct: Number(concPct),
        oil_g: result.oilG, oil_ml: result.oilMl,
        ethanol_g: result.ethG, ethanol_ml: result.ethMl,
        total_g: result.totalG, total_ml: result.totalMl,
        oil_type: oilType || null,
        price_per_gram: pricePerGram || null,
        oil_cost: result.oilCost,
        notes: notes || null,
        blended_by: blendedBy || null,
        actual_oil_g: Number(actualOilG) > 0 ? Number(actualOilG) : null,
        actual_ethanol_g: Number(actualEthG) > 0 ? Number(actualEthG) : null,
      });
      // The batch is saved from here on: nothing below may report it as unsaved,
      // or a retry would log it twice.
      await deductStock(fragrance.id, result.usedOilG);
      // Actual pours belong to this batch only — clear them so the next
      // log doesn't silently reuse them.
      setActualOilG(""); setActualEthG("");
      setLogStatus("saved");
      entitlements.refresh();
    } catch (e) {
      setLogStatus("error");
      setLogError(e.code === "batch_cap"
        ? t("plan.batchCap", { plan: t(`plan.names.${entitlements.plan}`), cap: e.detail?.cap ?? entitlements.batchCap })
        : errorText(t, e, "calc.saveFailedGeneric"));
    }
  }

  // Take the oil used by a just-saved batch out of inventory. Never throws:
  // the batch is already saved, so every outcome here ends in a note at most.
  async function deductStock(fragranceId, grams) {
    if (!can(entitlements, "inventory")) return; // no stock tracking on this plan
    // An untracked oil stays untracked: creating a row here would start it at
    // 0 g, and a stock figure the user never entered is worse than none.
    try {
      await adjustInventory(fragranceId, -grams);
    } catch (e) {
      setLogNote(e.code === "not_tracked"
        ? t("calculator.log.untracked")
        : t("calculator.log.stockFailed", { error: e.message }));
    }
  }

  const [tips, setTips] = useState("");
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState("");

  // Advice is for one exact blend — drop it once the blend changes.
  useEffect(() => {
    setTips(""); setTipsError("");
  }, [fragName, tierKey, concPct, result.totalMl]);

  async function handleAdvise() {
    setTipsLoading(true); setTipsError("");
    try {
      setTips(await blendTips({
        name: fragName.trim(),
        tier: tierKey,
        concentration_pct: Number(concPct),
        total_ml: result.totalMl,
      }));
    } catch (e) {
      setTipsError(errorText(t, e, "chat.unreachable"));
    } finally {
      setTipsLoading(false);
    }
  }

  const tier = TIERS[tierKey] || TIERS.fresh;

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      {selectedPerfume && (
        <div className="mb-6 px-4 py-3 border flex items-center justify-between" style={{ borderColor: COLORS.line, backgroundColor: COLORS.card }}>
          <div>
            <span className="text-xs font-semibold" style={{ color: COLORS.ink }}>{t("calc.fromSearch")}</span>
            <div className="text-sm font-serif" style={{ color: COLORS.forestDeep }}>
              {selectedPerfume.name}{selectedPerfume.brand ? ` — ${selectedPerfume.brand}` : ""}
            </div>
          </div>
          <button type="button" onClick={onClearSelection} className="text-xs font-mono underline" style={{ color: COLORS.ink }}>
            {t("calc.clear")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border" style={{ backgroundColor: COLORS.card, borderColor: COLORS.line }}>
          <h3 className="text-base font-serif font-semibold mb-5" style={{ color: COLORS.forestDeep }}>{t("calc.benchSheet")}</h3>

          <Field label={t("calc.name")} htmlFor="calc-name">
            <div className="relative">
              <TextInput id="calc-name" value={fragName} onChange={(e) => setFragName(e.target.value)} placeholder={t("calc.namePlaceholder")} autoComplete="off" />
              {suggestions.length > 0 && (
                <div className="border mt-1" style={{ borderColor: COLORS.line, backgroundColor: COLORS.cardHi, color: COLORS.ink }}>
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setFragName(s.name); setSuggestions([]); }}
                      onClick={() => { setFragName(s.name); setSuggestions([]); }}
                      className="w-full text-start px-3 py-2 text-sm font-mono hover:opacity-70"
                      style={{ color: COLORS.ink }}
                    >
                      {s.name} <span style={{ color: COLORS.ink }}>— {t(`families.${s.tier}.label`)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {matched && (
              <p className="text-xs mt-1" style={{ color: COLORS.ink }}>
                {t("calc.matched", { family: t(`families.${matched.tier}.label`) })}
              </p>
            )}
            {!matched && fragName.trim() && (
              <p className="text-xs mt-1" style={{ color: COLORS.ink }}>
                {t("calc.notMatched")}
              </p>
            )}
          </Field>

          <Field label={t("calc.family")} htmlFor="calc-family">
            <select
              id="calc-family"
              value={tierKey}
              onChange={(e) => { setTierKey(e.target.value); setConcPct(TIERS[e.target.value].defaultConc); }}
              className="w-full px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: COLORS.cardHi }}
            >
              {Object.keys(TIERS).map((key) => (
                <option key={key} value={key}>{t(`families.${key}.label`)} — {t(`families.${key}.sub`)}</option>
              ))}
            </select>
          </Field>

          <Field label={t("calc.batchSize")} htmlFor="calc-size">
            <AmountWithUnit
              id="calc-size" unitLabel={t("calc.unit")}
              value={batchSize} onChange={setBatchSize} unit={batchUnit} onUnitChange={setBatchUnit}
              units={[{value:"ml",label:"mL"},{value:"floz",label:"fl oz"},{value:"g",label:"g"},{value:"oz",label:"oz"}]}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {[3, 5, 10, 20, 30, 50, 100, 125, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setBatchSize(amt); }}
                  className="px-2 py-1 text-[11px] font-mono border transition-opacity"
                  style={{ 
                    borderColor: Number(batchSize) === amt ? COLORS.amber : COLORS.line,
                    color: Number(batchSize) === amt ? COLORS.onAmber : COLORS.ink,
                    backgroundColor: Number(batchSize) === amt ? COLORS.amber : COLORS.cardHi
                  }}
                >
                  {amt} {UNIT_LABELS[batchUnit]}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t("calc.concentration", { pct: concPct })} hint={t("calc.familyDefault", { pct: tier.defaultConc })} htmlFor="calc-conc">
            <div className="flex gap-2 mb-3">
              {[20, 22, 25, 30].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConcPct(c)}
                  className="px-3 py-1 text-[11px] font-mono border transition-opacity"
                  style={{ 
                    borderColor: Number(concPct) === c ? COLORS.amber : COLORS.line,
                    color: Number(concPct) === c ? COLORS.onAmber : COLORS.ink,
                    backgroundColor: Number(concPct) === c ? COLORS.amber : COLORS.cardHi
                  }}
                >
                  {c}%
                </button>
              ))}
            </div>
            <input
              id="calc-conc"
              type="range" min="10" max="40" step="1" value={concPct}
              onChange={(e) => setConcPct(e.target.value)}
              className="w-full" style={{ accentColor: COLORS.forest }}
            />
          </Field>

          <details className="mt-2 mb-5">
            <summary className="text-xs font-semibold cursor-pointer" style={{ color: COLORS.forestDeep }}>{t("calc.densities")}</summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {Object.keys(TIERS).map((key) => (
                <div key={key}>
                  <label htmlFor={`calc-density-${key}`} className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t(`families.${key}.label`)} (g/mL)</label>
                  <TextInput id={`calc-density-${key}`} type="number" step="0.01" value={densities[key]}
                    onChange={(e) => setDensities({ ...densities, [key]: parseFloat(e.target.value) || 0 })} />
                </div>
              ))}
              <div>
                <label htmlFor="calc-density-ethanol" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.ethanol96")} (g/mL)</label>
                <TextInput id="calc-density-ethanol" type="number" step="0.01" value={densities.ethanol}
                  onChange={(e) => setDensities({ ...densities, ethanol: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </details>

          <div className="pt-1 border-t" style={{ borderColor: COLORS.line }}>
            <h4 className="text-xs font-semibold mt-4 mb-3" style={{ color: COLORS.forestDeep }}>
              {t("calc.personalLog")} <span className="font-normal" style={{ color: COLORS.ink }}>— {t("calc.savedToAccount")}</span>
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="calc-oil-type" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.oilType")}</label>
                <input id="calc-oil-type" list="oilTypeOptions" value={oilType} onChange={(e) => setOilType(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-sm border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.cardHi, color: COLORS.ink }} />
                <datalist id="oilTypeOptions">
                  {oilTypeOptions.map((o) => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div>
                <label htmlFor="calc-price" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.pricePerGram")}</label>
                <TextInput id="calc-price" type="number" step="0.01" min="0" value={pricePerGram} onChange={(e) => setPricePerGram(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div>
                <label htmlFor="calc-actual-oil" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.actualOil")}</label>
                <TextInput id="calc-actual-oil" type="number" step="0.01" min="0" value={actualOilG} onChange={(e) => setActualOilG(e.target.value)} placeholder={round2(result.oilG)} />
              </div>
              <div>
                <label htmlFor="calc-actual-ethanol" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.actualEthanol")}</label>
                <TextInput id="calc-actual-ethanol" type="number" step="0.01" min="0" value={actualEthG} onChange={(e) => setActualEthG(e.target.value)} placeholder={round2(result.ethG)} />
              </div>
            </div>
            <p className="text-xs mb-3 font-mono" style={{ color: COLORS.ink }}>
              {result.actual
                ? t(result.actual.byVolume ? "calc.actualRatioVolume" : "calc.actualRatioWeight", { oil: round2(result.actual.oilPct), ethanol: round2(100 - result.actual.oilPct), target: Number(concPct) })
                : t("calc.actualHint")}
            </p>
            <label htmlFor="calc-notes" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.notes")}</label>
            <textarea
              id="calc-notes"
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 font-mono text-sm border resize-y"
              style={{ borderColor: COLORS.line, backgroundColor: COLORS.cardHi, color: COLORS.ink }}
            />
          </div>
        </div>

        <div className="p-6 border" style={{ backgroundColor: COLORS.card, borderColor: COLORS.line }}>
          <h3 className="text-base font-serif font-semibold mb-5" style={{ color: COLORS.forestDeep }}>{t("calc.readout")}</h3>

          <ReadoutRow label={t("calc.oil")} weight={result.oilG} volume={result.oilMl} />
          <ReadoutRow label={t("calc.ethanol96")} weight={result.ethG} volume={result.ethMl} />
          <ReadoutRow label={t("calc.total")} weight={result.totalG} volume={result.totalMl} bold />

          {result.oilCost !== null && (
            <div className="flex items-center justify-between py-2 mt-2 text-sm font-mono">
              <span style={{ color: COLORS.ink }}>{t("calc.oilCost")}</span>
              <span style={{ color: COLORS.ink }}>{t("calc.oilCostValue", { cost: round2(result.oilCost), price: round2(Number(pricePerGram)) })}</span>
            </div>
          )}

          <p className="text-sm italic mt-4" style={{ color: COLORS.ink }}>{t(`families.${tierKey}.note`)}</p>

          {can(entitlements, "ai.ask") && <button
            type="button"
            onClick={handleAdvise}
            disabled={!fragName.trim() || tipsLoading}
            className="mt-4 px-4 py-2 text-xs font-mono uppercase tracking-wider rtl:tracking-normal border rounded-lg disabled:opacity-50"
            style={{ borderColor: COLORS.amberDeep, color: COLORS.amber }}
          >
            {tipsLoading ? t("calc.asking") : t("calc.advise")}
          </button>}
          {tips && (
            <div className="mt-3 p-3 text-sm whitespace-pre-wrap border rounded-lg" style={{ borderColor: COLORS.line, backgroundColor: COLORS.cardHi, color: COLORS.ink }}>
              {tips}
              <div className="text-[10px] font-mono mt-2" style={{ color: COLORS.dim }}>{t("calc.aiCaveat")}</div>
            </div>
          )}
          {tipsError && <p className="text-xs mt-2" style={{ color: COLORS.danger }}>{tipsError}</p>}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="calc-blended-by" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.blendedBy")}</label>
              <TextInput id="calc-blended-by" value={blendedBy} onChange={(e) => setBlendedBy(e.target.value)} />
            </div>
            <div>
              <label htmlFor="calc-date" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.date")}</label>
              <TextInput id="calc-date" type="date" value={blendDate} onChange={(e) => setBlendDate(e.target.value)} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogBatch}
            disabled={!fragName.trim() || logStatus === "saving"}
            className="w-full mt-5 px-4 py-3 text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: COLORS.forest, color: COLORS.onAmber }}
          >
            {logStatus === "saving" ? t("calc.saving") : t("calc.log")}
          </button>
          {logStatus === "saved" && (
            <p className="text-xs mt-2" style={{ color: COLORS.forest }}>
              {t(matched ? "calc.saved" : "calc.savedNew")}
            </p>
          )}
          {logStatus === "saved" && logNote && (
            <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{logNote}</p>
          )}
          {logStatus === "error" && (
            <p className="text-xs mt-2" style={{ color: COLORS.danger }}>{t("calc.saveFailed", { error: logError })}</p>
          )}
        </div>
      </div>
    </div>
  );
}

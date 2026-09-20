import React, { useEffect, useMemo, useState } from "react";
import { COLORS } from "../lib/theme";
import { TIERS, TIER_COLORS, ML_PER_FLOZ, G_PER_OZ, ETHANOL_DENSITY_DEFAULT } from "../lib/tiers";
import {
  searchFragrances,
  getFragranceByExactName,
  upsertFragrance,
  getFragranceNotes,
  saveFragranceNotes,
  logBatch,
  adjustInventory,
} from "../lib/fragranceApi";

const OIL_TYPE_OPTIONS = ["Luzi fragrances / Tiba perfumes", "Golden Man / El Sharkasy"];

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

function Field({ label, hint, children }) {
  return (
    <div className="mb-5">
      <label className="block text-xs font-semibold mb-2 tracking-wide" style={{ color: "#000" }}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs mt-1" style={{ color: "#000" }}>
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
      style={{ borderColor: "#e5e7eb", color: "#000", backgroundColor: "#fff" }}
    />
  );
}

function AmountWithUnit({ value, onChange, unit, onUnitChange, units }) {
  return (
    <div className="flex gap-2">
      <input
        type="number"
        value={value}
        min="0.01"
        step="0.1"
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
        style={{ borderColor: "#e5e7eb", color: "#000", backgroundColor: "#fff" }}
      />
      <select
        value={unit}
        onChange={(e) => onUnitChange(e.target.value)}
        className="px-2 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
        style={{ borderColor: "#e5e7eb", color: "#000", backgroundColor: "#fff" }}
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
        borderBottom: bold ? "none" : `1px solid ${"#e5e7eb"}`,
        borderTop: bold ? `1px solid ${"#000"}` : "none",
        marginTop: bold ? "6px" : "0",
        paddingTop: bold ? "14px" : "12px",
      }}
    >
      <span className={`text-sm ${bold ? "font-semibold" : ""}`} style={{ color: "#000" }}>
        {label}
      </span>
      <span className="text-right">
        <span className={`block font-mono text-sm ${bold ? "font-semibold" : ""}`} style={{ color: "#000" }}>
          {round2(weight)} g&nbsp;&nbsp;/&nbsp;&nbsp;{round2(volume)} mL
        </span>
        <span className="block font-mono text-xs mt-0.5" style={{ color: "#000" }}>
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
  const [fragName, setFragName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [matched, setMatched] = useState(null); // resolved { id, name, tier } or null
  const debouncedName = useDebouncedValue(fragName, 200);

  const [tierKey, setTierKey] = useState("fresh");
  const [batchSize, setBatchSize] = useState(30);
  const [batchUnit, setBatchUnit] = useState("ml"); // ml | floz | g | oz
  const [concPct, setConcPct] = useState(20);
  const [densities, setDensities] = useState({
    fresh: 0.87, floral: 0.95, woody: 0.93, gourmand: 1.00, oriental: 1.02, ethanol: ETHANOL_DENSITY_DEFAULT,
  });

  const [oilType, setOilType] = useState("");
  const [pricePerGram, setPricePerGram] = useState("");
  const [notes, setNotes] = useState("");
  const [blendedBy, setBlendedBy] = useState("");
  const [blendDate, setBlendDate] = useState(todayISO());

  const [logStatus, setLogStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [logError, setLogError] = useState("");

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
    const price = Number(pricePerGram);
    const oilCost = price > 0 ? oilG * price : null;
    return { oilG, oilMl, ethG, ethMl, totalG, totalMl, oilCost, conc };
  }, [batchSize, batchUnit, concPct, densities, tierKey, pricePerGram]);

  async function handleLogBatch() {
    if (!fragName.trim()) return;
    setLogStatus("saving"); setLogError("");
    try {
      let fragrance = matched;
      if (!fragrance) {
        fragrance = await upsertFragrance(fragName, tierKey, "custom");
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
      });
      await adjustInventory(fragrance.id, -result.oilG);
      setLogStatus("saved");
    } catch (e) {
      setLogStatus("error");
      setLogError(e.message || "Could not save this batch.");
    }
  }

  const tier = TIERS[tierKey] || TIERS.fresh;

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8" style={{ backgroundColor: COLORS.paper, color: "#000" }}>
      {selectedPerfume && (
        <div className="mb-6 px-4 py-3 border flex items-center justify-between" style={{ borderColor: "#e5e7eb", backgroundColor: COLORS.card }}>
          <div>
            <span className="text-xs font-semibold" style={{ color: "#000" }}>From search</span>
            <div className="text-sm font-serif" style={{ color: COLORS.forestDeep }}>
              {selectedPerfume.name}{selectedPerfume.brand ? ` — ${selectedPerfume.brand}` : ""}
            </div>
          </div>
          <button type="button" onClick={onClearSelection} className="text-xs font-mono underline" style={{ color: "#000" }}>
            Clear
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border" style={{ backgroundColor: COLORS.card, borderColor: "#e5e7eb" }}>
          <h3 className="text-base font-serif font-semibold mb-5" style={{ color: COLORS.forestDeep }}>Bench sheet</h3>

          <Field label="Fragrance name">
            <div className="relative">
              <TextInput value={fragName} onChange={(e) => setFragName(e.target.value)} placeholder="e.g. Parfums de Marly Layton" />
              {suggestions.length > 0 && (
                <div className="border mt-1" style={{ borderColor: "#e5e7eb", backgroundColor: "#fff" }}>
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setFragName(s.name); setSuggestions([]); }}
                      className="w-full text-left px-3 py-2 text-sm font-mono hover:opacity-70"
                      style={{ color: "#000" }}
                    >
                      {s.name} <span style={{ color: "#000" }}>— {TIERS[s.tier].label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {matched && (
              <p className="text-xs mt-1" style={{ color: "#000" }}>
                Matched in database → {TIERS[matched.tier].label}
              </p>
            )}
            {!matched && fragName.trim() && (
              <p className="text-xs mt-1" style={{ color: "#000" }}>
                Not in database yet — logging a batch will add it as a custom entry.
              </p>
            )}
          </Field>

          <Field label="Family (auto-filled — override anytime)">
            <select
              value={tierKey}
              onChange={(e) => { setTierKey(e.target.value); setConcPct(TIERS[e.target.value].defaultConc); }}
              className="w-full px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
              style={{ borderColor: "#e5e7eb", color: "#000", backgroundColor: "#fff" }}
            >
              {Object.entries(TIERS).map(([key, t]) => (
                <option key={key} value={key}>{t.label} — {t.sub}</option>
              ))}
            </select>
          </Field>

          <Field label="Total batch size">
            <AmountWithUnit
              value={batchSize} onChange={setBatchSize} unit={batchUnit} onUnitChange={setBatchUnit}
              units={[{value:"ml",label:"mL"},{value:"floz",label:"fl oz"},{value:"g",label:"g"},{value:"oz",label:"oz"}]}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {[3, 5, 10, 20, 30, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBatchSize(amt)}
                  className="px-2 py-1 text-[11px] font-mono border rounded border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  {amt}mL
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {[3, 5, 10, 20, 30, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setBatchSize(amt); }}
                  className="px-2 py-1 text-[11px] font-mono border transition-opacity"
                  style={{ 
                    borderColor: Number(batchSize) === amt ? "#000" : "#e5e7eb", 
                    color: Number(batchSize) === amt ? "#fff" : "#000", 
                    backgroundColor: Number(batchSize) === amt ? "#000" : "#fff" 
                  }}
                >
                  {amt}mL
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Target concentration — ${concPct}%`} hint={tier.defaultConc + "% is this family's typical default."}>
            <div className="flex gap-2 mb-3">
              {[20, 25, 30].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConcPct(c)}
                  className="px-3 py-1 text-[11px] font-mono border rounded border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  {c}%
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              {[20, 25, 30].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConcPct(c)}
                  className="px-3 py-1 text-[11px] font-mono border transition-opacity"
                  style={{ 
                    borderColor: Number(concPct) === c ? "#000" : "#e5e7eb", 
                    color: Number(concPct) === c ? "#fff" : "#000", 
                    backgroundColor: Number(concPct) === c ? "#000" : "#fff" 
                  }}
                >
                  {c}%
                </button>
              ))}
            </div>
            <input
              type="range" min="10" max="40" step="1" value={concPct}
              onChange={(e) => setConcPct(e.target.value)}
              className="w-full" style={{ accentColor: COLORS.forest }}
            />
          </Field>

          <details className="mt-2 mb-5">
            <summary className="text-xs font-semibold cursor-pointer" style={{ color: COLORS.forestDeep }}>Adjust density assumptions</summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {Object.keys(TIERS).map((key) => (
                <div key={key}>
                  <label className="block text-[11px] mb-1" style={{ color: "#000" }}>{TIERS[key].label} (g/mL)</label>
                  <TextInput type="number" step="0.01" value={densities[key]}
                    onChange={(e) => setDensities({ ...densities, [key]: parseFloat(e.target.value) || 0 })} />
                </div>
              ))}
              <div>
                <label className="block text-[11px] mb-1" style={{ color: "#000" }}>Ethanol 96% (g/mL)</label>
                <TextInput type="number" step="0.01" value={densities.ethanol}
                  onChange={(e) => setDensities({ ...densities, ethanol: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </details>

          <div className="pt-1 border-t" style={{ borderColor: "#e5e7eb" }}>
            <h4 className="text-xs font-semibold mt-4 mb-3" style={{ color: COLORS.forestDeep }}>
              Personal log <span className="font-normal" style={{ color: "#000" }}>— synced to your Supabase project</span>
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] mb-1" style={{ color: "#000" }}>Oil type / supplier</label>
                <input list="oilTypeOptions" value={oilType} onChange={(e) => setOilType(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-sm border" style={{ borderColor: "#e5e7eb", backgroundColor: "#fff" }} />
                <datalist id="oilTypeOptions">
                  {OIL_TYPE_OPTIONS.map((o) => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-[11px] mb-1" style={{ color: "#000" }}>Price per gram</label>
                <TextInput type="number" step="0.01" min="0" value={pricePerGram} onChange={(e) => setPricePerGram(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <label className="block text-[11px] mb-1" style={{ color: "#000" }}>Notes</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 font-mono text-sm border resize-y"
              style={{ borderColor: "#e5e7eb", backgroundColor: "#fff" }}
            />
          </div>
        </div>

        <div className="p-6 border" style={{ backgroundColor: COLORS.card, borderColor: "#e5e7eb" }}>
          <h3 className="text-base font-serif font-semibold mb-5" style={{ color: COLORS.forestDeep }}>Batch readout</h3>

          <ReadoutRow label="Fragrance oil" weight={result.oilG} volume={result.oilMl} />
          <ReadoutRow label="Ethanol 96%" weight={result.ethG} volume={result.ethMl} />
          <ReadoutRow label="Total" weight={result.totalG} volume={result.totalMl} bold />

          {result.oilCost !== null && (
            <div className="flex items-center justify-between py-2 mt-2 text-sm font-mono">
              <span style={{ color: "#000" }}>Oil cost</span>
              <span style={{ color: "#000" }}>{round2(result.oilCost)} (at {round2(Number(pricePerGram))}/g)</span>
            </div>
          )}

          <p className="text-sm italic mt-4" style={{ color: "#000" }}>{tier.note}</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] mb-1" style={{ color: "#000" }}>Blended by</label>
              <TextInput value={blendedBy} onChange={(e) => setBlendedBy(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: "#000" }}>Date</label>
              <TextInput type="date" value={blendDate} onChange={(e) => setBlendDate(e.target.value)} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogBatch}
            disabled={!fragName.trim() || logStatus === "saving"}
            className="w-full mt-5 px-4 py-3 text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: COLORS.forest, color: "#fff" }}
          >
            {logStatus === "saving" ? "Saving…" : "Log this batch"}
          </button>
          {logStatus === "saved" && (
            <p className="text-xs mt-2" style={{ color: COLORS.forest }}>
              Saved — added to batch history{!matched ? " and to the fragrance database" : ""}, inventory adjusted.
            </p>
          )}
          {logStatus === "error" && (
            <p className="text-xs mt-2" style={{ color: "#8C4A3A" }}>Could not save: {logError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

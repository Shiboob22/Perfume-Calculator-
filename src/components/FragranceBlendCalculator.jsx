import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import RoomBeam from "./kx/RoomBeam";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "../motion";
import { UNIT_LABELS, prefillFromQuery, startingBottle, shareQuery } from "../lib/calcPrefill";
import { loadDraft, saveDraft, clearDraft, linkCarriesValues } from "../lib/calcDraft";
import { buildBatch } from "../lib/batchPayload";
import { enqueue, isOffline } from "../lib/outbox";
import { calculate, fmt2, gToOz, mlToFlOz, blendMix, blendLayers } from "../lib/calc";
import { RatioBar } from "./Bottle";
import { IconBookmark, IconBookmarkCheck, IconCheck, IconCopy, IconDiamondAlert, IconDrop, IconFlameTriangle } from "./icons";
import Stepper from "./kx/Stepper";
import ScaleDisplay from "./kx/ScaleDisplay";
import Flacon from "./kx/Flacon";
import { createBenchClock, useBenchFrame, useThemeName } from "./kx/benchClock";
import Chip from "./kx/Chip";
import RoomHeader from "./kx/RoomHeader";
import OrdersCard from "./orders/OrdersCard";

import MeasuredDensity from "./calc/MeasuredDensity";
import Presets from "./calc/Presets";
import StrengthTiers from "./calc/StrengthTiers";
import BlendEditor, { BlendBreakdown, newIngredient } from "./calc/BlendEditor";
import CostCard from "./calc/CostCard";
import { useFormulas, FormulaLibrary, FormulasButton, FormulaLink } from "./calc/Formulas";
import { useUpgrade } from "./plan/Upgrade";
import OilHistory from "./calc/OilHistory";
import WaitlistButton from "./WaitlistButton";
import Source from "./calc/Source";
import RestingLine from "./journal/RestingLine";
import { useBenchTour, TourLayer, TakeTour } from "./tour/BenchTour";
import { COUNT_UP_MS, countUp, tourStrength } from "../lib/tour";
import { reduced } from "../motion/env.js";
import { FromOil, Adjust, Run } from "./calc/Modes";
import { COLORS } from "../lib/theme";
import { TIERS, ETHANOL_DENSITY_DEFAULT } from "../lib/tiers";
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
import { useProfile } from "../lib/useProfile";
import { CURRENCIES } from "../lib/currencies";
import { can, limit, canAddIngredient } from "../lib/entitlements";
import { blendTips } from "../lib/aiApi";

function todayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const x = new Date(y, m - 1, d + n);
  return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
}

const MODES = ["bottle", "fromOil", "adjust", "run"];

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// `extra` sits after the label, not inside it: a button inside a <label>
// would become part of the control's accessible name.
function Field({ label, extra, hint, htmlFor, children }) {
  return (
    <div className="mb-5">
      <div className="mb-2">
        <label htmlFor={htmlFor} className="text-sm font-semibold" style={{ color: COLORS.ink }}>
          {label}
        </label>
        {extra}
      </div>
      {children}
      {hint ? (
        <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      inputMode={props.type === "number" ? "decimal" : undefined}
      {...props}
      className="w-full px-3 py-2 min-h-[48px] font-mono text-lg tabular-nums border focus:outline-none focus:ring-2"
      style={{ borderColor: COLORS.field, color: COLORS.ink, backgroundColor: COLORS.cardHi }}
    />
  );
}

// The batch size: the board's stepper (±5 for mL and g, ±1 for fl oz and oz;
// typing still works) with the unit picker under it.
function AmountWithUnit({ id, label, unitLabel, value, onChange, unit, onUnitChange, units, t }) {
  const step = unit === "ml" || unit === "g" ? 5 : 1;
  const name = UNIT_LABELS[unit] ?? unit;
  const bump = (dir) => {
    const n = Number(value);
    onChange(String(Math.max(1, Math.round(((Number.isFinite(n) ? n : 0) + dir * step) * 100) / 100)));
  };
  return (
    <Stepper label={label} hideLabel inputId={id} value={value} unit={name} onStep={bump} onType={onChange}
      decLabel={t("calc.stepper.batchLess", { step, unit: name })} incLabel={t("calc.stepper.batchMore", { step, unit: name })}
      after={(
        <select aria-label={unitLabel} value={unit} onChange={(e) => onUnitChange(e.target.value)}
          className="mt-2 px-3 min-h-[48px] text-base border" style={{ borderColor: COLORS.field, color: COLORS.ink, backgroundColor: COLORS.cardHi }}>
          {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      )} />
  );
}

// On a phone the full readout sits below every input. This strip keeps the
// three figures in view while the inputs scroll: pinned above the bottom bar,
// it stops at the end of the bench sheet. Wide screens show the readout beside
// the inputs, so it is hidden there. A display only, not a control (nothing
// to tap over the fields it passes), and hidden from screen readers, who have
// the full readout and its live region.
function QuickResult({ clock, shown, t }) {
  const f = useBenchFrame(clock, benchTarget(shown));
  return (
    <div aria-hidden="true"
      className="md:hidden sticky z-30 -mx-6 -mb-6 mt-6 flex px-4 py-2.5"
      style={{ bottom: "calc(60px + env(safe-area-inset-bottom))", background: COLORS.inkBand, color: COLORS.onInk }}>
      <ScaleDisplay variant="bar" decorative rows={[
        { key: "oil", label: t("calc.quick.oil"), grams: f.values[0] },
        { key: "ethanol", label: t("calc.quick.ethanol"), grams: f.values[1] },
        { key: "total", label: t("calc.total"), grams: f.values[0] + f.values[1] },
      ]} />
    </div>
  );
}

// What the bench clock rolls to: oil and ethanol grams, and the oil's share
// of the volume (how full of oil the flacon is).
function benchTarget(shown) {
  const ml = shown.oilMl + shown.ethanolMl;
  return [shown.oilG, shown.ethanolG, ml > 0 ? shown.oilMl / ml : 0];
}

// The bench readout's instrument: the flacon on its pan beside the scale's
// window, both drawn from the same frame. Decoration: the figures are in the
// readout rows below, which screen readers read.
function BenchInstrument({ clock, shown, label, pct, blend, t }) {
  const f = useBenchFrame(clock, benchTarget(shown));
  const theme = useThemeName();
  const [oil, eth, share] = f.values;
  return (
    <div className="flex items-end gap-5 flex-wrap mb-5" data-instrument data-tour="scale">
      <Flacon share={share} flow={f.flow} wobble={f.wobble} pct={pct} totalMl={shown.totalMl} theme={theme}
        layers={blend ? blendLayers(blend, share) : []} />
      <div className="flex-[1_1_190px] min-w-0">
        <ScaleDisplay decorative stable={f.settled} rows={[
          { key: "oil", label, grams: oil },
          { key: "ethanol", label: t("calc.ethanol96"), grams: eth },
        ]} />
      </div>
    </div>
  );
}

// weight / volume are the engine's displayed (already rounded) values.
function ReadoutRow({ label, weight, volume, bold }) {
  const oz = gToOz(weight);
  const flOz = mlToFlOz(volume);
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
      <span className="text-end whitespace-nowrap shrink-0 ms-3">
        <span className={`block font-mono text-sm ${bold ? "font-semibold" : ""}`} style={{ color: COLORS.ink }}>
          {fmt2(weight)} g&nbsp;&nbsp;/&nbsp;&nbsp;{fmt2(volume)} mL
        </span>
        <span className="block font-mono text-xs mt-0.5" style={{ color: COLORS.ink }}>
          {fmt2(oz)} oz&nbsp;&nbsp;/&nbsp;&nbsp;{fmt2(flOz)} fl oz
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
// "Start over" remounts the calculator without the link or the draft.
export default function FragranceBlendCalculator(props) {
  const navigate = useNavigate();
  const [run, setRun] = useState(0);
  function startOver() {
    clearDraft();
    navigate("/bench", { replace: true });
    setRun((n) => n + 1);
  }
  return <Calculator key={run} {...props} fresh={run > 0} onStartOver={startOver} />;
}

// Pour along inside the Bench, for the tour's fourth stop (BenchMode's demo).
const BenchModeDemo = lazy(() => import("./BenchMode"));

function Calculator({ selectedPerfume, onClearSelection, fresh, onStartOver }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const entitlements = useEntitlements();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefill] = useState(() => prefillFromQuery(fresh ? new URLSearchParams() : searchParams));
  // What this tab last had in the calculator, unless a link brought values.
  const [draft] = useState(() => (fresh || linkCarriesValues(prefill) ? null : loadDraft()));
  const [fragName, setFragName] = useState(draft?.fragName ?? prefill.name ?? "");
  // The draft already holds the restored oil's supplier, price and notes,
  // perhaps edited and unsaved: its first name match must not reload them.
  const restoring = useRef(draft?.fragName || null);
  // A family or strength set by a link, a preset or the user. A catalog
  // name match fills only what nobody chose; it never overwrites a choice.
  const chosen = useRef({ family: draft?.chosenFamily ?? prefill.family != null, conc: draft?.chosenConc ?? prefill.conc != null });
  const [suggestions, setSuggestions] = useState([]);
  const [listOpen, setListOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(-1);
  // The name just picked from the list: don't search for it again (it
  // matches itself, and the list would pop straight back open).
  const pickedName = useRef(null);
  const [matched, setMatched] = useState(null); // resolved { id, name, tier } or null
  const debouncedName = useDebouncedValue(fragName, 200);

  const profileState = useProfile();
  const { profile } = profileState;
  const [start] = useState(() => startingBottle(prefill, profile));
  const [tierKey, setTierKey] = useState(TIERS[draft?.tierKey] ? draft.tierKey : prefill.family ?? "fresh");
  const [batchSize, setBatchSize] = useState(draft?.batchSize ?? start.size);
  const [batchUnit, setBatchUnit] = useState(UNIT_LABELS[draft?.batchUnit] ? draft.batchUnit : start.unit); // ml | floz | g | oz
  const [concPct, setConcPct] = useState(draft?.concPct ?? prefill.conc ?? (prefill.family ? TIERS[prefill.family].defaultConc : 20));
  // The recipe version a logged batch will be linked to (null: none, or the settings were changed).
  const [recipeVersionId, setRecipeVersionId] = useState(null);
  const [densities, setDensities] = useState(() => ({
    ...Object.fromEntries(Object.entries(TIERS).map(([k, t]) => [k, t.density])),
    ethanol: ETHANOL_DENSITY_DEFAULT,
    ...draft?.densities,
  }));

  // This user's measured density for the matched oil, if any: it replaces
  // the family's reference density (the handbook: a measured density wins).
  const [measuredDensityValue, setMeasuredDensity] = useState(draft?.measuredDensity ?? null);
  const [mode, setMode] = useState(MODES.includes(draft?.mode) ? draft.mode : "bottle"); // bottle | fromOil | adjust | run
  // Simple (one oil) or a blend of several materials (Bench SaaS). A blend's
  // density and price come from its ingredients (lib/calc/mixture).
  const [formulaType, setFormulaType] = useState(draft?.formulaType === "blend" && Array.isArray(draft?.blend) && draft.blend.length ? "blend" : "simple");
  const [blend, setBlend] = useState(() => (Array.isArray(draft?.blend) && draft.blend.length ? draft.blend : null));
  const blendOn = formulaType === "blend" && Array.isArray(blend) && blend.length > 0;
  const mix = useMemo(() => (blendOn ? blendMix(blend) : null), [blendOn, blend]);
  const { open: openUpgrade, close: closeUpgrade, state: upgradeState } = useUpgrade();
  const [ethanolPricePerL, setEthanolPricePerL] = useState(draft?.ethanolPricePerL ?? "");
  const [bottleCost, setBottleCost] = useState(draft?.bottleCost ?? "");
  const [bottles, setBottles] = useState(draft?.bottles ?? "1");
  const [packagingCost, setPackagingCost] = useState(draft?.packagingCost ?? "");
  const [labourMinutes, setLabourMinutes] = useState(draft?.labourMinutes ?? "");
  const [labourRate, setLabourRate] = useState(draft?.labourRate ?? "");
  const [salePrice, setSalePrice] = useState(draft?.salePrice ?? "");
  const [currency, setCurrency] = useState(CURRENCIES.includes(draft?.currency) ? draft.currency : CURRENCIES.includes(profile?.currency) ? profile.currency : "USD");
  // Cost, packaging, labour and sale price are Pro. A draft from before a
  // downgrade keeps its values but they are neither shown, costed nor sent.
  const sellerOn = can(entitlements, "calculator.advanced");
  const [oilType, setOilType] = useState(draft?.oilType ?? "");
  const [pricePerGram, setPricePerGram] = useState(draft?.pricePerGram ?? "");
  const [notes, setNotes] = useState(draft?.notes ?? "");
  // What was really poured on the scale — often off the target by a little.
  const [actualOilG, setActualOilG] = useState(draft?.actualOilG ?? "");
  const [actualEthG, setActualEthG] = useState(draft?.actualEthG ?? "");
  const [blendedBy, setBlendedBy] = useState(draft?.blendedBy ?? "");
  const [blendDate, setBlendDate] = useState(draft?.blendDate && draft.blendDate <= todayISO() ? draft.blendDate : todayISO());
  const [customDate, setCustomDate] = useState(false);

  useEffect(() => {
    saveDraft({
      fragName, tierKey, batchSize, batchUnit, concPct, mode, ethanolPricePerL, bottleCost, bottles,
      packagingCost, labourMinutes, labourRate, salePrice, currency,
      oilType, pricePerGram, notes, actualOilG, actualEthG, blendedBy, blendDate, densities,
      measuredDensity: measuredDensityValue ?? undefined,
      chosenFamily: chosen.current.family, chosenConc: chosen.current.conc,
      formulaType, blend: blend ?? undefined,
    });
  }, [fragName, tierKey, batchSize, batchUnit, concPct, mode, ethanolPricePerL, bottleCost, bottles,
    packagingCost, labourMinutes, labourRate, salePrice, currency,
    oilType, pricePerGram, notes, actualOilG, actualEthG, blendedBy, blendDate, densities, measuredDensityValue, formulaType, blend]);

  const [logStatus, setLogStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
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
  // The new batch's number (0031), for "Logged as No. 042".
  const [loggedNo, setLoggedNo] = useState(null);
  const [capHit, setCapHit] = useState(false);
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
      if (!debouncedName.trim() || debouncedName === pickedName.current) { setSuggestions([]); return; }
      try {
        const results = await searchFragrances(debouncedName, 6);
        if (!cancelled) setSuggestions(results);
      } catch (e) { if (!cancelled) setSuggestions([]); }
    }
    run();
    return () => { cancelled = true; };
  }, [debouncedName]);

  function pickSuggestion(s) {
    pickedName.current = s.name;
    setFragName(s.name);
    setSuggestions([]);
    setListOpen(false);
    setActiveOption(-1);
  }

  async function resolveAndLoad(name) {
    try {
      const found = await getFragranceByExactName(name);
      setMatched(found);
      const restored = restoring.current === name;
      restoring.current = null;
      if (restored) return;
      if (found) {
        // Defensive: only trust found.tier if it's actually a valid tier
        // key. Guards against a malformed row (bad manual DB edit, future
        // schema drift) crashing the calculator instead of degrading.
        const validTier = TIERS[found.tier] ? found.tier : "fresh";
        if (!chosen.current.family) {
          setTierKey(validTier);
          if (!chosen.current.conc) setConcPct(TIERS[validTier].defaultConc);
        }
        const noteRow = await getFragranceNotes(found.id);
        setOilType(noteRow?.oil_type || "");
        setPricePerGram(noteRow?.price_per_gram ?? "");
        setNotes(noteRow?.notes || "");
        setMeasuredDensity(noteRow?.measured_density != null ? Number(noteRow.measured_density) : null);
      } else {
        setOilType(""); setPricePerGram(""); setNotes(""); setMeasuredDensity(null);
      }
    } catch (e) { /* offline or query failed — leave fields as-is */ }
  }

  useEffect(() => {
    if (debouncedName.trim()) resolveAndLoad(debouncedName);
    else setMatched(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName]);

  // In a blend the concentrate's density and price per gram are the blend's;
  // a measured density belongs to a single oil, so it is not used there.
  const oilDensity = mix?.density ?? measuredDensityValue ?? densities[tierKey];
  const priceUsed = mix ? (mix.avgPrice > 0 ? Math.round(mix.avgPrice * 10000) / 10000 : "") : pricePerGram;
  const result = useMemo(() => calculate({
    amount: batchSize,
    unit: batchUnit,
    concPct,
    oilDensity,
    ethanolDensity: densities.ethanol || ETHANOL_DENSITY_DEFAULT,
    actualOilG,
    actualEthanolG: actualEthG,
    pricePerGram: priceUsed,
    ...(sellerOn ? { ethanolPricePerL, bottleCost, bottles, packagingCost, labourMinutes, labourRate, salePrice } : {}),
  }), [batchSize, batchUnit, concPct, densities, oilDensity, priceUsed, actualOilG, actualEthG, sellerOn,
    ethanolPricePerL, bottleCost, bottles, packagingCost, labourMinutes, labourRate, salePrice]);
  // One animation clock for the readout's scale, the flacon and the phone's pinned bar.
  const [clock] = useState(createBenchClock);
  useEffect(() => clock.retarget(benchTarget(result.shown)), [clock, result.shown]);
  useEffect(() => () => clock.stop(), [clock]);
  // What bench mode pours: the batch on this sheet (also the tour's demo).
  const benchPlan = () => ({
    name: fragName.trim(),
    fragranceId: matched?.id || null,
    tier: tierKey,
    amount: Number(batchSize),
    unit: batchUnit,
    concPct: Number(concPct),
    densities: result.densities,
    // A blend pours one material at a time (bench pour along); the
    // density above is already the blend's.
    blend: blendOn ? blend.map(({ name, type, pct }) => ({ name, type, pct })) : null,
    // The rest of the record, so a bench log is as full as one from here.
    oilType, pricePerGram, blendedBy,
    // A new start, even of the same blend, starts a new bench run.
    startedAt: Date.now(),
  });

  // The guided tour (Phase 7): six stops. Each sets the page up here; at the
  // end everything it changed is put back from the snapshot. It never
  // changes the plan: the cost stop is a preview drawn in the browser.
  const [tourPour, setTourPour] = useState(null); // the demo run while the tour shows Pour along
  const [costPreview, setCostPreview] = useState(false);
  const [costK, setCostK] = useState(null); // the preview's count-up, 0 → 1; null = final
  const countRaf = useRef(0);
  const [toJournal, setToJournal] = useState(false);
  const clearTourBits = () => { cancelAnimationFrame(countRaf.current); setTourPour(null); setCostPreview(false); setCostK(null); };
  const tour = useBenchTour({
    profile: profileState,
    capture: () => ({ concPct, mode, formulaType, blend, measured: measuredDensityValue, chosenConc: chosen.current.conc, upgrade: upgradeState }),
    show: (key, snap) => {
      clearTourBits();
      closeUpgrade();
      setMode("bottle");
      if (key === "sheet") { setFormulaType("simple"); setConcPct(tourStrength(snap.concPct)); }
      else if (key === "blend" || key === "scale") switchType("blend");
      else if (key === "pour") setTourPour(benchPlan());
      else if (key === "cost" && !sellerOn) {
        setCostPreview(true);
        if (!reduced()) {
          const t0 = performance.now();
          const tick = (now) => {
            const p = (now - t0) / COUNT_UP_MS;
            setCostK(p < 1 ? countUp(p) : null);
            if (p < 1) countRaf.current = requestAnimationFrame(tick);
          };
          setCostK(0);
          countRaf.current = requestAnimationFrame(tick);
        }
      } else if (key === "upgrade") openUpgrade(null);
    },
    restore: (snap) => {
      clearTourBits();
      setConcPct(snap.concPct); setMode(snap.mode); setFormulaType(snap.formulaType); setBlend(snap.blend); setMeasuredDensity(snap.measured);
      chosen.current.conc = snap.chosenConc;
      if (snap.upgrade?.open) openUpgrade(snap.upgrade.reason); else closeUpgrade();
    },
  });
  useEffect(() => () => cancelAnimationFrame(countRaf.current), []);
  // First visit (per user, or per browser signed out), or ?tour=1: start by itself.
  const tourAsked = useRef(searchParams.get("tour") === "1");
  const tourTried = useRef(false);
  useEffect(() => {
    if (!tour.ready || tourTried.current || !(tourAsked.current || !tour.seen)) return undefined;
    const id = setTimeout(() => {
      tourTried.current = true;
      if (tourAsked.current) setSearchParams((q) => { q.delete("tour"); return q; }, { replace: true });
      tour.start();
    }, 700);
    return () => clearTimeout(id);
  }, [tour.ready, tour.seen]); // eslint-disable-line react-hooks/exhaustive-deps
  // "Open the Journal" on the last stop: leave once the page is put back (and its draft saved).
  useEffect(() => { if (toJournal && !tour.tour) navigate("/journal"); }, [toJournal, tour.tour, navigate]);

  const money = (v, digits = 2) => `${v.toFixed(digits)} ${currency}`;
  const seller = sellerOn ? { ethanolPricePerL, bottleCost, bottles, packagingCost, labourMinutes, labourRate, salePrice, currency } : undefined;

  // "Use these settings" from an earlier batch of this oil: a user choice,
  // so a later name match won't change it.
  function applySettings(st) {
    chosen.current.family = chosen.current.family || st.family != null;
    chosen.current.conc = chosen.current.conc || st.conc != null;
    if (st.family) setTierKey(st.family);
    if (st.conc != null) setConcPct(st.conc);
    if (st.size != null) setBatchSize(st.size);
    if (st.unit) setBatchUnit(st.unit);
  }

  // Opening a saved formula version: its name, size, unit, strength, family,
  // densities and, for a blend, its ingredients.
  const applyRecipe = useCallback((st) => {
    chosen.current.family = true;
    chosen.current.conc = true;
    const family = st.family && TIERS[st.family] ? st.family : tierKey;
    if (family !== tierKey) setTierKey(family);
    if (st.name) { pickedName.current = st.name; setFragName(st.name); }
    setConcPct(st.conc);
    setBatchSize(st.size);
    setBatchUnit(st.unit);
    if (st.ingredients?.length) {
      setBlend(st.ingredients);
      setFormulaType("blend");
    } else {
      setFormulaType("simple");
      // A blend's stored density is the blend's: only a simple formula's goes on the family.
      if (st.oilDensity != null) setDensities((d) => ({ ...d, [family]: st.oilDensity }));
    }
    if (st.ethanolDensity != null) setDensities((d) => ({ ...d, ethanol: st.ethanolDensity }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tierKey is read once, as the fallback family
  }, [tierKey]);

  const formulas = useFormulas({
    current: { amount: batchSize, unit: batchUnit, concPct, oilDensity: result.densities.oil, ethanolDensity: result.densities.ethanol },
    blend: blendOn ? blend : null,
    entitlements, initialVersionId: prefill.recipe, onApply: applyRecipe, onLocked: openUpgrade, t,
  });
  useEffect(() => { setRecipeVersionId(formulas.linked ? formulas.activeVersion.id : null); }, [formulas.linked, formulas.activeVersion]);

  // Blend materials allowed on this plan (Free 3); the database refuses more on save.
  const ingredientCap = limit(entitlements, "ingredients");
  const canAddMaterial = canAddIngredient(entitlements, blend?.length ?? 0);
  function switchType(next) {
    if (next === "blend" && !(blend?.length)) {
      // A new blend starts with the oil on the sheet as its one material.
      setBlend([newIngredient({ name: fragName.trim(), pct: "100", price: pricePerGram === "" ? "" : String(pricePerGram) })]);
    }
    setFormulaType(next);
  }

  // One id per batch the user means to log, kept across retries: if a
  // send reached the server but the answer was lost, the retry is
  // recognised as the same batch instead of logging it twice.
  const logId = useRef(null);

  async function handleLogBatch() {
    if (!fragName.trim()) return;
    setLogStatus("saving"); setLogError(""); setLogNote(""); setCapHit(false);
    logId.current ??= crypto.randomUUID();
    const row = (fragranceId) => buildBatch({
      id: logId.current, fragranceId, name: fragName.trim(), tier: tierKey, blendDate, concPct,
      target: result, densities: result.densities, actualOilG, actualEthG,
      oilType, pricePerGram: priceUsed, oilCost: result.oilCost, notes, blendedBy, amount: batchSize, unit: batchUnit, seller, recipeVersionId,
    });
    try {
      let fragrance = matched;
      if (!fragrance) {
        fragrance = await ensureFragrance(fragName, tierKey);
        setMatched(fragrance);
      }
      await saveFragranceNotes(fragrance.id, { oilType, pricePerGram: pricePerGram || null, notes, measuredDensity: measuredDensityValue });
      const tracksStock = can(entitlements, "inventory");
      const saved = await logBatch({ ...row(fragrance.id), ...(tracksStock ? { deduct_oil_g: result.usedOilG } : {}) });
      logId.current = null;
      // The batch is saved from here on: nothing below may report it as unsaved,
      // or a retry would log it twice.
      if (tracksStock && !saved.duplicate) await stockOutcome(saved.stock, fragrance.id, result.usedOilG);
      // Actual pours belong to this batch only — clear them so the next
      // log doesn't silently reuse them.
      setActualOilG(""); setActualEthG("");
      setLoggedNo(Number(saved.batch_no) > 0 ? Number(saved.batch_no) : null);
      setLogStatus("saved");
      entitlements.refresh();
    } catch (e) {
      if (isOffline(e)) {
        // No connection: the batch waits in this browser and is sent when
        // the connection returns (with this id, so never twice).
        enqueue({ ...row(matched?.id ?? null), ...(can(entitlements, "inventory") ? { deduct_oil_g: result.usedOilG } : {}) });
        logId.current = null;
        setActualOilG(""); setActualEthG("");
        setLogStatus("queued");
        return;
      }
      setLogStatus("error");
      setCapHit(e.code === "batch_cap");
      setLogError(e.code === "batch_cap"
        ? t("plan.batchCap", { plan: t(`plan.names.${entitlements.plan}`), cap: e.detail?.cap ?? entitlements.batchCap })
        : errorText(t, e, "calc.saveFailedGeneric"));
    }
  }

  // The server takes the oil out of stock as it logs the batch and says
  // how that went. A server without that step (or with its kill switch on,
  // "client") leaves it to the old path below. Never throws.
  async function stockOutcome(stock, fragranceId, grams) {
    if (stock === "deducted" || stock === "locked") return;
    if (stock === "not_tracked") return setLogNote(t("calculator.log.untracked"));
    if (stock === "failed") return setLogNote(t("calculator.log.stockFailed", { error: t("errors.server_error") }));
    await deductStock(fragranceId, grams);
  }

  // Take the oil used by a just-saved batch out of inventory. Never throws:
  // the batch is already saved, so every outcome here ends in a note at most.
  async function deductStock(fragranceId, grams) {
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
  }, [fragName, tierKey, concPct, result.exact.totalMl]);

  async function handleAdvise() {
    setTipsLoading(true); setTipsError("");
    try {
      setTips(await blendTips({
        name: fragName.trim(),
        tier: tierKey,
        concentration_pct: Number(concPct),
        total_ml: result.exact.totalMl,
      }));
    } catch (e) {
      setTipsError(errorText(t, e, "chat.unreachable"));
    } finally {
      setTipsLoading(false);
    }
  }

  const tier = TIERS[tierKey] || TIERS.fresh;

  // Any change to the batch puts Save (and Copy) back to idle: a "Saved"
  // must only ever describe the numbers on screen.
  useEffect(() => {
    setLogStatus((s) => (s === "saving" ? s : null));
    setCopied(false);
    setLinkCopied(false);
  }, [fragName, batchSize, batchUnit, concPct, tierKey, densities, measuredDensityValue, blend, formulaType]);

  const copyRecipe = async () => {
    const text = t("calc.recipeText", {
      name: fragName.trim() || "—", size: `${batchSize} ${UNIT_LABELS[batchUnit] ?? batchUnit}`, pct: Number(concPct),
      oil: fmt2(result.shown.oilG), ethanol: fmt2(result.shown.ethanolG), total: fmt2(result.shown.totalG),
    });
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
  };

  // A link that reopens this exact bottle: same form the guides and shared
  // recipes use, so the Bench reads it back through prefillFromQuery.
  const copyShareLink = async () => {
    const q = shareQuery({ name: fragName, family: tierKey, size: batchSize, unit: batchUnit, conc: concPct });
    const url = `${window.location.origin}/bench${q ? `?${q}` : ""}`;
    try { await navigator.clipboard.writeText(url); setLinkCopied(true); } catch { setLinkCopied(false); }
  };

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto p-6 sm:p-8" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <RoomBeam at={0} />
      <RoomHeader numeral="I" name={t("site.compounding.rooms.bench.name")} title={t("calc.heading")}>
        <TakeTour onStart={tour.start} t={t} />
      </RoomHeader>
      <RestingLine />
      <OrdersCard />
      <div className="xl:grid xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-10 xl:items-start">
      {/* Saved formulas: in the rail on wide screens, a bottom sheet below that. */}
      <aside className="hidden xl:block xl:sticky xl:top-6">
        <FormulaLibrary f={formulas} entitlements={entitlements} t={t} />
      </aside>
      <div className="min-w-0">
      <div className="xl:hidden"><FormulasButton f={formulas} entitlements={entitlements} t={t} /></div>
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

      {/* Toggle buttons: a real tablist would need arrow keys and tabpanels. */}
      <div role="group" aria-label={t("calc.modes.label")} className="flex flex-wrap gap-2 mb-6">
        {MODES.map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className="px-3 py-1.5 text-sm border rounded min-h-[32px]"
            style={{ borderColor: mode === m ? COLORS.actionText : COLORS.field, color: mode === m ? COLORS.actionText : COLORS.inkSoft }}>
            {t(`calc.modes.tabs.${m}`)}
          </button>
        ))}
        <button type="button" onClick={onStartOver} className="ms-auto px-3 py-1.5 text-sm underline min-h-[32px]" style={{ color: COLORS.inkSoft }}>
          {t("calculator.draft.startOver")}
        </button>
      </div>

      {mode !== "bottle" ? (
        <div className="p-6 border max-w-xl" style={{ backgroundColor: COLORS.card, borderColor: COLORS.line }}>
          <Field label={t("calc.family")} htmlFor="calc-family-mode">
            <select id="calc-family-mode" value={tierKey} onChange={(e) => { chosen.current.family = true; setTierKey(e.target.value); }}
              className="w-full px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.field, color: COLORS.ink, backgroundColor: COLORS.cardHi }}>
              {Object.keys(TIERS).map((key) => (
                <option key={key} value={key}>{t(`families.${key}.label`)}</option>
              ))}
            </select>
          </Field>
          <p className="text-[11px] font-mono mb-5" style={{ color: COLORS.inkSoft }}>
            {t(measuredDensityValue != null ? "calc.densitiesUsedMeasured" : "calc.densitiesUsed", { oil: result.densities.oil, ethanol: result.densities.ethanol })}
          </p>
          {mode === "fromOil" && <FromOil densities={result.densities} defaultPct={concPct} />}
          {mode === "adjust" && <Adjust densities={result.densities} defaultPct={concPct} defaultBasis={result.basis} />}
          {mode === "run" && <Run densities={result.densities} defaultPct={concPct} defaultBasis={result.basis} />}
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] gap-8 items-start">
        <div data-tour="sheet" className="kx-grain p-6 border" style={{ backgroundColor: COLORS.card, borderColor: COLORS.line }}>
          <h2 className="text-base font-serif font-semibold mb-3" style={{ color: COLORS.forestDeep }}>{t("calc.benchSheet")}</h2>
          <div role="group" aria-label={t("calc.blend.mode")} className="inline-flex mb-5 rounded" style={{ border: `1px solid ${COLORS.ink}` }}>
            {["simple", "blend"].map((k) => (
              <button key={k} type="button" aria-pressed={(k === "blend") === blendOn} onClick={() => switchType(k)}
                className="min-h-[44px] px-4 text-sm"
                style={{ background: (k === "blend") === blendOn ? COLORS.ink : "transparent", color: (k === "blend") === blendOn ? COLORS.paper : COLORS.ink }}>
                {t(`calc.blend.${k}`)}
              </button>
            ))}
          </div>

          <Field label={t("calc.name")} htmlFor="calc-name">
            <div className="relative">
              {/* ARIA 1.2 combobox: focus stays in the input; arrows move
                  through the list, Enter picks, Escape closes. */}
              <TextInput id="calc-name" value={fragName} placeholder={t("calc.namePlaceholder")} autoComplete="off"
                role="combobox" aria-autocomplete="list" aria-controls="calc-name-list"
                aria-expanded={listOpen && suggestions.length > 0}
                aria-activedescendant={listOpen && activeOption >= 0 ? `calc-name-opt-${activeOption}` : undefined}
                onChange={(e) => { pickedName.current = null; setFragName(e.target.value); setListOpen(true); setActiveOption(-1); }}
                onBlur={() => setListOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    if (!suggestions.length) return;
                    e.preventDefault();
                    setListOpen(true);
                    const step = e.key === "ArrowDown" ? 1 : -1;
                    setActiveOption((i) => (i + step + suggestions.length) % suggestions.length);
                  } else if (e.key === "Enter" && listOpen && activeOption >= 0) {
                    e.preventDefault();
                    pickSuggestion(suggestions[activeOption]);
                  } else if (e.key === "Escape" && listOpen) {
                    e.preventDefault();
                    setListOpen(false);
                  }
                }} />
              <ul id="calc-name-list" role="listbox" aria-label={t("calc.name")} hidden={!(listOpen && suggestions.length > 0)}
                className="border mt-1" style={{ borderColor: COLORS.line, backgroundColor: COLORS.cardHi, color: COLORS.ink }}>
                {suggestions.map((s, i) => (
                  <li
                    key={s.id}
                    id={`calc-name-opt-${i}`}
                    role="option"
                    aria-selected={i === activeOption}
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                    className="w-full text-start px-3 py-2 text-sm font-mono cursor-pointer"
                    style={{ color: COLORS.ink, backgroundColor: i === activeOption ? COLORS.card : undefined, outline: i === activeOption ? `2px solid ${COLORS.focus}` : undefined, outlineOffset: -2 }}
                  >
                    {s.name} <span style={{ color: COLORS.inkSoft }}>— {t(`families.${s.tier}.label`)}</span>
                  </li>
                ))}
              </ul>
              <p role="status" className="sr-only">
                {listOpen && suggestions.length > 0 ? t("calc.suggestions", { count: suggestions.length }) : ""}
              </p>
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
            <OilHistory fragranceId={matched?.id ?? null} name={debouncedName} onUse={applySettings} />
          </Field>

          <Field label={t("calc.family")} htmlFor="calc-family">
            <select
              id="calc-family"
              value={tierKey}
              onChange={(e) => { chosen.current.family = true; setTierKey(e.target.value); setConcPct(TIERS[e.target.value].defaultConc); }}
              className="w-full px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.field, color: COLORS.ink, backgroundColor: COLORS.cardHi }}
            >
              {Object.keys(TIERS).map((key) => (
                <option key={key} value={key}>{t(`families.${key}.label`)} — {t(`families.${key}.sub`)}</option>
              ))}
            </select>
          </Field>

          {blendOn && (
            <div data-tour="blend">
              <BlendEditor rows={blend} onChange={(rows) => setBlend(rows.length ? rows : [newIngredient()])} concentrateG={result.shown.oilG}
                canAdd={canAddMaterial} cap={ingredientCap} onLocked={() => openUpgrade("blend")} currency={currency} t={t} />
            </div>
          )}

          <Presets
            current={{ amount: batchSize, unit: batchUnit, concPct }}
            onApply={({ amount, unit, concPct: c }) => { chosen.current.conc = true; setBatchSize(amount); setBatchUnit(unit); setConcPct(c); }}
          />

          <Field label={t("calc.batchSize")} htmlFor="calc-size">
            <AmountWithUnit
              id="calc-size" label={t("calc.batchSize")} unitLabel={t("calc.unit")} t={t}
              value={batchSize} onChange={setBatchSize} unit={batchUnit} onUnitChange={setBatchUnit}
              units={[{value:"ml",label:"mL"},{value:"floz",label:"fl oz"},{value:"g",label:"g"},{value:"oz",label:"oz"}]}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {[3, 5, 10, 20, 30, 50, 100, 125, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  aria-pressed={Number(batchSize) === amt}
                  onClick={() => { setBatchSize(amt); }}
                  className="px-3 min-h-[44px] text-sm font-mono tabular-nums border"
                  style={{ 
                    borderColor: Number(batchSize) === amt ? COLORS.actionText : COLORS.line,
                    color: Number(batchSize) === amt ? COLORS.onAmber : COLORS.ink,
                    backgroundColor: Number(batchSize) === amt ? COLORS.amber : COLORS.cardHi
                  }}
                >
                  {amt} {UNIT_LABELS[batchUnit]}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t("calc.concentration", { pct: concPct })} extra={<Source id="strengths" />} hint={t("calc.familyDefault", { pct: tier.defaultConc })}>
            <div className="mb-3">
              <StrengthTiers pct={concPct} label={t("calc.tiers.label")} t={t} onPick={(c) => { chosen.current.conc = true; setConcPct(c); }} />
            </div>
            <Stepper label={t("calc.concentration", { pct: concPct })} hideLabel value={concPct} unit="%"
              decLabel={t("calc.stepper.concLess")} incLabel={t("calc.stepper.concMore")}
              decDisabled={Number(concPct) <= 1} incDisabled={Number(concPct) >= 99}
              onStep={(dir) => { chosen.current.conc = true; setConcPct(String(Math.min(99, Math.max(1, Math.round((Number(concPct) + dir) * 100) / 100)))); }} />
          </Field>

          <p data-density-line className="mt-2 mb-2 text-sm" style={{ color: COLORS.ink }}>
            {blendOn && mix?.density
              ? t("calc.blend.density", { d: fmt2(mix.density) })
              : t(measuredDensityValue != null ? "calc.densityLineMeasured" : "calc.densityLineFamily", { d: fmt2(oilDensity) })}
          </p>
          <details className="mb-5">
            <summary className="text-xs font-semibold cursor-pointer" style={{ color: COLORS.forestDeep }}>{t("calc.densities")}</summary>
            <div className="grid grid-cols-2 gap-3 items-end mt-3">
              {Object.keys(TIERS).map((key) => (
                <div key={key}>
                  <label htmlFor={`calc-density-${key}`} className="flex items-center gap-1.5 text-[13px] mb-1" style={{ color: COLORS.ink }}><IconDrop size={18} />{t(`families.${key}.label`)} (g/mL)</label>
                  <TextInput id={`calc-density-${key}`} type="number" step="0.01" value={densities[key]}
                    onChange={(e) => setDensities({ ...densities, [key]: parseFloat(e.target.value) || 0 })} />
                </div>
              ))}
              <div>
                <label htmlFor="calc-density-ethanol" className="flex items-center gap-1.5 text-[13px] mb-1" style={{ color: COLORS.ink }}><IconDrop mist size={18} />{t("calc.ethanol96")} (g/mL)</label>
                <TextInput id="calc-density-ethanol" type="number" step="0.01" value={densities.ethanol}
                  onChange={(e) => setDensities({ ...densities, ethanol: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            {/* Measuring a density is for a single oil; a blend's comes from its ingredients. */}
            {!blendOn && <MeasuredDensity value={measuredDensityValue} onChange={setMeasuredDensity} referenceDensity={densities[tierKey]} />}
          </details>

          <div className="pt-1 border-t" style={{ borderColor: COLORS.line }}>
            <h3 className="text-xs font-semibold mt-4 mb-3" style={{ color: COLORS.forestDeep }}>
              {t("calc.personalLog")} <span className="font-normal" style={{ color: COLORS.ink }}>— {t("calc.savedToAccount")}</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 items-end mb-3">
              <div>
                <label htmlFor="calc-oil-type" className="block text-[13px] mb-1" style={{ color: COLORS.ink }}>{t("calc.oilType")}</label>
                <input id="calc-oil-type" list="oilTypeOptions" value={oilType} onChange={(e) => setOilType(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-sm border" style={{ borderColor: COLORS.field, backgroundColor: COLORS.cardHi, color: COLORS.ink }} />
                <datalist id="oilTypeOptions">
                  {oilTypeOptions.map((o) => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div>
                <label htmlFor="calc-price" className="block text-[13px] mb-1" style={{ color: COLORS.ink }}>{t("calc.pricePerGram")}</label>
                <TextInput id="calc-price" type="number" step="0.01" min="0" value={blendOn ? fmt2(Number(priceUsed) || 0) : pricePerGram} readOnly={blendOn}
                  onChange={(e) => setPricePerGram(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            {sellerOn && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end mb-3">
                <div className="col-span-2 sm:col-span-3">
                  <label htmlFor="calc-currency" className="block text-[13px] mb-1" style={{ color: COLORS.ink }}>{t("calc.cost.currency")}</label>
                  <select id="calc-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}
                    className="w-full sm:w-40 px-3 py-2 font-mono text-sm border min-h-[44px]" style={{ borderColor: COLORS.field, backgroundColor: COLORS.cardHi, color: COLORS.ink }}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {[
                  ["calc-eth-price", "ethanolPerL", ethanolPricePerL, setEthanolPricePerL, "0.01"],
                  ["calc-bottle-cost", "bottleEach", bottleCost, setBottleCost, "0.01"],
                  ["calc-bottles", "bottles", bottles, setBottles, "1"],
                  ["calc-packaging", "packagingEach", packagingCost, setPackagingCost, "0.01"],
                  ["calc-labour-min", "labourMinutes", labourMinutes, setLabourMinutes, "1"],
                  ["calc-labour-rate", "labourPerHour", labourRate, setLabourRate, "0.01"],
                  ["calc-sale-price", "salePrice", salePrice, setSalePrice, "0.01"],
                ].map(([id, key, value, set, step]) => (
                  <div key={id}>
                    <label htmlFor={id} className="block text-[13px] mb-1" style={{ color: COLORS.ink }}>{t(`calc.cost.${key}`)}</label>
                    <TextInput id={id} type="number" inputMode="decimal" step={step} min="0" value={value} onChange={(e) => set(e.target.value)} placeholder={key === "bottles" ? "1" : "0.00"} />
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 items-end mb-1">
              <div>
                <label htmlFor="calc-actual-oil" className="block text-[13px] mb-1" style={{ color: COLORS.ink }}>{t("calc.actualOil")}</label>
                <TextInput id="calc-actual-oil" type="number" step="0.01" min="0" value={actualOilG} onChange={(e) => setActualOilG(e.target.value)} placeholder={fmt2(result.shown.oilG)} />
              </div>
              <div>
                <label htmlFor="calc-actual-ethanol" className="block text-[13px] mb-1" style={{ color: COLORS.ink }}>{t("calc.actualEthanol")}</label>
                <TextInput id="calc-actual-ethanol" type="number" step="0.01" min="0" value={actualEthG} onChange={(e) => setActualEthG(e.target.value)} placeholder={fmt2(result.shown.ethanolG)} />
              </div>
            </div>
            <p className="text-xs mb-3 font-mono" style={{ color: COLORS.ink }}>
              {result.actual
                ? t(result.basis === "volume" ? "calc.actualRatioVolume" : "calc.actualRatioWeight", { oil: fmt2(result.actual.actualPct), ethanol: fmt2(100 - result.actual.actualPct), target: Number(concPct) })
                : t("calc.actualHint")}
              {result.actual?.fix.material && Math.abs(result.actual.deviation) >= 0.005 && (
                <span className="block mt-1" style={{ color: COLORS.actionText }}>
                  {t(result.actual.fix.material === "oil" ? "calc.fixAddOil" : "calc.fixAddEthanol", { grams: fmt2(result.actual.fix.grams), target: Number(concPct) })}
                </span>
              )}
            </p>
            <label htmlFor="calc-notes" className="block text-[13px] mb-1" style={{ color: COLORS.ink }}>{t("calc.notes")}</label>
            <textarea
              id="calc-notes"
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 font-mono text-base border resize-y"
              style={{ borderColor: COLORS.field, backgroundColor: COLORS.cardHi, color: COLORS.ink }}
            />
          </div>
          <QuickResult clock={clock} shown={result.shown} t={t} />
        </div>

        <div id="calc-readout" className="kx-grain p-6 border scroll-mt-4 lg:sticky lg:top-6" style={{ backgroundColor: COLORS.card, borderColor: COLORS.ink }}>
          <h2 className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal mb-5" style={{ color: COLORS.dim }}>{t("calc.readout")}</h2>
          <p className="mb-1 text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t("calc.total")}</p>
          <p dir="ltr" className="font-serif font-light leading-none tracking-[-0.02em] tabular-nums mb-5" style={{ fontSize: "clamp(3.5rem, 9vw, 5rem)" }}>
            {fmt2(result.shown.totalG)}<span className="text-2xl ms-2" style={{ color: COLORS.dim }}>g</span>
          </p>
          <BenchInstrument clock={clock} shown={result.shown} pct={concPct} blend={blendOn ? blend : null} t={t}
            label={t(blendOn ? "calc.blend.concentrate" : "calc.oil")} />
          <RatioBar oilG={result.shown.oilG} ethanolG={result.shown.ethanolG} caption={t("calc.byWeight")} className="mb-4" />

          <p className="text-xs font-mono mb-2" style={{ color: COLORS.inkSoft }}>
            {t(result.basis === "volume" ? "calc.basisVolume" : "calc.basisWeight", { pct: Number(concPct) })}
            {" · "}
            {t(result.basis === "volume" ? "calc.otherBasisWeight" : "calc.otherBasisVolume", { pct: fmt2(result.otherBasisPct) })}
          </p>
          <ReadoutRow label={<>{t(blendOn ? "calc.blend.concentrate" : "calc.oil")}<Source id="oil" /></>} weight={result.shown.oilG} volume={result.shown.oilMl} />
          <ReadoutRow label={<>{t("calc.ethanol96")}<Source id="ethanol" /></>} weight={result.shown.ethanolG} volume={result.shown.ethanolMl} />
          <ReadoutRow label={<>{t("calc.total")}<Source id="total" /></>} weight={result.shown.totalG} volume={result.shown.totalMl} bold />
          {blendOn && <BlendBreakdown rows={blend} concentrateG={result.shown.oilG} t={t} />}
          {/* Always mounted, so screen readers announce warnings as they appear. */}
          <ul role="status" className={result.warnings.length ? "mt-3 space-y-1" : ""}>
            {result.warnings.map((w) => (
              <li key={w.code} className="text-xs" style={{ color: COLORS.danger }}>{t(`calc.warnings.${w.code}`, w)}</li>
            ))}
          </ul>
          <p className="text-[11px] font-mono mt-2" style={{ color: COLORS.inkSoft }}>
            {t(measuredDensityValue != null ? "calc.densitiesUsedMeasured" : "calc.densitiesUsed", { oil: result.densities.oil, ethanol: result.densities.ethanol })}
            <Source id="densities" />
          </p>
          <p className="text-[11px] mt-1" style={{ color: COLORS.dim }}>{t("calc.onAccuracy")}</p>

          {result.oilCost !== null && (
            <div className="flex items-center justify-between py-2 mt-2 text-sm font-mono">
              <span style={{ color: COLORS.ink }}>{t("calc.oilCost")}</span>
              <span style={{ color: COLORS.ink }}>{t("calc.oilCostValue", { cost: fmt2(result.oilCost), price: fmt2(Number(priceUsed)) })}</span>
            </div>
          )}

          {sellerOn && result.cost.total > 0 && (
            <div className="py-2 text-sm font-mono space-y-0.5" style={{ color: COLORS.ink }}>
              <div>{t("calc.cost.total", { cost: money(result.cost.total) })}</div>
              {result.cost.perBottle != null && <div>{t("calc.cost.perBottle", { cost: money(result.cost.perBottle) })}</div>}
              {result.cost.perMl != null && <div>{t("calc.cost.perMl", { cost: money(result.cost.perMl, 3) })}</div>}
              {result.cost.bottles === 0 && <div className="font-sans text-[11px]" style={{ color: COLORS.dim }}>{t("calc.cost.needBottles")}</div>}
              {result.cost.profit != null && (
                <>
                  <div>{t("calc.cost.revenue", { cost: money(result.cost.revenue) })}</div>
                  <div>{t(result.cost.profit < 0 ? "calc.cost.loss" : "calc.cost.profit", { cost: money(Math.abs(result.cost.profit)) })}</div>
                  <div>{t("calc.cost.margin", { pct: fmt2(result.cost.marginPct) })}</div>
                  {result.cost.markupPct != null && <div>{t("calc.cost.markup", { pct: fmt2(result.cost.markupPct) })}</div>}
                </>
              )}
            </div>
          )}

          <p className="text-sm italic mt-4" style={{ color: COLORS.ink }}>{t(`families.${tierKey}.note`)}<Source id="rest" /></p>

          {can(entitlements, "ai.ask") && <button
            type="button"
            onClick={handleAdvise}
            disabled={!fragName.trim() || tipsLoading}
            className="mt-4 px-4 py-2 text-sm border rounded disabled:opacity-50"
            style={{ borderColor: COLORS.amberDeep, color: COLORS.actionText }}
          >
            {tipsLoading ? t("calc.asking") : t("calc.advise")}
          </button>}
          {tips && (
            <div className="mt-3 p-3 text-sm whitespace-pre-wrap border rounded" style={{ borderColor: COLORS.line, backgroundColor: COLORS.cardHi, color: COLORS.ink }}>
              {tips}
              <div className="text-[10px] font-mono mt-2" style={{ color: COLORS.dim }}>{t("calc.aiCaveat")}</div>
            </div>
          )}
          {tipsError && <p className="text-xs mt-2" style={{ color: COLORS.danger }}>{tipsError}</p>}

          <div className="mt-6 grid grid-cols-2 gap-3 items-end">
            <div>
              <label htmlFor="calc-blended-by" className="block text-[13px] mb-1" style={{ color: COLORS.ink }}>{t("calc.blendedBy")}</label>
              <TextInput id="calc-blended-by" value={blendedBy} onChange={(e) => setBlendedBy(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label htmlFor="calc-date" className="block text-[13px] mb-1" style={{ color: COLORS.ink }}>{t("calc.date")}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <Chip onToggle={() => { setBlendDate(todayISO()); setCustomDate(false); }} pressed={!customDate && blendDate === todayISO()}>{t("calc.dateToday")}</Chip>
                <Chip onToggle={() => { setBlendDate(addDays(todayISO(), -1)); setCustomDate(false); }} pressed={!customDate && blendDate === addDays(todayISO(), -1)}>{t("calc.dateYesterday")}</Chip>
                <Chip onToggle={() => setCustomDate(true)} pressed={customDate || (blendDate !== todayISO() && blendDate !== addDays(todayISO(), -1))}>{t("calc.dateCustom")}</Chip>
              </div>
              {(customDate || (blendDate !== todayISO() && blendDate !== addDays(todayISO(), -1))) && (
                <TextInput id="calc-date" type="date" max={todayISO()} value={blendDate}
                  onChange={(e) => setBlendDate(e.target.value && e.target.value <= todayISO() ? e.target.value : todayISO())} />
              )}
              {blendDate < todayISO() && <p className="text-xs mt-1" style={{ color: COLORS.dim }}>{t("calc.datePast", { date: blendDate })}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/app/bench", { state: { plan: benchPlan() } })}
            disabled={!(Number(batchSize) > 0 && Number(concPct) > 0 && Number(concPct) < 100)}
            className="w-full mt-5 px-4 py-3 text-sm font-semibold border disabled:opacity-50"
            style={{ borderColor: COLORS.actionText, color: COLORS.actionText }}
          >
            {t("bench.start")}
          </button>
          {can(entitlements, "export.labels") && (
            <button type="button" onClick={() => navigate("/app/cards")} className="block mx-auto mt-2 text-xs underline" style={{ color: COLORS.inkSoft }}>
              {t("cards.open")}
            </button>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            {logStatus === "saved" ? (
              <button type="button" onClick={() => navigate("/journal")}
                className="inline-flex items-center justify-center gap-2 px-4 min-h-[52px] text-sm font-medium"
                style={{ backgroundColor: COLORS.mist, color: COLORS.forest, border: `1px solid ${COLORS.forest}` }}>
                <IconBookmarkCheck size={18} /> {t("calc.savedOpen")}
              </button>
            ) : logStatus === "error" ? (
              <button type="button" onClick={handleLogBatch}
                className="inline-flex items-center justify-center gap-2 px-4 min-h-[52px] text-sm font-medium"
                style={{ backgroundColor: COLORS.dangerBg, color: COLORS.danger, border: `1px solid ${COLORS.dangerLine}` }}>
                <IconDiamondAlert size={18} /> {t("calc.retry")}
              </button>
            ) : (
              <button type="button" onClick={handleLogBatch} disabled={!fragName.trim() || logStatus === "saving" || !(Number(batchSize) > 0 && Number(concPct) > 0 && Number(concPct) < 100)}
                className="inline-flex items-center justify-center gap-2 px-4 min-h-[52px] text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: COLORS.amber, color: COLORS.onAmber }}>
                <IconBookmark size={18} /> {logStatus === "saving" ? t("calc.saving") : t("calc.log")}
              </button>
            )}
            <button type="button" onClick={() => formulas.save({ name: fragName, family: tierKey })} disabled={formulas.busy}
              className="inline-flex items-center justify-center gap-2 px-3 min-h-[52px] text-sm font-medium disabled:opacity-50" style={{ border: `1px solid ${COLORS.ink}`, color: COLORS.ink }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4Z" /></svg>
              {formulas.busy ? t("calc.saving") : t("calc.formulas.save")}
            </button>
          </div>
          <FormulaLink f={formulas} onPickVersion={formulas.load} t={t} />
          <p role="status" className="text-xs mt-2 empty:hidden" style={{ color: formulas.status.kind === "error" ? COLORS.danger : COLORS.forest }}>{formulas.status.text}</p>
          <button type="button" onClick={copyRecipe}
            className="mt-2 inline-flex items-center gap-2 px-1 min-h-[44px] text-sm underline underline-offset-4" style={{ color: COLORS.actionText }}>
            {copied ? <IconCheck size={18} /> : <IconCopy size={18} />} <span>{t(copied ? "calc.copied" : "calc.copy")}</span>
          </button>
          {/* Outside the button: a status child would drop out of the button's accessible name. */}
          <span role="status" className="sr-only">{copied ? t("calc.copied") : ""}</span>
          <button type="button" onClick={copyShareLink} disabled={!(Number(batchSize) > 0 && Number(concPct) > 0 && Number(concPct) < 100)}
            className="mt-2 inline-flex items-center gap-2 px-1 min-h-[44px] text-sm underline underline-offset-4 disabled:opacity-50" style={{ color: COLORS.actionText }}>
            {linkCopied ? <IconCheck size={18} /> : <IconCopy size={18} />} <span>{t(linkCopied ? "calc.shareCopied" : "calc.shareLink")}</span>
          </button>
          <span role="status" className="sr-only">{linkCopied ? t("calc.shareCopied") : ""}</span>
          {/* One live region, always mounted: "saved" and "could not save"
              are announced, so nobody logs the same batch twice. */}
          <div role="status">
            {logStatus === "saved" && (
              <p className="text-xs mt-2" style={{ color: COLORS.forest }}>
                {loggedNo != null ? t("calc.loggedNo", { no: String(loggedNo).padStart(3, "0") }) : t(matched ? "calc.saved" : "calc.savedNew")}
              </p>
            )}
            {logStatus === "saved" && logNote && (
              <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{logNote}</p>
            )}
            {logStatus === "queued" && (
              <p className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{t("calc.queued")}</p>
            )}
            {logStatus === "error" && (
              <p className="text-xs mt-2" style={{ color: COLORS.danger }}>{t("calc.saveFailed", { error: logError })}</p>
            )}
            {logStatus === "error" && capHit && <WaitlistButton source="batch_cap" />}
          </div>
          <aside role="note" className="mt-6 p-4 flex gap-3 text-sm" style={{ background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerLine}`, color: COLORS.ink }}>
            <IconFlameTriangle size={24} /> {t("site.footer.safety")}
          </aside>
        </div>
      </div>
      )}
      {mode === "bottle" && (
        <div data-tour="cost">
        <CostCard unlocked={sellerOn} preview={costPreview} countK={costK} onUnlock={() => openUpgrade("cost")} t={t} currency={currency}
          oilG={result.shown.oilG} ethMl={result.shown.ethanolMl} totMl={result.shown.totalMl}
          oilPrice={blendOn ? Number(priceUsed) || 0 : pricePerGram} onOilPrice={setPricePerGram} oilReadOnly={blendOn}
          ethPrice={ethanolPricePerL} onEthPrice={setEthanolPricePerL} pack={packagingCost} onPack={setPackagingCost} />
        </div>
      )}
      {tourPour && (
        <div className="fixed inset-0 overflow-y-auto px-3 pt-6 pb-80 md:p-6" style={{ zIndex: 70, background: "rgba(16,14,11,.3)" }}>
          <div data-tour="pour" className="max-w-2xl mx-auto lg:ms-[max(1.5rem,calc(50%-34rem))]">
            <Suspense fallback={null}><BenchModeDemo demo={{ plan: tourPour, onExit: tour.end }} /></Suspense>
          </div>
        </div>
      )}
      {tour.tour && <TourLayer i={tour.tour.i} t={t} rtl={locale === "ar"} onGo={tour.go} onEnd={tour.end}
        onJournal={() => { tour.end(); setToJournal(true); }} />}
      </div>
      </div>
    </div>
  );
}

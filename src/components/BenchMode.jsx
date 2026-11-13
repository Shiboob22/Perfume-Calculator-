import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "../motion";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { useWakeLock } from "../lib/useWakeLock";
import { solveBottle, checkPour, labelWeights, fmt2, round2, pourItems, pourSteps, pourState, pourSummary, pourRecord, POUR_BAND } from "../lib/calc";
import { pourProgress } from "../lib/pourProgress.js";
import { UNIT_LABELS } from "../lib/calcPrefill";
import { logBatch } from "../lib/fragranceApi";
import { buildBatch, usedOil } from "../lib/batchPayload";
import { useEntitlements } from "../lib/useEntitlements";
import { can } from "../lib/entitlements";
import { enqueue, isOffline } from "../lib/outbox";
import ScaleDisplay from "./kx/ScaleDisplay";

// The handbook's Bench Workflow, one step per screen, big numbers, for a
// phone next to the scale. The batch comes from the Calculator (router
// state, kept in sessionStorage so a reload or losing signal doesn't lose it).
//
// Pour along (Bench SaaS Phase 4): the steps come from the formula
// (lib/calc/pourAlong.ts): prepare, tare, one pour per material of a blend
// (one oil step for a simple formula), ethanol, mix, QC, then log. Each pour
// is tared first, so the handbook's "tare again" lives in every pour after
// the first. A pour moves on once it is within POUR_BAND of its target; an
// over-pour scales the rest of the blend and the ethanol, never takes out.

// The handbook rules shown with each step; "pour" = the first pour, "pourNext"
// = every later pour and the ethanol (tared first: rule 1).
const RULES_AT = { prepare: [4], tare: [1], pour: [2, 3, 5], pourNext: [1, 2, 3, 5] };
// A practice bottle for the practice scale's tare step.
const PRACTICE_BOTTLE_G = 38.42;
const SESSION_KEY = "sh-bench";
// Where this bench run is (step, pours, checks, lot), so a reload or a
// locked phone doesn't send the user back to step 1. Tied to the run.
const PROGRESS_KEY = "sh-bench-progress";

function loadProgress(plan) {
  try {
    const p = JSON.parse(sessionStorage.getItem(PROGRESS_KEY));
    return p && p.run === runOf(plan) ? p : null;
  } catch { return null; }
}
const runOf = (plan) => JSON.stringify(plan);

function loadPlan(state) {
  if (state?.plan) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.plan)); } catch {}
    return state.plan;
  }
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Big({ label, grams }) {
  return (
    <div className="my-6 text-center">
      <p className="text-base" style={{ color: COLORS.amberDeep }}>{label}</p>
      <p dir="ltr" className="font-mono font-semibold leading-none mt-2" style={{ fontSize: "clamp(56px, 18vw, 96px)", color: COLORS.forestDeep }}>
        {grams}<span className="text-2xl ms-2" style={{ color: COLORS.inkSoft }}>g</span>
      </p>
    </div>
  );
}

function Rules({ at }) {
  const { t, locale } = useI18n();
  const guide = `${locale === "ar" ? "/ar" : ""}/library/at-the-bench`;
  const rules = RULES_AT[at] || [];
  if (!rules.length) return null;
  return (
    <ul className="mt-6 space-y-2">
      {rules.map((n) => (
        <li key={n} className="p-3 rounded text-sm" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink }}>
          <span className="font-semibold me-2" style={{ color: COLORS.amberDeep }}>{t("bench.rule", { n })}</span>
          {t(`bench.rules.${n}`)}{" "}
          {/* A new tab: leaving would end the bench run on this screen. */}
          <a href={`${guide}#rule-${n}`} target="_blank" rel="noopener noreferrer" className="underline text-xs" style={{ color: COLORS.actionText }}>
            {t("bench.readRule")}<span className="sr-only"> {t("bench.newTab")}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// What is on the scale against what the step asks for, on the bench's scale
// display, with practice controls that pour into the same reading: hold to
// pour (it slows near the target), +1 g, +0.1 g, reset. The reading is the
// "what the scale shows" field below, so typing the real scale's figure and
// practising are one value. "On target" is POUR_BAND (1 %) of the target.
function Scale({ label, value, target, onChange, overText }) {
  const { t } = useI18n();
  const timer = useRef(null);
  const reading = useRef(0);
  reading.current = Number(value) > 0 ? Number(value) : 0;
  const set = (g) => { reading.current = Math.max(0, round2(g)); onChange(String(reading.current)); };
  const stop = () => { clearInterval(timer.current); timer.current = null; };
  useEffect(() => stop, []);
  const step = (n) => {
    const tg = Number(target) > 0 ? Number(target) : 10;
    const left = tg - reading.current;
    const rate = left > tg * 0.15 ? tg * 0.018 : Math.max(0.02, tg * 0.004);
    return rate * (n < 4 ? 0.5 : 1);
  };
  const start = (e) => {
    e.preventDefault();
    stop();
    let n = 0;
    timer.current = setInterval(() => { n += 1; set(reading.current + step(n)); }, 60);
  };
  const btn = { minHeight: 56, borderColor: COLORS.onInk, color: COLORS.onInk };
  return (
    <div className="mt-4">
      <ScaleDisplay label={label} grams={reading.current} target={target} tolerance={POUR_BAND}
        labels={{ under: t("bench.scale.under"), ok: t("bench.scale.ok"), over: t("bench.scale.over") }}
        states={{ under: t("bench.pour.under"), ok: t("bench.pour.ok"), over: overText }}>
        <div role="group" aria-label={t("bench.pour.sim")} className="flex flex-wrap gap-2">
          <span className="w-full text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ opacity: 0.8 }} aria-hidden="true">{t("bench.pour.sim")}</span>
          <button type="button" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); set(reading.current + step(4)); } }}
            className="flex-[1_1_180px] px-5 rounded text-base font-medium select-none" style={{ minHeight: 56, background: COLORS.amber, color: COLORS.onAmber, touchAction: "none" }}>
            {t("bench.pour.hold")}
          </button>
          <button type="button" dir="ltr" onClick={() => set(reading.current + 1)} className="px-4 rounded border text-sm" style={btn}>{t("bench.pour.coarse")}</button>
          <button type="button" dir="ltr" onClick={() => set(reading.current + 0.1)} className="px-4 rounded border text-sm" style={btn}>{t("bench.pour.fine")}</button>
          <button type="button" onClick={() => { stop(); onChange(""); }} className="px-4 rounded text-sm underline underline-offset-4" style={{ minHeight: 56, color: COLORS.onInk }}>{t("bench.pour.reset")}</button>
        </div>
      </ScaleDisplay>
    </div>
  );
}

// The steps as tabs, numbered: the count follows the formula. On a phone only
// the current step shows its name, in a wider column; long names are cut
// with an ellipsis.
function StepTabs({ steps, at, name, t }) {
  return (
    <ol aria-label={t("bench.tabs.label")} className="grid gap-1 px-4 sm:gap-2" style={{ gridTemplateColumns: steps.map((_, n) => (n === at ? "minmax(0, 3fr)" : "minmax(0, 1fr)")).join(" "), borderBottom: `1px solid ${COLORS.line}` }}>
      {steps.map((s, n) => {
        const label = name(s);
        const here = n === at;
        return (
          <li key={n} title={label} aria-current={here ? "step" : undefined} className="flex gap-1.5 items-baseline min-w-0 py-3 text-[13px] -mb-px"
            style={{ borderBottom: `2px solid ${here ? COLORS.amber : "transparent"}`, color: n <= at ? COLORS.ink : COLORS.dim, fontWeight: here ? 600 : 400 }}>
            <span dir="ltr" className="tabular-nums flex-none">{String(n + 1).padStart(2, "0")}</span>
            <span className={`min-w-0 truncate ${here ? "" : "sr-only sm:not-sr-only"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Grams({ id, label, value, onChange }) {
  return (
    <div className="mt-4">
      <label htmlFor={id} className="block text-sm mb-2" style={{ color: COLORS.ink }}>{label}</label>
      <input id={id} type="number" inputMode="decimal" step="0.01" min="0" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-4 font-mono text-3xl text-center border rounded focus:outline-none focus:ring-2"
        style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }} />
    </div>
  );
}

// The tare step's place in pourSteps(): where the Bench tour opens a demo.
const TARE_STEP = 1;

// `demo` (the Bench tour): { plan, onExit } shows this run inside the Bench
// page, opened on its tare step, as a preview: nothing is kept in
// sessionStorage (a real run in progress is untouched), the screen is not
// held awake, nothing can be logged and the title is an h2 (the page has
// its h1).
export default function BenchMode({ demo = null }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [plan] = useState(() => (demo ? demo.plan : loadPlan(location.state)));
  const [saved] = useState(() => (plan && !demo ? loadProgress(plan) : null));
  const [i, setI] = useState(saved?.i ?? (demo ? TARE_STEP : 0));
  // A new step replaces the whole screen: move focus to its title so screen
  // readers read the new instruction (not on the first render).
  const titleRef = useRef(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) { firstStep.current = false; return; }
    titleRef.current?.focus();
  }, [i]);
  const [cautionRead, setCautionRead] = useState(saved?.cautionRead ?? false);
  // What the scale showed for each material (one entry for a simple formula).
  const [poured, setPoured] = useState(() => (Array.isArray(saved?.poured) ? saved.poured : saved?.oilG ? [saved.oilG] : []));
  const [alcoholG, setAlcoholG] = useState(saved?.alcoholG ?? "");
  const [practiceTare, setPracticeTare] = useState(saved?.practiceTare ?? String(PRACTICE_BOTTLE_G));
  const [lot, setLot] = useState(saved?.lot ?? "");
  const [qc, setQc] = useState(() => new Set(saved?.qc ?? []));
  const [timer, setTimer] = useState(null); // seconds left, or null
  // A run that was logged stays logged after a reload: no second log.
  const [status, setStatus] = useState(saved?.status === "saved" || saved?.status === "queued" ? saved.status : null); // null | saving | saved | queued | error
  const [batchNo, setBatchNo] = useState(saved?.batchNo ?? null);
  const [ordersLinked, setOrdersLinked] = useState(null);
  const [error, setError] = useState("");
  const [stockNote, setStockNote] = useState("");
  const entitlements = useEntitlements();
  // One id per run, kept across retries, so a retry can't log it twice.
  const logId = useRef(saved?.logId ?? null);

  useEffect(() => {
    if (!plan || demo) return;
    try {
      sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({
        run: runOf(plan), i, cautionRead, poured, alcoholG, practiceTare, lot, qc: [...qc], status, batchNo, logId: logId.current,
      }));
    } catch { /* full or blocked: progress just isn't kept */ }
  }, [plan, demo, i, cautionRead, poured, alcoholG, practiceTare, lot, qc, status, batchNo]);

  function startAnother() {
    try { sessionStorage.removeItem(PROGRESS_KEY); } catch {}
    logId.current = null;
    setI(0); setCautionRead(false); setPoured([]); setAlcoholG(""); setPracticeTare(String(PRACTICE_BOTTLE_G)); setLot(""); setQc(new Set());
    setStatus(null); setBatchNo(null); setError(""); setStockNote("");
  }
  const { supported, held } = useWakeLock(!demo);

  useEffect(() => {
    if (timer === null || timer <= 0) return undefined;
    const id = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const target = useMemo(() => (plan ? solveBottle(plan.amount, plan.unit, plan.concPct, plan.densities) : null), [plan]);
  const items = useMemo(() => (target ? pourItems(target.exact.oilG, plan.blend) : []), [target, plan]);
  const steps = useMemo(() => pourSteps(items), [items]);
  const isBlend = items.length > 0 && items[0].name !== null;
  const ps = target ? pourState(items, poured, plan.concPct, target.basis, plan.densities, target.exact.ethanolG) : null;

  if (!plan || !target) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <p style={{ color: COLORS.inkSoft }}>{t("bench.noPlan")}</p>
        <button type="button" onClick={() => navigate("/bench")} className="mt-4 underline" style={{ color: COLORS.actionText }}>{t("app.tabs.calculator")}</button>
      </div>
    );
  }

  const at = Math.min(i, steps.length - 1);
  const step = steps[at];
  const pct = plan.concPct;
  const nameOf = (n) => items[n]?.name || t("bench.pour.unnamed", { n: n + 1 });
  const tabName = (s) => (s.key === "pour" ? (isBlend ? nameOf(s.index) : t("bench.tabs.oil")) : t(`bench.tabs.${s.key}`));
  const concentrateG = ps.concentrateG;
  const actualOil = concentrateG > 0 ? round2(concentrateG) : null;
  const eth = Number(alcoholG) > 0 ? Number(alcoholG) : null;
  const pour = actualOil && eth ? checkPour(actualOil, eth, pct, target.basis, plan.densities) : null;
  const reached = (value, goal) => Number(value) > 0 && pourProgress(Number(value), goal, POUR_BAND).state !== "under";
  const setPour = (n) => (v) => setPoured((p) => { const x = p.slice(); x[n] = v; return x; });

  const canNext = (step.key === "prepare" && cautionRead)
    || (step.key === "pour" && reached(poured[step.index], ps.targets[step.index]))
    || (step.key === "ethanol" && reached(alcoholG, ps.ethanolTarget))
    || ["tare", "mix", "qc"].includes(step.key);
  const last = at === steps.length - 1;

  async function handleLog() {
    if (demo) return;
    setStatus("saving");
    setError("");
    logId.current ??= crypto.randomUUID();
    const tracksStock = can(entitlements, "inventory") && plan.fragranceId;
    const batch = {
      ...buildBatch({
        id: logId.current, fragranceId: plan.fragranceId, name: plan.name || t("bench.untitled"), tier: plan.tier,
        blendDate: today(), concPct: pct, target, densities: plan.densities,
        actualOilG: actualOil, actualEthG: alcoholG,
        oilType: plan.oilType, pricePerGram: plan.pricePerGram, blendedBy: plan.blendedBy,
        lot, amount: plan.amount, unit: plan.unit,
        pours: pourRecord(items, poured, ps.targets),
        orderIds: plan.orderIds,
      }),
      // The server takes the oil out of stock for a Pro user's tracked oil.
      ...(tracksStock ? { deduct_oil_g: usedOil(target, actualOil) } : {}),
    };
    try {
      const logged = await logBatch(batch);
      setStatus("saved");
      if (logged?.batch_no) setBatchNo(logged.batch_no);
      if (plan.orderIds?.length) setOrdersLinked(Number(logged.ordersLinked) || 0);
      if (logged.stock === "not_tracked") setStockNote(t("calculator.log.untracked"));
      if (logged.stock === "failed") setStockNote(t("calculator.log.stockFailed", { error: t("errors.server_error") }));
    } catch (e) {
      if (isOffline(e)) {
        enqueue(batch);
        setStatus("queued");
      } else {
        setStatus("error");
        setError(errorText(t, e, "calc.saveFailedGeneric"));
      }
    }
  }

  const labelled = labelWeights(target.exact.oilG, target.exact.ethanolG, actualOil, eth);
  const summary = pourSummary(concentrateG, alcoholG, target.basis, plan.densities);
  const unit = UNIT_LABELS[plan.unit];
  const title = step.key === "pour"
    ? (isBlend ? t("bench.pour.title", { name: nameOf(step.index) }) : t("bench.oil.title"))
    : step.key === "ethanol" ? t("bench.alcohol.title") : step.key === "done" ? t("bench.label.title") : t(`bench.${step.key}.title`);
  const Title = demo ? "h2" : "h1";
  const rulesAt = step.key === "pour" ? (step.index === 0 ? "pour" : "pourNext") : step.key === "ethanol" ? "pourNext" : step.key;

  return (
    <div data-bench-demo={demo ? "" : undefined} className={`${demo ? "" : "min-h-screen "}flex flex-col`} style={{ background: COLORS.paper, color: COLORS.ink, ...(demo ? { border: `1px solid ${COLORS.ink}`, borderRadius: 2 } : {}) }}>
      <header className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm" style={{ color: COLORS.amberDeep }}>
            {t("bench.step", { n: at + 1, total: steps.length })}
          </p>
          <p className="text-sm truncate" style={{ color: COLORS.inkSoft }}>
            {t("bench.batch", { name: plan.name || t("bench.untitled"), size: plan.amount, unit, pct })}
          </p>
        </div>
        <button type="button" onClick={() => (demo ? demo.onExit?.() : navigate("/bench"))} className="text-xs underline" style={{ color: COLORS.inkSoft }}>
          {t("bench.exit")}
        </button>
      </header>
      <StepTabs steps={steps} at={at} name={tabName} t={t} />

      <main className="flex-1 w-full max-w-xl mx-auto px-5 py-6">
        <Title ref={titleRef} tabIndex={-1} className="font-serif italic text-4xl break-words" style={{ color: COLORS.forestDeep }}>{title}</Title>

        {step.key === "prepare" && (
          <>
            <h2 className="mt-6 font-serif italic text-xl" style={{ color: COLORS.amberDeep }}>{t("bench.prepare.equipment")}</h2>
            <ul className="mt-2 space-y-1 ps-5 list-disc">{(t.raw("bench.prepare.equipmentList") || []).map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="mt-4">{t("bench.prepare.area")}</p>
            <div role="alert" className="mt-5 p-4 rounded" style={{ border: `1px solid ${COLORS.danger}`, background: COLORS.dangerBg }}>
              <p className="font-semibold" style={{ color: COLORS.danger }}>{t("bench.prepare.caution")}</p>
              <p className="mt-1">{t("bench.prepare.cautionText")}</p>
              <label className="mt-3 flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={cautionRead} onChange={(e) => setCautionRead(e.target.checked)} className="mt-1 w-5 h-5" />
                <span>{t("bench.prepare.confirm")}</span>
              </label>
            </div>
          </>
        )}

        {step.key === "tare" && (
          <>
            <p className="mt-6 text-lg leading-relaxed">{t("bench.tare.text")}</p>
            <div className="mt-4">
              <ScaleDisplay label={t("bench.pour.sim")} grams={Number(practiceTare) || 0}>
                <button type="button" onClick={() => setPracticeTare("0")} className="px-5 rounded border text-sm"
                  style={{ minHeight: 48, borderColor: COLORS.onInk, color: COLORS.onInk }}>{t("bench.pour.tare")}</button>
              </ScaleDisplay>
            </div>
          </>
        )}

        {step.key === "pour" && (
          <>
            <Big label={isBlend ? t("bench.pour.target") : t("bench.oil.target")} grams={fmt2(ps.targets[step.index])} />
            {ps.scales[step.index] > 1.0005 && (
              <p role="note" className="mb-3 px-3 py-2.5 text-[13px]" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card, color: COLORS.verdigrisText ?? COLORS.verdigris }}>
                {t("bench.pour.scaled", { x: ps.scales[step.index].toFixed(3) })}
              </p>
            )}
            {step.index > 0 && <p className="leading-relaxed mb-2">{t("bench.pour.tareFirst")}</p>}
            <p className="leading-relaxed">{t("bench.oil.text")}</p>
            <Scale label={isBlend ? t("bench.pour.material", { name: nameOf(step.index) }) : t("bench.scale.oil")}
              value={poured[step.index] ?? ""} target={ps.targets[step.index]} onChange={setPour(step.index)}
              overText={t(isBlend && step.index < items.length - 1 ? "bench.pour.overBlend" : "bench.pour.over")} />
            <Grams id={`bench-pour-${step.index}`} label={t("bench.oil.actual")} value={poured[step.index] ?? ""} onChange={setPour(step.index)} />
            {!canNext && (
              <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft }}>
                {Number(poured[step.index]) > 0 ? t("bench.pour.needTarget") : t("bench.oil.needActual")}
              </p>
            )}
          </>
        )}

        {step.key === "ethanol" && (
          <>
            <Big label={t("bench.alcohol.target")} grams={fmt2(ps.ethanolTarget)} />
            {ps.ethanolAdjusted && (
              <p role="note" className="mb-3 px-3 py-2.5 text-[13px]" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card, color: COLORS.verdigrisText ?? COLORS.verdigris }}>
                {isBlend ? t("bench.pour.adjustedBlend", { g: fmt2(concentrateG), pct }) : t("bench.alcohol.adjusted", { oil: fmt2(concentrateG), pct })}
              </p>
            )}
            <p className="leading-relaxed mb-2">{t("bench.pour.tareFirst")}</p>
            <p className="leading-relaxed">{t("bench.alcohol.text")}</p>
            <Scale label={t("bench.scale.alcohol")} value={alcoholG} target={ps.ethanolTarget} onChange={setAlcoholG} overText={t("bench.scale.over")} />
            <Grams id="bench-alcohol" label={t("bench.alcohol.actual")} value={alcoholG} onChange={setAlcoholG} />
            <div role="status">
            {pour && (
              <p className="mt-3 text-sm">
                {t("bench.alcohol.made", { pct: fmt2(pour.actualPct), basis: t(`calc.modes.by.${pour.basis}`).toLowerCase() })}
                {pour.fix.material && Math.abs(pour.deviation) >= 0.005 && (
                  <span className="block mt-1" style={{ color: COLORS.actionText }}>
                    {t("bench.alcohol.fix", { target: pct, grams: fmt2(pour.fix.grams), material: t(`bench.alcohol.material.${pour.fix.material}`) })}
                  </span>
                )}
              </p>
            )}
            </div>
            {!canNext && Number(alcoholG) > 0 && <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft }}>{t("bench.pour.needTarget")}</p>}
          </>
        )}

        {step.key === "mix" && (
          <>
            <p className="mt-6 text-lg leading-relaxed">{t("bench.mix.text")}</p>
            <button type="button" onClick={() => setTimer(60)} className="mt-6 w-full py-4 rounded font-mono text-2xl"
              style={{ border: `1px solid ${COLORS.amberDeep}`, color: COLORS.actionText }}>
              {timer === null ? t("bench.mix.timer") : timer > 0 ? t("bench.mix.running", { s: timer }) : t("bench.mix.done")}
            </button>
            {/* Announce the start and the end, not every second. */}
            <p role="status" className="sr-only">
              {timer === null ? "" : timer > 0 ? t("bench.mix.running", { s: 60 }) : t("bench.mix.done")}
            </p>
          </>
        )}

        {step.key === "qc" && (
          <>
            <p className="mt-6">{t("bench.qc.text")}</p>
            <ul className="mt-3 space-y-2">
              {(t.raw("bench.qc.items") || []).map((item, n) => (
                <li key={item}>
                  <label className="flex items-start gap-3 p-3 rounded cursor-pointer" style={{ border: `1px solid ${COLORS.line}` }}>
                    <input type="checkbox" className="mt-1 w-5 h-5" checked={qc.has(n)}
                      onChange={() => setQc((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; })} />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm" style={{ color: COLORS.inkSoft }}>{t("bench.qc.unusual")}</p>
          </>
        )}

        {step.key === "done" && (
          <>
            <h2 className="mt-6 font-serif italic text-xl" style={{ color: COLORS.amberDeep }}>{t("bench.pour.summary")}</h2>
            <dl data-pour-summary className="mt-3 grid grid-cols-3" style={{ border: `1px solid ${COLORS.ink}` }}>
              {[[isBlend ? "concentrate" : "oil", summary.concentrateG], ["ethanol", summary.ethanolG], ["total", summary.totalG]].map(([k, g], n) => (
                <div key={k} data-summary={k} className="p-3.5 min-w-0" style={{ borderInlineStart: n ? `1px solid ${COLORS.line}` : 0 }}>
                  <dt className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t(`bench.pour.${k}`)}</dt>
                  <dd dir="ltr" className="mt-1.5 text-[22px] tabular-nums text-start">{fmt2(g)} g</dd>
                </div>
              ))}
            </dl>
            {summary.madePct > 0 && (
              <p className="mt-3 font-serif italic text-lg" style={{ color: COLORS.verdigrisText ?? COLORS.verdigris }}>
                {t(`bench.pour.made.${target.basis}`, { pct: fmt2(summary.madePct) })}
              </p>
            )}
            {isBlend && (
              <table className="mt-4 w-full text-sm">
                <caption className="sr-only">{t("bench.pour.summary")}</caption>
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>
                    <th scope="col" className="pb-2 text-start font-normal"><span className="sr-only">{t("bench.pour.ingredient")}</span></th>
                    <th scope="col" className="pb-2 text-end font-normal">{t("bench.pour.target")}</th>
                    <th scope="col" className="pb-2 text-end font-normal">{t("bench.pour.poured")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, n) => (
                    <tr key={n} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                      <th scope="row" className="py-2 text-start font-normal truncate max-w-0 w-1/2">{nameOf(n)}</th>
                      <td className="py-2 text-end tabular-nums" style={{ color: COLORS.inkSoft }}><span dir="ltr">{fmt2(ps.targets[n])} g</span></td>
                      <td className="py-2 text-end tabular-nums"><span dir="ltr">{fmt2(Number(poured[n]) || 0)} g</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-6">{t("bench.label.text")}</p>
            <dl className="mt-3 p-4 rounded grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm" style={{ border: `1px dashed ${COLORS.amberDeep}` }}>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.fragrance")}</dt><dd>{plan.name || t("bench.untitled")}</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.concentration")}</dt><dd>{pct}%</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.bottle")}</dt><dd dir="ltr" className="text-start">{plan.amount} {unit}</dd>
              <dt style={{ color: COLORS.inkSoft }}><label htmlFor="bench-lot">{t("bench.label.lot")}</label></dt>
              <dd><input id="bench-lot" value={lot} onChange={(e) => setLot(e.target.value)} maxLength={60}
                className="w-full px-2 py-2 min-h-[44px] font-mono text-sm border" style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }} /></dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.date")}</dt><dd>{today()}</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.oil")}</dt><dd dir="ltr" className="text-start font-mono">{fmt2(labelled.oil)} g</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.alcohol")}</dt><dd dir="ltr" className="text-start font-mono">{fmt2(labelled.ethanol)} g</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.total")}</dt>
              <dd dir="ltr" className="text-start font-mono">{fmt2(labelled.total)} g</dd>
            </dl>
            <button type="button" onClick={handleLog} disabled={Boolean(demo) || status === "saving" || status === "saved" || status === "queued"}
              className="mt-6 w-full py-4 rounded text-lg font-semibold disabled:opacity-60" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
              {status === "saving" ? t("bench.label.saving") : t("bench.label.log")}
            </button>
            <p className="mt-3 text-sm" role="status" style={{ color: status === "error" ? COLORS.danger : COLORS.actionText }}>
              {status === "saved" && (batchNo ? t("calc.loggedNo", { no: String(batchNo).padStart(3, "0") }) : t("bench.label.saved"))}
              {status === "queued" && t("bench.label.queued")}
              {status === "error" && t("bench.label.failed", { error })}
            </p>
            {stockNote && <p className="mt-1 text-xs" style={{ color: COLORS.inkSoft }}>{stockNote}</p>}
            {ordersLinked !== null && <p className="mt-1 text-sm" style={{ color: COLORS.inkSoft }}>{t("orders.weigh.linked", { count: ordersLinked })}</p>}
            {(status === "saved" || status === "queued") && (
              <nav aria-label={t("bench.after.title")} className="mt-6 grid gap-2">
                <h2 className="font-serif italic text-xl" style={{ color: COLORS.amberDeep }}>{t("bench.after.title")}</h2>
                {plan.orderIds?.length > 0 && (
                  <button type="button" onClick={() => navigate(locale === "ar" ? "/ar/bench/orders" : "/bench/orders")} className="py-3 rounded border text-start px-4" style={{ borderColor: COLORS.actionText, color: COLORS.actionText }}>
                    {t("orders.weigh.back")}
                  </button>
                )}
                {status === "saved" && (
                  <button type="button" onClick={() => navigate(`/journal?batch=${logId.current}`)} className="py-3 rounded border text-start px-4" style={{ borderColor: COLORS.actionText, color: COLORS.actionText }}>
                    {t("bench.after.journal")}
                  </button>
                )}
                {status === "saved" && (
                  <button type="button" onClick={() => navigate("/bench/journal")} className="py-3 rounded border text-start px-4" style={{ borderColor: COLORS.field, color: COLORS.ink }}>
                    {t("bench.after.batches")}
                  </button>
                )}
                {status === "saved" && can(entitlements, "export.labels") && (
                  <button type="button" onClick={() => navigate(`/app/labels?batch=${logId.current}`)} className="py-3 rounded border text-start px-4" style={{ borderColor: COLORS.field, color: COLORS.ink }}>
                    {t("bench.after.label")}
                  </button>
                )}
                <button type="button" onClick={startAnother} className="py-3 rounded border text-start px-4" style={{ borderColor: COLORS.actionText, color: COLORS.actionText }}>
                  {t("bench.label.again")}
                </button>
                <button type="button" onClick={() => navigate("/bench")} className="py-3 rounded border text-start px-4" style={{ borderColor: COLORS.field, color: COLORS.ink }}>
                  {t("bench.after.calculator")}
                </button>
              </nav>
            )}
          </>
        )}

        <Rules at={rulesAt} />
        {!demo && <p className="mt-6 text-[11px]" style={{ color: COLORS.dim }}>{supported && held ? t("bench.awake") : t("bench.awakeUnsupported")}</p>}
      </main>

      <footer className="sticky bottom-0 px-4 py-3 flex gap-3" style={{ background: COLORS.paper, borderTop: `1px solid ${COLORS.line}` }}>
        <button type="button" onClick={() => setI(Math.max(at - 1, 0))} disabled={at === 0}
          className="px-5 py-4 rounded border disabled:opacity-30" style={{ borderColor: COLORS.field, color: COLORS.ink }}>
          {t("bench.back")}
        </button>
        {/* Kept on the last step (disabled) so focus has somewhere to stay. */}
        <button type="button" onClick={() => setI(Math.min(at + 1, steps.length - 1))} disabled={!canNext || last}
          className="flex-1 py-4 rounded text-lg font-semibold disabled:opacity-40" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {t("bench.next")}
        </button>
      </footer>
    </div>
  );
}

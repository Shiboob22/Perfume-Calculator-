import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { useWakeLock } from "../lib/useWakeLock";
import { solveBottle, alcoholForOil, checkPour, labelWeights, fmt2 } from "../lib/calc";
import { UNIT_LABELS } from "../lib/calcPrefill";
import { logBatch } from "../lib/fragranceApi";
import { enqueue, isOffline } from "../lib/outbox";

// The handbook's Bench Workflow, one step per screen, big numbers, for a
// phone next to the scale. The batch comes from the Calculator (router
// state, kept in sessionStorage so a reload or losing signal doesn't lose it).

const STEPS = ["prepare", "tare", "oil", "tareAgain", "alcohol", "mix", "qc", "label"];
const RULES_AT = { prepare: [4], tare: [1], oil: [2, 3, 5], tareAgain: [1], alcohol: [2, 3, 5] };
const SESSION_KEY = "sh-bench";

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
      <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: COLORS.amberDeep }}>{label}</p>
      <p dir="ltr" className="font-mono font-semibold leading-none mt-2" style={{ fontSize: "clamp(56px, 18vw, 96px)", color: COLORS.forestDeep }}>
        {grams}<span className="text-2xl ms-2" style={{ color: COLORS.inkSoft }}>g</span>
      </p>
    </div>
  );
}

function Rules({ step }) {
  const { t } = useI18n();
  const rules = RULES_AT[step] || [];
  if (!rules.length) return null;
  return (
    <ul className="mt-6 space-y-2">
      {rules.map((n) => (
        <li key={n} className="p-3 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink }}>
          <span className="font-mono text-[11px] uppercase me-2" style={{ color: COLORS.amberDeep }}>{t("bench.rule", { n })}</span>
          {t(`bench.rules.${n}`)}{" "}
          <a href={`/guides/at-the-bench#rule-${n}`} className="underline text-xs" style={{ color: COLORS.amber }}>{t("bench.readRule")}</a>
        </li>
      ))}
    </ul>
  );
}

function Grams({ id, label, value, onChange }) {
  return (
    <div className="mt-4">
      <label htmlFor={id} className="block text-sm mb-2" style={{ color: COLORS.ink }}>{label}</label>
      <input id={id} type="number" inputMode="decimal" step="0.01" min="0" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-4 font-mono text-3xl text-center border rounded-xl focus:outline-none focus:ring-2"
        style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }} />
    </div>
  );
}

export default function BenchMode() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [plan] = useState(() => loadPlan(location.state));
  const [i, setI] = useState(0);
  const [cautionRead, setCautionRead] = useState(false);
  const [oilG, setOilG] = useState("");
  const [alcoholG, setAlcoholG] = useState("");
  const [lot, setLot] = useState("");
  const [qc, setQc] = useState(() => new Set());
  const [timer, setTimer] = useState(null); // seconds left, or null
  const [status, setStatus] = useState(null); // null | saving | saved | queued | error
  const [error, setError] = useState("");
  const { supported, held } = useWakeLock(true);

  useEffect(() => {
    if (timer === null || timer <= 0) return undefined;
    const id = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const target = useMemo(() => (plan ? solveBottle(plan.amount, plan.unit, plan.concPct, plan.densities) : null), [plan]);
  const actualOil = Number(oilG) > 0 ? Number(oilG) : null;
  const alcoholTarget = target && actualOil ? alcoholForOil(actualOil, plan.concPct, target.basis, plan.densities) : target?.exact.ethanolG;
  const pour = target && actualOil && Number(alcoholG) > 0 ? checkPour(actualOil, Number(alcoholG), plan.concPct, target.basis, plan.densities) : null;

  if (!plan || !target) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <p style={{ color: COLORS.inkSoft }}>{t("bench.noPlan")}</p>
        <button type="button" onClick={() => navigate("/app/calculator")} className="mt-4 underline" style={{ color: COLORS.amber }}>{t("app.tabs.calculator")}</button>
      </div>
    );
  }

  const step = STEPS[i];
  const canNext = (step === "prepare" && cautionRead) || (step === "oil" && actualOil) || (step === "alcohol" && Number(alcoholG) > 0)
    || ["tare", "tareAgain", "mix", "qc"].includes(step);

  async function handleLog() {
    setStatus("saving");
    setError("");
    const batch = {
      id: crypto.randomUUID(),
      fragrance_id: plan.fragranceId || null,
      fragrance_name: plan.name || t("bench.untitled"),
      tier: plan.tier,
      blend_date: today(),
      concentration_pct: plan.concPct,
      oil_g: target.exact.oilG, oil_ml: target.exact.oilMl,
      ethanol_g: target.exact.ethanolG, ethanol_ml: target.exact.ethanolMl,
      total_g: target.exact.totalG, total_ml: target.exact.totalMl,
      actual_oil_g: actualOil,
      actual_ethanol_g: Number(alcoholG) || null,
      notes: lot ? `${t("bench.label.lot")}: ${lot}` : null,
      basis: target.basis,
      oil_density: plan.densities.oil,
      ethanol_density: plan.densities.ethanol,
    };
    try {
      await logBatch(batch);
      setStatus("saved");
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

  const pct = plan.concPct;
  const labelled = labelWeights(target.exact.oilG, target.exact.ethanolG, actualOil, Number(alcoholG));
  const unit = UNIT_LABELS[plan.unit];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.paper, color: COLORS.ink }}>
      <header className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: COLORS.amberDeep }}>
            {t("bench.step", { n: i + 1, total: STEPS.length })}
          </p>
          <p className="text-sm truncate" style={{ color: COLORS.inkSoft }}>
            {t("bench.batch", { name: plan.name || t("bench.untitled"), size: plan.amount, unit, pct })}
          </p>
        </div>
        <button type="button" onClick={() => navigate("/app/calculator")} className="text-xs underline" style={{ color: COLORS.inkSoft }}>
          {t("bench.exit")}
        </button>
      </header>
      <div className="h-1" style={{ background: COLORS.line }}>
        <div className="h-1" style={{ width: `${((i + 1) / STEPS.length) * 100}%`, background: COLORS.amber }} />
      </div>

      <main className="flex-1 w-full max-w-xl mx-auto px-5 py-6">
        <h1 className="font-serif italic text-4xl" style={{ color: COLORS.forestDeep }}>{t(`bench.${step}.title`)}</h1>

        {step === "prepare" && (
          <>
            <h2 className="mt-6 font-mono text-xs uppercase tracking-wider" style={{ color: COLORS.amberDeep }}>{t("bench.prepare.equipment")}</h2>
            <ul className="mt-2 space-y-1 ps-5 list-disc">{(t.raw("bench.prepare.equipmentList") || []).map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="mt-4">{t("bench.prepare.area")}</p>
            <div role="alert" className="mt-5 p-4 rounded-xl" style={{ border: `1px solid ${COLORS.danger}`, background: COLORS.dangerBg }}>
              <p className="font-semibold" style={{ color: COLORS.danger }}>{t("bench.prepare.caution")}</p>
              <p className="mt-1">{t("bench.prepare.cautionText")}</p>
              <label className="mt-3 flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={cautionRead} onChange={(e) => setCautionRead(e.target.checked)} className="mt-1 w-5 h-5" />
                <span>{t("bench.prepare.confirm")}</span>
              </label>
            </div>
          </>
        )}

        {step === "tare" && <p className="mt-6 text-lg leading-relaxed">{t("bench.tare.text")}</p>}

        {step === "oil" && (
          <>
            <Big label={t("bench.oil.target")} grams={fmt2(target.exact.oilG)} />
            <p className="leading-relaxed">{t("bench.oil.text")}</p>
            <Grams id="bench-oil" label={t("bench.oil.actual")} value={oilG} onChange={setOilG} />
            {!actualOil && <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft }}>{t("bench.oil.needActual")}</p>}
          </>
        )}

        {step === "tareAgain" && <p className="mt-6 text-lg leading-relaxed">{t("bench.tareAgain.text")}</p>}

        {step === "alcohol" && (
          <>
            <Big label={t("bench.alcohol.target")} grams={fmt2(alcoholTarget)} />
            {actualOil && Math.abs(actualOil - target.exact.oilG) >= 0.005 && (
              <p className="text-sm mb-3" style={{ color: COLORS.amber }}>{t("bench.alcohol.adjusted", { oil: fmt2(actualOil), pct })}</p>
            )}
            <p className="leading-relaxed">{t("bench.alcohol.text")}</p>
            <Grams id="bench-alcohol" label={t("bench.alcohol.actual")} value={alcoholG} onChange={setAlcoholG} />
            {pour && (
              <p className="mt-3 text-sm">
                {t("bench.alcohol.made", { pct: fmt2(pour.actualPct), basis: t(`calc.modes.by.${pour.basis}`).toLowerCase() })}
                {pour.fix.material && Math.abs(pour.deviation) >= 0.005 && (
                  <span className="block mt-1" style={{ color: COLORS.amber }}>
                    {t("bench.alcohol.fix", { target: pct, grams: fmt2(pour.fix.grams), material: t(`bench.alcohol.material.${pour.fix.material}`) })}
                  </span>
                )}
              </p>
            )}
          </>
        )}

        {step === "mix" && (
          <>
            <p className="mt-6 text-lg leading-relaxed">{t("bench.mix.text")}</p>
            <button type="button" onClick={() => setTimer(60)} className="mt-6 w-full py-4 rounded-xl font-mono text-2xl"
              style={{ border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber }} aria-live="polite">
              {timer === null ? t("bench.mix.timer") : timer > 0 ? t("bench.mix.running", { s: timer }) : t("bench.mix.done")}
            </button>
          </>
        )}

        {step === "qc" && (
          <>
            <p className="mt-6">{t("bench.qc.text")}</p>
            <ul className="mt-3 space-y-2">
              {(t.raw("bench.qc.items") || []).map((item, n) => (
                <li key={item}>
                  <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer" style={{ border: `1px solid ${COLORS.line}` }}>
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

        {step === "label" && (
          <>
            <p className="mt-6">{t("bench.label.text")}</p>
            <dl className="mt-3 p-4 rounded-xl grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm" style={{ border: `1px dashed ${COLORS.amberDeep}` }}>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.fragrance")}</dt><dd>{plan.name || t("bench.untitled")}</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.concentration")}</dt><dd>{pct}%</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.bottle")}</dt><dd dir="ltr" className="text-start">{plan.amount} {unit}</dd>
              <dt style={{ color: COLORS.inkSoft }}><label htmlFor="bench-lot">{t("bench.label.lot")}</label></dt>
              <dd><input id="bench-lot" value={lot} onChange={(e) => setLot(e.target.value)} maxLength={60}
                className="w-full px-2 py-1 font-mono text-sm border" style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }} /></dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.date")}</dt><dd>{today()}</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.oil")}</dt><dd dir="ltr" className="text-start font-mono">{fmt2(labelled.oil)} g</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.alcohol")}</dt><dd dir="ltr" className="text-start font-mono">{fmt2(labelled.ethanol)} g</dd>
              <dt style={{ color: COLORS.inkSoft }}>{t("bench.label.total")}</dt>
              <dd dir="ltr" className="text-start font-mono">{fmt2(labelled.total)} g</dd>
            </dl>
            <button type="button" onClick={handleLog} disabled={status === "saving" || status === "saved" || status === "queued"}
              className="mt-6 w-full py-4 rounded-xl text-lg font-semibold disabled:opacity-60" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
              {status === "saving" ? t("bench.label.saving") : t("bench.label.log")}
            </button>
            <p className="mt-3 text-sm" role="status" style={{ color: status === "error" ? COLORS.danger : COLORS.amber }}>
              {status === "saved" && t("bench.label.saved")}
              {status === "queued" && t("bench.label.queued")}
              {status === "error" && t("bench.label.failed", { error })}
            </p>
          </>
        )}

        <Rules step={step} />
        <p className="mt-6 text-[11px]" style={{ color: COLORS.dim }}>{supported && held ? t("bench.awake") : t("bench.awakeUnsupported")}</p>
      </main>

      <footer className="sticky bottom-0 px-4 py-3 flex gap-3" style={{ background: COLORS.paper, borderTop: `1px solid ${COLORS.line}` }}>
        <button type="button" onClick={() => setI((n) => Math.max(n - 1, 0))} disabled={i === 0}
          className="px-5 py-4 rounded-xl border disabled:opacity-30" style={{ borderColor: COLORS.field, color: COLORS.ink }}>
          {t("bench.back")}
        </button>
        {i < STEPS.length - 1 && (
          <button type="button" onClick={() => setI((n) => n + 1)} disabled={!canNext}
            className="flex-1 py-4 rounded-xl text-lg font-semibold disabled:opacity-40" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {t("bench.next")}
          </button>
        )}
      </footer>
    </div>
  );
}

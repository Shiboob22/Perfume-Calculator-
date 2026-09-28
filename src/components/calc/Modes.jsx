import React, { useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { solveFromOil, adjustConcentration, solveRun, solveBottle, fmt2 } from "../../lib/calc";
import { STRENGTHS } from "../../lib/formulation";

// Calculator modes b, c and d. All arithmetic is in src/lib/calc; these only
// collect inputs and show results. `densities` = { oil, ethanol } in use.

const inputCls = "w-full px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2";
const inputStyle = { borderColor: COLORS.field, color: COLORS.ink, backgroundColor: COLORS.cardHi };

function Num({ id, label, value, onChange, step = "0.01", placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{label}</label>
      <input id={id} type="number" inputMode="decimal" min="0" step={step} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} className={inputCls} style={inputStyle} />
    </div>
  );
}

function Strength({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {STRENGTHS.map(({ pct, name }) => (
          <button key={pct} type="button" onClick={() => onChange(pct)} aria-pressed={Number(value) === pct}
            className="px-2 py-1 text-[11px] font-mono border"
            style={{ borderColor: Number(value) === pct ? COLORS.amber : COLORS.line, background: Number(value) === pct ? COLORS.amber : COLORS.cardHi, color: Number(value) === pct ? COLORS.onAmber : COLORS.ink }}>
            {pct}% {name}
          </button>
        ))}
      </div>
      <input id={id} type="number" inputMode="decimal" min="1" max="99" step="0.5" value={value}
        onChange={(e) => onChange(e.target.value)} className={inputCls} style={inputStyle} />
    </div>
  );
}

function BasisToggle({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t("calc.modes.basis")} className="flex gap-2">
      {["volume", "weight"].map((b) => (
        <button key={b} type="button" aria-pressed={value === b} onClick={() => onChange(b)}
          className="px-2 py-1 text-[11px] font-mono border"
          style={{ borderColor: value === b ? COLORS.amber : COLORS.line, color: value === b ? COLORS.amber : COLORS.ink }}>
          {t(`calc.modes.by.${b}`)}
        </button>
      ))}
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
      <span className={strong ? "font-semibold" : ""} style={{ color: COLORS.ink }}>{label}</span>
      <span dir="ltr" className={`font-mono ${strong ? "font-semibold" : ""}`} style={{ color: COLORS.ink }}>{value}</span>
    </div>
  );
}

const valid = (...xs) => xs.every((x) => Number(x) > 0);

// ------------------------------------------------ mode b: oil on hand
export function FromOil({ densities, defaultPct }) {
  const { t } = useI18n();
  const [oilG, setOilG] = useState("");
  const [pct, setPct] = useState(defaultPct);
  const [basis, setBasis] = useState("volume");
  const [bottleMl, setBottleMl] = useState("");
  const ok = valid(oilG) && Number(pct) > 0 && Number(pct) < 100;
  const r = ok ? solveFromOil(Number(oilG), Number(pct), basis, densities, Number(bottleMl) || undefined) : null;
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("calc.modes.fromOil.intro")}</p>
      <Num id="b-oil" label={t("calc.modes.fromOil.oil")} value={oilG} onChange={setOilG} />
      <Strength id="b-pct" label={t("calc.modes.strength")} value={pct} onChange={setPct} />
      <BasisToggle value={basis} onChange={setBasis} />
      <Num id="b-bottle" label={t("calc.modes.fromOil.bottle")} value={bottleMl} onChange={setBottleMl} step="1" />
      {r && (
        <div>
          <Row label={t("calc.modes.alcohol")} value={`${fmt2(r.shown.ethanolG)} g / ${fmt2(r.shown.ethanolMl)} mL`} />
          <Row label={t("calc.total")} value={`${fmt2(r.shown.totalG)} g / ${fmt2(r.shown.totalMl)} mL`} strong />
          {r.bottles !== null && (
            <p className="mt-3 text-sm" style={{ color: COLORS.amber }}>
              {t("calc.modes.fromOil.fills", { count: r.bottles, size: Number(bottleMl), left: fmt2(r.leftoverMl) })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------- mode c: change strength, add only
export function Adjust({ densities, defaultPct }) {
  const { t } = useI18n();
  const [amountMl, setAmountMl] = useState("");
  const [fromPct, setFromPct] = useState(defaultPct);
  const [toPct, setToPct] = useState("");
  const [capacityMl, setCapacityMl] = useState("");
  const [oilAvailableG, setOilAvailableG] = useState("");
  const ok = valid(amountMl, fromPct, toPct) && Number(fromPct) < 100 && Number(toPct) < 100;
  const current = ok ? solveBottle(Number(amountMl), "ml", Number(fromPct), densities).exact : null;
  const r = current
    ? adjustConcentration(current, Number(toPct), "volume", densities, {
        capacityMl: Number(capacityMl) > 0 ? Number(capacityMl) : undefined,
        oilAvailableG: Number(oilAvailableG) > 0 ? Number(oilAvailableG) : undefined,
      })
    : null;
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("calc.modes.adjust.intro")}</p>
      <Num id="c-amount" label={t("calc.modes.adjust.amount")} value={amountMl} onChange={setAmountMl} step="1" />
      <Strength id="c-from" label={t("calc.modes.adjust.from")} value={fromPct} onChange={setFromPct} />
      <Strength id="c-to" label={t("calc.modes.adjust.to")} value={toPct} onChange={setToPct} />
      <div className="grid grid-cols-2 gap-3">
        <Num id="c-cap" label={t("calc.modes.adjust.capacity")} value={capacityMl} onChange={setCapacityMl} step="1" />
        <Num id="c-oil" label={t("calc.modes.adjust.oilLeft")} value={oilAvailableG} onChange={setOilAvailableG} />
      </div>
      {r && (
        <div className="p-3 rounded" style={{ border: `1px solid ${r.reachable ? COLORS.amberDeep : COLORS.danger}` }}>
          {r.add.material === null && r.reachable && <p style={{ color: COLORS.ink }}>{t("calc.modes.adjust.already")}</p>}
          {r.add.material && (
            <p className="font-semibold" style={{ color: COLORS.forestDeep }}>
              {t(`calc.modes.adjust.add.${r.add.material}`, { grams: fmt2(r.add.grams), ml: fmt2(r.add.ml) })}
            </p>
          )}
          {!r.reachable && (
            <p className="mt-2 text-sm" style={{ color: COLORS.danger }}>
              {r.closest === null
                ? t("calc.modes.adjust.impossible")
                : t(`calc.modes.adjust.limited.${r.limit}`, { target: Number(toPct), closest: fmt2(r.closest) })}
            </p>
          )}
          <p className="mt-2 text-[11px]" style={{ color: COLORS.inkSoft }}>{t("calc.modes.adjust.addOnly")}</p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------- mode d: several bottles
export function Run({ densities, defaultPct }) {
  const { t } = useI18n();
  const [lines, setLines] = useState([{ sizeMl: "50", count: "1" }]);
  const [pct, setPct] = useState(defaultPct);
  const [overfill, setOverfill] = useState("0");
  const set = (i, key, v) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [key]: v } : l)));
  const clean = lines.map((l) => ({ sizeMl: Number(l.sizeMl), count: Math.floor(Number(l.count)) }));
  const ok = clean.some((l) => l.sizeMl > 0 && l.count > 0) && Number(pct) > 0 && Number(pct) < 100;
  const r = ok ? solveRun(clean, Number(pct), densities, Number(overfill) || 0) : null;
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("calc.modes.run.intro")}</p>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Num id={`d-size-${i}`} label={t("calc.modes.run.size")} value={l.sizeMl} onChange={(v) => set(i, "sizeMl", v)} step="1" />
          <Num id={`d-count-${i}`} label={t("calc.modes.run.count")} value={l.count} onChange={(v) => set(i, "count", v)} step="1" />
          <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1}
            aria-label={t("calc.modes.run.remove")} className="px-2 py-2 text-sm disabled:opacity-30" style={{ color: COLORS.inkSoft }}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => setLines((ls) => [...ls, { sizeMl: "", count: "1" }])}
        className="text-[11px] font-mono underline" style={{ color: COLORS.amber }}>{t("calc.modes.run.addLine")}</button>
      <Strength id="d-pct" label={t("calc.modes.strength")} value={pct} onChange={setPct} />
      <Num id="d-over" label={t("calc.modes.run.overfill")} value={overfill} onChange={setOverfill} step="1" />
      {r && (
        <div>
          <Row label={t("calc.modes.run.bottlesTotal")} value={`${fmt2(r.bottlesMl)} mL`} />
          <Row label={t("calc.oil")} value={`${fmt2(r.shown.oilG)} g`} />
          <Row label={t("calc.modes.alcohol")} value={`${fmt2(r.shown.ethanolG)} g`} />
          <Row label={t("calc.total")} value={`${fmt2(r.shown.totalG)} g / ${fmt2(r.shown.totalMl)} mL`} strong />
          <ul className="mt-3 text-sm space-y-1" style={{ color: COLORS.inkSoft }}>
            {r.perBottle.map((b, i) => (
              <li key={i}>{t("calc.modes.run.perBottle", { count: b.count, size: b.sizeMl, grams: fmt2(b.g) })}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

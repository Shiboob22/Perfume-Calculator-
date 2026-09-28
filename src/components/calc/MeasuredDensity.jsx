import React, { useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { measuredDensity } from "../../lib/calc";

const input = "w-full px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2";
const inputStyle = { borderColor: COLORS.field, color: COLORS.ink, backgroundColor: COLORS.cardHi };

// The handbook's rule: a measured density always wins over the reference.
// Weigh a known volume of this oil; the calculator then uses its density.
export default function MeasuredDensity({ value, onChange, referenceDensity }) {
  const { t } = useI18n();
  const [grams, setGrams] = useState("");
  const [ml, setMl] = useState("");
  const m = measuredDensity(Number(grams), Number(ml));

  return (
    <div className="mt-4 p-3 rounded" style={{ border: `1px solid ${COLORS.line}` }}>
      <p className="text-xs font-semibold mb-1" style={{ color: COLORS.forestDeep }}>{t("calc.measured.title")}</p>
      {value != null ? (
        <p className="text-xs font-mono mb-2" style={{ color: COLORS.amber }}>
          {t("calc.measured.using", { density: value })}{" "}
          <button type="button" onClick={() => onChange(null)} className="underline" style={{ color: COLORS.inkSoft }}>
            {t("calc.measured.clear")}
          </button>
        </p>
      ) : (
        <p className="text-xs mb-2" style={{ color: COLORS.inkSoft }}>{t("calc.measured.reference", { density: referenceDensity })}</p>
      )}
      <p className="text-[11px] mb-2" style={{ color: COLORS.inkSoft }}>{t("calc.measured.how")}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="md-grams" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.measured.grams")}</label>
          <input id="md-grams" type="number" inputMode="decimal" step="0.01" min="0" value={grams} onChange={(e) => setGrams(e.target.value)} className={input} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="md-ml" className="block text-[11px] mb-1" style={{ color: COLORS.ink }}>{t("calc.measured.ml")}</label>
          <input id="md-ml" type="number" inputMode="decimal" step="0.1" min="0" value={ml} onChange={(e) => setMl(e.target.value)} className={input} style={inputStyle} />
        </div>
      </div>
      {m && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs font-mono" style={{ color: COLORS.ink }}>
          <span>{t("calc.measured.result", { density: m.density.toFixed(3), pm: m.plusMinus.toFixed(3) })}</span>
          <button type="button" onClick={() => { onChange(Number(m.density.toFixed(3))); setGrams(""); setMl(""); }}
            className="px-2 py-1 rounded font-semibold" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {t("calc.measured.use")}
          </button>
        </div>
      )}
      {m && Number(ml) < 10 && <p className="mt-1 text-[11px]" style={{ color: COLORS.inkSoft }}>{t("calc.measured.small")}</p>}
    </div>
  );
}

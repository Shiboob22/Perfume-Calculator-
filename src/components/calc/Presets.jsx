import React, { useEffect, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { errorText } from "../../i18n/errorText";
import { listPresets, savePreset, deletePreset } from "../../lib/fragranceApi";
import { UNIT_LABELS } from "../../lib/calcPrefill";

// Saved starting points ("My usual: 50 mL at 25%"): one tap fills size,
// unit and strength.
export default function Presets({ current, onApply }) {
  const { t } = useI18n();
  const [presets, setPresets] = useState([]);
  const [naming, setNaming] = useState(false);
  const [confirming, setConfirming] = useState(null); // preset id awaiting a second tap
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listPresets().then(setPresets).catch(() => {}); // presets are a convenience
  }, []);

  async function handleSave() {
    setError("");
    try {
      const saved = await savePreset({ name, amount: Number(current.amount), unit: current.unit, concentrationPct: Number(current.concPct) });
      setPresets((p) => [...p, saved]);
      setNaming(false);
      setName("");
    } catch (e) {
      setError(errorText(t, e, "calc.presets.saveFailed"));
    }
  }

  async function handleDelete(id) {
    try {
      await deletePreset(id);
      setPresets((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      setError(errorText(t, e, "calc.presets.deleteFailed"));
    }
  }

  return (
    <div className="mb-5">
      <div className="flex flex-wrap gap-2 items-center">
        {presets.map((p) => (
          <span key={p.id} className="inline-flex items-center rounded border text-[11px] font-mono" style={{ borderColor: COLORS.line }}>
            <button type="button" onClick={() => onApply({ amount: Number(p.amount), unit: p.unit, concPct: Number(p.concentration_pct) })}
              className="px-2 py-1 min-h-[28px]" style={{ color: COLORS.ink }}>
              {p.name} · {Number(p.amount)} {UNIT_LABELS[p.unit]} · {Number(p.concentration_pct)}%
            </button>
            {/* 28px target (WCAG 2.5.8), and a second tap to delete: it sits
                right next to the preset people tap at the bench. */}
            {confirming === p.id ? (
              <button type="button" autoFocus onClick={() => { setConfirming(null); handleDelete(p.id); }} onBlur={() => setConfirming(null)}
                className="px-2 min-h-[28px]" style={{ color: COLORS.danger, borderInlineStart: `1px solid ${COLORS.line}` }}>
                {t("calc.presets.confirmDelete")}
              </button>
            ) : (
              <button type="button" onClick={() => setConfirming(p.id)} aria-label={t("calc.presets.delete", { name: p.name })}
                className="min-w-[28px] min-h-[28px] px-2" style={{ color: COLORS.dim, borderInlineStart: `1px solid ${COLORS.line}` }}>×</button>
            )}
          </span>
        ))}
        {naming ? (
          <span className="inline-flex gap-1">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus
              aria-label={t("calc.presets.name")} placeholder={t("calc.presets.name")}
              className="px-2 py-1 font-mono text-[11px] border" style={{ borderColor: COLORS.field, backgroundColor: COLORS.cardHi, color: COLORS.ink }} />
            <button type="button" onClick={handleSave} disabled={!name.trim()} className="px-2 py-1 text-[11px] font-semibold rounded disabled:opacity-50"
              style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t("calc.presets.save")}</button>
          </span>
        ) : (
          <button type="button" onClick={() => setNaming(true)} className="px-2 py-1 text-[11px] font-mono underline" style={{ color: COLORS.amber }}>
            {t("calc.presets.add")}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-xs mt-1" style={{ color: COLORS.danger }}>{error}</p>}
    </div>
  );
}

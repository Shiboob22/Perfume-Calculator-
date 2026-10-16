import React, { useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { editBatch } from "../lib/fragranceApi";

// The record around a logged batch, editable: name, date, lot, who, the
// supplier, the actual pours and notes. Not the recipe (Make again is for
// a different blend). Only changed fields are sent.
const FIELDS = [
  ["fragrance_name", "name", "text"],
  ["blend_date", "date", "date"],
  ["lot", "lot", "text"],
  ["blended_by", "blendedBy", "text"],
  ["oil_type", "supplier", "text"],
  ["actual_oil_g", "actualOil", "number"],
  ["actual_ethanol_g", "actualAlcohol", "number"],
];

const asText = (v) => (v == null ? "" : String(v));

export default function BatchEdit({ batch, onSaved, onStatus }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function start() {
    setForm(Object.fromEntries([...FIELDS.map(([k]) => k), "notes"].map((k) => [k, asText(batch[k])])));
    setError("");
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    const edit = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== asText(batch[k])));
    if (!Object.keys(edit).length) return setOpen(false);
    setSaving(true);
    setError("");
    try {
      const updated = await editBatch(batch.id, edit);
      onSaved(batch.id, updated);
      onStatus?.(t("batches.edit.saved"));
      setOpen(false);
    } catch (err) {
      setError(errorText(t, err, "batches.edit.failed"));
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={start} className="text-xs font-mono underline min-h-[24px]" style={{ color: COLORS.forest }}>
        {t("batches.edit.open")}
      </button>
    );
  }

  const field = "w-full px-3 py-2 text-sm border rounded-sm";
  const fieldStyle = { borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink };
  return (
    <form onSubmit={save} className="basis-full mt-3 p-4 border rounded-sm grid gap-3 sm:grid-cols-2" style={{ borderColor: COLORS.line, background: COLORS.card }}>
      <h3 className="sm:col-span-2 font-serif text-base" style={{ color: COLORS.forestDeep }}>{t("batches.edit.title")}</h3>
      {FIELDS.map(([k, label, type]) => (
        <label key={k} className="text-xs grid gap-1" style={{ color: COLORS.inkSoft }}>
          {t(`batches.edit.${label}`)}
          <input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            {...(type === "number" ? { inputMode: "decimal", step: "0.01", min: "0", dir: "ltr" } : {})}
            required={k === "fragrance_name" || k === "blend_date"} maxLength={k === "lot" ? 60 : 120}
            className={field} style={fieldStyle} />
          {k === "blend_date" && <span>{t("batches.edit.dateNote")}</span>}
        </label>
      ))}
      <label className="sm:col-span-2 text-xs grid gap-1" style={{ color: COLORS.inkSoft }}>
        {t("batches.edit.notes")}
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} rows={3} className={field} style={fieldStyle} />
      </label>
      <p className="sm:col-span-2 text-xs" style={{ color: COLORS.inkSoft }}>{t("batches.edit.recipeNote")}</p>
      {error && <p role="alert" className="sm:col-span-2 text-xs" style={{ color: COLORS.danger }}>{error}</p>}
      <div className="sm:col-span-2 flex gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-sm disabled:opacity-50" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {saving ? t("batches.edit.saving") : t("batches.edit.save")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm underline" style={{ color: COLORS.inkSoft }}>
          {t("batches.edit.cancel")}
        </button>
      </div>
    </form>
  );
}

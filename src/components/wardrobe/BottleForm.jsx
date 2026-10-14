import React, { useEffect, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { searchFragrances } from "../../lib/fragranceApi";
import { CLUSTERS, FAMILIES, PROJECTIONS } from "../../lib/wardrobe/framework";
import { bottleRow } from "../../lib/wardrobe/validate";
import Button from "../kx/Button";
import Field from "../kx/Field";
import { SelectField, inputClass, inputStyle } from "./ui";

const BLANK = { name: "", fragrance_id: null, kind: "bottle", status: "owned", family: "", projection: "", clusters: [], size_ml: "", fill_pct: "", price: "", currency: "", purchase_date: "", note: "" };

// Add or edit a bottle. `compact` is for the wish list and tested list: a
// name, its family and a note are enough before you own it. The name can be
// picked from the catalog (the link is kept), or simply typed.
export default function BottleForm({ initial, status = "owned", compact = false, today, onSave, onCancel }) {
  const { t } = useI18n();
  const [form, setForm] = useState(() => {
    const merged = { ...BLANK, status, ...initial, clusters: initial?.clusters ?? [] };
    // A database null is an empty box, not the text "null".
    for (const k of ["family", "projection", "size_ml", "fill_pct", "price", "currency", "purchase_date", "note"]) merged[k] ??= "";
    return merged;
  });
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Catalog suggestions while typing a new name (not once one is picked).
  useEffect(() => {
    if (form.fragrance_id || form.name.trim().length < 3) { setMatches([]); return undefined; }
    let live = true;
    const timer = setTimeout(() => {
      searchFragrances(form.name, 5).then((rows) => { if (live) setMatches(rows); }).catch(() => { if (live) setMatches([]); });
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [form.name, form.fragrance_id]);

  async function submit(e) {
    e.preventDefault();
    const checked = bottleRow(form, today);
    if (checked.errors) return setError(t("wardrobe.collection.checkFields", { fields: checked.errors.map((f) => t(`wardrobe.fields.${f}`)).join(", ") }));
    setError(""); setBusy(true);
    try {
      await onSave(checked.row);
    } catch (err) {
      setError(err?.code === "54000" ? t("wardrobe.collection.limit") : t("wardrobe.collection.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const toggleCluster = (c) => set({ clusters: form.clusters.includes(c) ? form.clusters.filter((x) => x !== c) : [...form.clusters, c] });
  const familyOptions = [{ value: "", label: t("wardrobe.collection.familyAny") }, ...FAMILIES.map((f) => ({ value: f, label: t(`families.${f}.label`) }))];
  const reachOptions = [{ value: "", label: t("wardrobe.collection.projectionAny") }, ...PROJECTIONS.map((p) => ({ value: p, label: `${t(`wardrobe.projections.${p}`)} — ${t(`wardrobe.projectionHelp.${p}`)}` }))];

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 p-5 border" style={{ borderColor: COLORS.line, background: COLORS.card }}>
      <Field label={t("wardrobe.collection.name")} value={form.name} maxLength={120} onChange={(e) => set({ name: e.target.value, fragrance_id: null })} autoComplete="off" />
      {matches.length > 0 && (
        <div role="group" aria-label={t("wardrobe.collection.pick")} className="grid gap-1 -mt-2">
          {matches.map((m) => (
            <button key={m.id} type="button" onClick={() => set({ name: m.name, fragrance_id: m.id, family: m.tier && FAMILIES.includes(m.tier) ? m.tier : form.family })}
              className="text-start text-sm px-3 min-h-[44px] border" style={{ borderColor: COLORS.line, color: COLORS.ink }}>{m.name}</button>
          ))}
        </div>
      )}
      {!compact && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label={t("wardrobe.collection.kind")} value={form.kind} onChange={(v) => set({ kind: v })} options={["bottle", "decant"].map((k) => ({ value: k, label: t(`wardrobe.collection.kinds.${k}`) }))} />
          <Field label={t("wardrobe.collection.size")} mono inputMode="decimal" value={form.size_ml} onChange={(e) => set({ size_ml: e.target.value })} dir="ltr" />
          <Field label={t("wardrobe.collection.fill")} mono inputMode="numeric" value={form.fill_pct} onChange={(e) => set({ fill_pct: e.target.value })} dir="ltr" />
          <Field label={t("wardrobe.collection.date")} type="date" value={form.purchase_date} max={today} onChange={(e) => set({ purchase_date: e.target.value })} dir="ltr" />
          <Field label={t("wardrobe.collection.price")} mono inputMode="decimal" value={form.price} onChange={(e) => set({ price: e.target.value })} dir="ltr" />
          <Field label={t("wardrobe.collection.currency")} mono hint={t("wardrobe.collection.currencyHint")} maxLength={3} value={form.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} dir="ltr" />
        </div>
      )}
      <SelectField label={t("wardrobe.collection.family")} value={form.family} onChange={(v) => set({ family: v })} options={familyOptions} />
      {!compact && (
        <>
          <SelectField label={t("wardrobe.collection.projection")} value={form.projection} onChange={(v) => set({ projection: v })} options={reachOptions} />
          <fieldset>
            <legend className="text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("wardrobe.collection.clusters")}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {CLUSTERS.map((c) => (
                <label key={c} className="inline-flex items-center gap-2 min-h-[44px] text-sm cursor-pointer" style={{ color: COLORS.ink }}>
                  <input type="checkbox" checked={form.clusters.includes(c)} onChange={() => toggleCluster(c)} className="w-5 h-5" />
                  {t(`wardrobe.clusters.${c}`)}
                </label>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: COLORS.dim }}>{t("wardrobe.collection.clustersHint")}</p>
          </fieldset>
        </>
      )}
      <div>
        <label htmlFor="bottle-note" className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("wardrobe.collection.note")}</label>
        <textarea id="bottle-note" rows={2} maxLength={500} value={form.note ?? ""} onChange={(e) => set({ note: e.target.value })} className={`${inputClass} py-2`} style={inputStyle} />
      </div>
      {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy}>{initial?.id ? t("wardrobe.collection.saveEdit") : t("wardrobe.collection.save")}</Button>
        <Button variant="ghost" onClick={onCancel}>{t("wardrobe.collection.cancel")}</Button>
      </div>
    </form>
  );
}

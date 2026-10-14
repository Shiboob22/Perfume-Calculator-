import React, { useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { submitFragrance } from "../../lib/atlasApi";
import { contributionPayload } from "../../lib/atlas/contribute";
import { FAMILIES } from "../../lib/wardrobe/framework";
import Button from "../kx/Button";
import Field from "../kx/Field";
import { SelectField, inputClass, inputStyle } from "../wardrobe/ui";

const BLANK = { name: "", brand: "", tier: "", year: "", gender: "", country: "", top: "", heart: "", base: "", accords: "", perfumers: "" };

// Suggest a fragrance that is missing. It arrives as a pending row only its
// author can see, until an editor approves it.
export default function Contribute() {
  const { t } = useI18n();
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e) {
    e.preventDefault();
    setSent("");
    const checked = contributionPayload(form);
    if (checked.errors) return setError(t("atlas.contribute.check", { fields: checked.errors.map((x) => t(`atlas.fields.${x}`)).join(", ") }));
    setError(""); setBusy(true);
    try {
      await submitFragrance(checked.payload);
      setSent(t("atlas.contribute.sent", { name: checked.payload.name }));
      setForm(BLANK);
    } catch (err) {
      setError(err?.code === "23505" ? t("atlas.contribute.exists") : err?.code === "54000" ? t("atlas.contribute.limit") : t("atlas.contribute.failed"));
    } finally {
      setBusy(false);
    }
  }

  const list = (key, label) => (
    <div>
      <label htmlFor={`c-${key}`} className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{label}</label>
      <textarea id={`c-${key}`} rows={2} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} className={`${inputClass} py-2`} style={inputStyle} aria-describedby="c-list-hint" />
    </div>
  );

  return (
    <section aria-labelledby="atlas-contribute-h" className="max-w-xl">
      <h2 id="atlas-contribute-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("atlas.contribute.title")}</h2>
      <p className="text-sm mb-5" style={{ color: COLORS.inkSoft }}>{t("atlas.contribute.lead")}</p>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field label={t("atlas.contribute.name")} value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} />
        <Field label={t("atlas.contribute.brand")} value={form.brand} onChange={(e) => set({ brand: e.target.value })} maxLength={120} />
        <SelectField label={t("atlas.contribute.tier")} value={form.tier} onChange={(v) => set({ tier: v })}
          options={[{ value: "", label: t("atlas.contribute.tierPick") }, ...FAMILIES.map((f) => ({ value: f, label: t(`families.${f}.label`) }))]} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("atlas.contribute.year")} mono inputMode="numeric" value={form.year} onChange={(e) => set({ year: e.target.value })} dir="ltr" />
          <SelectField label={t("atlas.contribute.gender")} value={form.gender} onChange={(v) => set({ gender: v })}
            options={[{ value: "", label: t("atlas.contribute.genderAny") }, ...["women", "men", "unisex"].map((g) => ({ value: g, label: t(`atlas.genders.${g}`) }))]} />
        </div>
        <Field label={t("atlas.contribute.country")} value={form.country} onChange={(e) => set({ country: e.target.value })} maxLength={60} />
        <p id="c-list-hint" className="text-xs -mb-2" style={{ color: COLORS.dim }}>{t("atlas.contribute.listHint")}</p>
        {list("top", t("atlas.contribute.top"))}
        {list("heart", t("atlas.contribute.heart"))}
        {list("base", t("atlas.contribute.base"))}
        {list("accords", t("atlas.contribute.accords"))}
        {list("perfumers", t("atlas.contribute.perfumers"))}
        {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
        <p role="status" className="text-sm" style={{ color: COLORS.verdigrisText }}>{sent}</p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={busy}>{t("atlas.contribute.send")}</Button>
        </div>
      </form>
    </section>
  );
}

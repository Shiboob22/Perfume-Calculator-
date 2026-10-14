import React, { useMemo, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { logWear } from "../../lib/wardrobeApi";
import { OCCASIONS, TIMES } from "../../lib/wardrobe/framework";
import { sprayAdvice, suggest, wearable } from "../../lib/wardrobe/suggest";
import { reasonText } from "../../lib/wardrobe/reasons";
import { wearRow } from "../../lib/wardrobe/validate";
import Button from "../kx/Button";
import Field from "../kx/Field";
import Notice from "../kx/Notice";
import { SelectField, inputClass, inputStyle } from "./ui";

// What to wear today: the picker's ranked bottles with their reasons, and a
// quick "wore this" log that records the occasion, time and temperature you
// chose. Everything the picker says is explained; none of it is health advice.
export default function Today({ bottles, wear, today, onLogged, onGoCollection }) {
  const { t } = useI18n();
  const [temp, setTemp] = useState("");
  const [time, setTime] = useState("");
  const [occasion, setOccasion] = useState("");
  const [logging, setLogging] = useState(null); // bottle id with the log form open
  const [sprays, setSprays] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pickable = useMemo(() => wearable(bottles), [bottles]);
  const ranked = useMemo(
    () => suggest(bottles, wear, { tempC: temp === "" ? undefined : Number(temp), time: time || undefined, occasion: occasion || undefined, today }),
    [bottles, wear, temp, time, occasion, today],
  );
  const top = ranked.slice(0, 3);
  const wornToday = new Set(wear.filter((w) => w.worn_on === today).map((w) => w.bottle_id));
  const advice = sprayAdvice(temp === "" ? undefined : Number(temp));

  async function save(bottle) {
    const checked = wearRow({ bottle_id: bottle.id, worn_on: today, occasion, time_of_day: time, temp_c: temp, sprays, note }, today);
    if (checked.errors) return setError(t("wardrobe.collection.checkFields", { fields: checked.errors.map((f) => t(`wardrobe.fields.${f}`)).join(", ") }));
    setError(""); setBusy(true);
    try {
      const saved = await logWear(checked.row);
      onLogged(saved);
      setStatus(t("wardrobe.today.saved", { name: bottle.name }));
      setLogging(null); setSprays(""); setNote("");
    } catch {
      setError(t("wardrobe.today.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const logForm = (bottle) => (
    <form onSubmit={(e) => { e.preventDefault(); save(bottle); }} noValidate className="grid gap-3 mt-3 p-4" style={{ background: COLORS.sand, border: `1px solid ${COLORS.line}` }}>
      <Field label={t("wardrobe.today.sprays")} mono inputMode="numeric" value={sprays} onChange={(e) => setSprays(e.target.value)} dir="ltr" />
      <div>
        <label htmlFor={`wear-note-${bottle.id}`} className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("wardrobe.today.noteField")}</label>
        <textarea id={`wear-note-${bottle.id}`} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} py-2`} style={inputStyle} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy}>{t("wardrobe.today.save")}</Button>
        <Button variant="ghost" onClick={() => { setLogging(null); setError(""); }}>{t("wardrobe.today.cancel")}</Button>
      </div>
    </form>
  );

  if (bottles.filter((b) => b.status !== "wishlist").length === 0) {
    return (
      <section aria-labelledby="today-h">
        <h2 id="today-h" className="font-serif italic text-2xl mb-3" style={{ color: COLORS.ink }}>{t("wardrobe.today.title")}</h2>
        <div className="p-6 text-center" style={{ background: COLORS.card, border: `1px dashed ${COLORS.line}` }}>
          <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: COLORS.inkSoft }}>{t("wardrobe.today.empty")}</p>
          <Button onClick={onGoCollection}>{t("wardrobe.today.goCollection")}</Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="today-h">
      <h2 id="today-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("wardrobe.today.title")}</h2>
      <p className="text-sm mb-5 max-w-prose" style={{ color: COLORS.inkSoft }}>{t("wardrobe.today.lead")}</p>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Field label={t("wardrobe.today.temp")} hint={t("wardrobe.today.tempHint")} mono inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} dir="ltr" />
        <SelectField label={t("wardrobe.today.time")} value={time} onChange={setTime} options={[{ value: "", label: t("wardrobe.today.any") }, ...TIMES.map((x) => ({ value: x, label: t(`wardrobe.times.${x}`) }))]} />
        <SelectField label={t("wardrobe.today.occasion")} value={occasion} onChange={setOccasion} options={[{ value: "", label: t("wardrobe.today.any") }, ...OCCASIONS.map((o) => ({ value: o.id, label: t(`wardrobe.occasions.${o.id}`) }))]} />
      </div>

      <Notice tone="info" className="mb-6">
        {t(`wardrobe.spray.${advice}`)}
      </Notice>

      {top.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("wardrobe.today.none")}</p>
      ) : (
        <>
          <h3 className="text-sm uppercase tracking-[0.15em] rtl:tracking-normal mb-3" style={{ color: COLORS.dim }}>{t("wardrobe.today.picks")}</h3>
          <ol className="grid gap-4">
            {top.map((r, i) => (
              <li key={r.bottle.id} className="p-5" style={{ background: COLORS.card, border: `1px solid ${i === 0 ? COLORS.resin : COLORS.line}` }}>
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="font-serif text-xl" style={{ color: COLORS.ink }}>{r.bottle.name}</h4>
                  <span className="font-mono tabular-nums text-xs" dir="ltr" style={{ color: COLORS.dim }}>{t("wardrobe.today.score", { score: r.score.toFixed(1) })}</span>
                </div>
                <ul className="mt-2 grid gap-1 text-sm list-disc ps-5" style={{ color: COLORS.inkSoft }}>
                  {r.reasons.map((x) => <li key={x.key + (x.cluster ?? x.band ?? x.time ?? "")}>{reasonText(t, x, { occasion })}</li>)}
                </ul>
                {logging === r.bottle.id ? logForm(r.bottle) : (
                  <div className="mt-3">
                    <Button variant={i === 0 ? "primary" : "secondary"} onClick={() => { setLogging(r.bottle.id); setStatus(""); setError(""); }}
                      aria-label={t("wardrobe.today.wearOf", { name: r.bottle.name })}>
                      {wornToday.has(r.bottle.id) ? t("wardrobe.today.wornToday") : t("wardrobe.today.wore")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      {pickable.length > top.length && (
        <div className="mt-6">
          <SelectField label={t("wardrobe.today.other")} value="" onChange={(id) => { if (id) { setLogging(id); setStatus(""); setError(""); } }}
            options={[{ value: "", label: t("wardrobe.today.any") }, ...pickable.map((b) => ({ value: b.id, label: b.name }))]} />
          {logging && !top.some((r) => r.bottle.id === logging) && logForm(pickable.find((b) => b.id === logging) ?? { id: logging, name: "" })}
        </div>
      )}

      <p role="status" className="text-sm mt-4" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-sm mt-2" style={{ color: COLORS.danger }}>{error}</p>}
      <p className="text-xs mt-6" style={{ color: COLORS.dim }}>{t("wardrobe.today.note")}</p>
    </section>
  );
}

import React, { useMemo, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { logWear } from "../../lib/wardrobeApi";
import { OCCASIONS, TIMES } from "../../lib/wardrobe/framework";
import { sprayAdvice, suggest, wearable } from "../../lib/wardrobe/suggest";
import { reasonText } from "../../lib/wardrobe/reasons";
import { wearRow } from "../../lib/wardrobe/validate";
import Button from "../kx/Button";
import { Reveal } from "../../motion";
import Field from "../kx/Field";
import Notice from "../kx/Notice";
import Chip from "../kx/Chip";
import Stepper from "../kx/Stepper";
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

      {/* The board's two controls up front: temperature as a stepper, the occasion as chips. Time of day stays folded. */}
      <Stepper label={t("wardrobe.today.temp")} className="max-w-xs" inputId="wear-temp" value={temp} unit="°C"
        decLabel={t("wardrobe.today.tempLess")} incLabel={t("wardrobe.today.tempMore")}
        onType={setTemp} onStep={(dir) => setTemp(String((temp === "" || !Number.isFinite(Number(temp)) ? 22 : Number(temp)) + dir))}
        after={<p className="text-xs mt-1.5" style={{ color: COLORS.dim }}>{t("wardrobe.today.tempHint")}</p>} />
      <div role="group" aria-labelledby="occ-q" className="mt-5">
        <p id="occ-q" className="text-sm mb-2" style={{ color: COLORS.inkSoft }}>{t("wardrobe.today.question")}</p>
        <div className="flex flex-wrap gap-2">
          <Chip onToggle={() => setOccasion("")} pressed={occasion === ""}>{t("wardrobe.today.any")}</Chip>
          {OCCASIONS.map((o) => <Chip key={o.id} onToggle={() => setOccasion(o.id)} pressed={occasion === o.id}>{t(`wardrobe.occasions.${o.id}`)}</Chip>)}
        </div>
      </div>
      <details className="mt-3 mb-6">
        <summary className="inline-flex items-center min-h-[44px] text-sm cursor-pointer underline underline-offset-4" style={{ color: COLORS.inkSoft }}>{t("wardrobe.today.more")}</summary>
        <div className="mt-2 max-w-xs">
          <SelectField label={t("wardrobe.today.time")} value={time} onChange={setTime} options={[{ value: "", label: t("wardrobe.today.any") }, ...TIMES.map((x) => ({ value: x, label: t(`wardrobe.times.${x}`) }))]} />
        </div>
      </details>

      {top.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("wardrobe.today.none")}</p>
      ) : (
        <>
          {/* One answer, large; the next two quieter beneath it. */}
          {top.slice(0, 1).map((r) => (
            <Reveal as="article" eager key={r.bottle.id} aria-labelledby="today-answer" className="p-6" style={{ background: COLORS.card, border: `1px solid ${COLORS.actionText}` }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm" style={{ color: COLORS.dim }}>{t("wardrobe.today.picks")}</p>
                <span className="font-mono tabular-nums text-xs" dir="ltr" style={{ color: COLORS.dim }}>{t("wardrobe.today.score", { score: r.score.toFixed(1) })}</span>
              </div>
              <h3 id="today-answer" className="font-serif text-3xl sm:text-4xl mt-1" style={{ color: COLORS.ink }}>{r.bottle.name}</h3>
              <ul className="mt-3 grid gap-1 text-sm list-disc ps-5" style={{ color: COLORS.inkSoft }}>
                {r.reasons.map((x) => <li key={x.key + (x.cluster ?? x.band ?? x.time ?? "")}>{reasonText(t, x, { occasion })}</li>)}
              </ul>
              {logging === r.bottle.id ? logForm(r.bottle) : (
                <div className="mt-4">
                  <Button size="lg" onClick={() => { setLogging(r.bottle.id); setStatus(""); setError(""); }}
                    aria-label={t("wardrobe.today.wearOf", { name: r.bottle.name })}>
                    {wornToday.has(r.bottle.id) ? t("wardrobe.today.wornToday") : t("wardrobe.today.wore")}
                  </Button>
                </div>
              )}
            </Reveal>
          ))}
          {top.length > 1 && (
            <>
              <h3 className="text-sm mt-6 mb-1" style={{ color: COLORS.dim }}>{t("wardrobe.today.alternatives")}</h3>
              <ol className="list-none p-0 m-0">
                {top.slice(1).map((r) => (
                  <li key={r.bottle.id} className="py-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-serif text-xl" style={{ color: COLORS.ink }}>{r.bottle.name}</h4>
                        {r.reasons[0] && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{reasonText(t, r.reasons[0], { occasion })}</p>}
                      </div>
                      {logging !== r.bottle.id && (
                        <Button variant="secondary" onClick={() => { setLogging(r.bottle.id); setStatus(""); setError(""); }}
                          aria-label={t("wardrobe.today.wearOf", { name: r.bottle.name })}>
                          {wornToday.has(r.bottle.id) ? t("wardrobe.today.wornToday") : t("wardrobe.today.wore")}
                        </Button>
                      )}
                    </div>
                    {logging === r.bottle.id && logForm(r.bottle)}
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}

      <Notice tone="info" className="mt-6">
        {t(`wardrobe.spray.${advice}`)}
      </Notice>

      {pickable.length > top.length && (
        <div className="mt-6">
          <SelectField label={t("wardrobe.today.other")} value="" onChange={(id) => { if (id) { setLogging(id); setStatus(""); setError(""); } }}
            options={[{ value: "", label: t("wardrobe.today.any") }, ...pickable.map((b) => ({ value: b.id, label: b.name }))]} />
          {logging && !top.some((r) => r.bottle.id === logging) && logForm(pickable.find((b) => b.id === logging) ?? { id: logging, name: "" })}
        </div>
      )}

      <p role="status" className="text-sm mt-4" style={{ color: COLORS.verdigrisText }}><Reveal as="span" eager key={status}>{status}</Reveal></p>
      {error && <p role="alert" className="text-sm mt-2" style={{ color: COLORS.danger }}>{error}</p>}
      <p className="text-xs mt-6" style={{ color: COLORS.dim }}>{t("wardrobe.today.note")}</p>
    </section>
  );
}

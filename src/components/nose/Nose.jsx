import React, { useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { askNose } from "../../lib/aiApi";
import { flagOn } from "../../lib/flags";
import { fragranceHref } from "../../lib/atlas/entities.js";
import { Button, Notice } from "../kx";
import { inputClass, inputStyle } from "../wardrobe/ui";

const STARTERS = ["warm", "fresh", "office", "sweet"];
const MAX = 500;

// The error code the API sends → the nose.errors key.
const ERRORS = { nose_off: "off", nose_limit: "limit", rate_limited: "limit", nose_busy: "busy", feature_locked: "locked" };

// The Nose room (behind the "nose" flag): describe a scent, get real
// fragrances from the catalog with the accords that matched. The AI only
// reads the question and picks among catalog rows; it is never the source of
// a fragrance's notes. Signed-in only. One question at a time, nothing kept.
export default function Nose() {
  const { t, locale } = useI18n();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const atlasOn = flagOn("atlas");

  async function ask(text) {
    const q = text.trim();
    if (busy) return;
    if (q.length < 3) return setError(t("nose.errors.short"));
    setError(""); setResult(null); setBusy(true);
    try {
      setResult(await askNose(q, locale === "ar" ? "ar" : "en"));
    } catch (e) {
      const key = ERRORS[e?.code] ?? (e?.status === 503 && /not configured/i.test(e?.message ?? "") ? "unconfigured" : "failed");
      setError(t(`nose.errors.${key}`));
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-6 pb-12">
      <h1 className="font-serif text-4xl" style={{ color: COLORS.ink }}>{t("nose.title")}</h1>
      <p className="mt-2 text-sm max-w-prose" style={{ color: COLORS.inkSoft }}>{t("nose.lead")}</p>
      <Notice tone="info" className="mt-4">{t("nose.safety")}</Notice>

      <form onSubmit={(e) => { e.preventDefault(); ask(question); }} noValidate className="mt-6 grid gap-3">
        <div>
          <label htmlFor="nose-q" className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("nose.label")}</label>
          <textarea id="nose-q" rows={3} maxLength={MAX} value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(question); } }}
            className={`${inputClass} py-2`} style={inputStyle} aria-describedby="nose-hint nose-privacy" />
          <p id="nose-hint" className="text-xs mt-1" style={{ color: COLORS.dim }}>{t("nose.hint")}</p>
          <p id="nose-privacy" className="text-xs mt-1" style={{ color: COLORS.dim }}>{t("nose.privacy")}</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Button type="submit" loading={busy}>{busy ? t("nose.asking") : t("nose.ask")}</Button>
        </div>
        <div role="group" aria-label={t("nose.startersLabel")} className="flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button key={s} type="button" disabled={busy}
              onClick={() => { const text = t(`nose.starters.${s}`); setQuestion(text); ask(text); }}
              className="px-3 min-h-[44px] text-sm border" style={{ borderColor: COLORS.line, color: COLORS.ink, background: COLORS.card }}>
              {t(`nose.starters.${s}`)}
            </button>
          ))}
        </div>
      </form>

      <div aria-live="polite" className="mt-6">
        {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
        {result?.kind === "none" && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("nose.none")}</p>}
        {result?.kind === "redirect" && (
          <div>
            <p className="text-sm max-w-prose" style={{ color: COLORS.ink }}>{t(`nose.redirect.${result.reason}`)}</p>
            {result.reason === "diy" && <Button as={Link} to="/bench" variant="secondary" className="mt-3">{t("nose.openBench")}</Button>}
          </div>
        )}
        {result?.kind === "picks" && <Picks result={result} atlasOn={atlasOn} t={t} />}
      </div>
    </div>
  );
}

function Picks({ result, atlasOn, t }) {
  return (
    <section aria-labelledby="nose-results-h">
      <h2 id="nose-results-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("nose.heading")}</h2>
      {result.intro && <p className="text-sm mb-4 max-w-prose" style={{ color: COLORS.inkSoft }}>{result.intro}</p>}
      <ul className="grid gap-3 list-none p-0 m-0">
        {result.picks.map((p) => (
          <li key={p.id} className="p-4 border" style={{ borderColor: COLORS.line, background: COLORS.card }}>
            <p className="font-serif text-xl" style={{ color: COLORS.ink }}>{p.name}</p>
            <p className="text-sm" style={{ color: COLORS.dim }}>{[p.brand, p.year, p.family].filter(Boolean).join(" · ")}</p>
            {p.reason && <p className="text-sm mt-2 max-w-prose" style={{ color: COLORS.ink }}>{p.reason}</p>}
            {p.matched?.length > 0 && <p className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{t("nose.matched", { list: p.matched.join(", ") })}</p>}
            {atlasOn && <Link to={fragranceHref(p.id)} className="inline-block mt-2 text-sm underline underline-offset-2 min-h-[44px] leading-[44px]" style={{ color: COLORS.forestDeep }}>{t("nose.openAtlas")}</Link>}
          </li>
        ))}
      </ul>
    </section>
  );
}

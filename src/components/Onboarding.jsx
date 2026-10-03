import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { COLORS, SHAPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { useProfile } from "../lib/useProfile";
import { UNIT_LABELS } from "../lib/calcPrefill";
import FlaconMark from "./FlaconMark";

const UNITS = ["ml", "floz", "g", "oz"];
// Common bottle sizes per unit; any other size can be typed.
const SIZES = { ml: [10, 30, 50, 100], floz: [1, 1.7, 3.4], g: [10, 30, 50, 100], oz: [1, 2, 4] };
const DEFAULT_SIZE = { ml: 50, floz: 1.7, g: 50, oz: 2 };

// First run: three questions (units, usual bottle, language), then the
// calculator opens at the answers. Skipping still marks onboarding done so
// it never comes back; everything can be changed under Account.
export default function Onboarding() {
  const { t, locale, setLocale } = useI18n();
  const { save, keepLocally } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState("ml");
  const [bottle, setBottle] = useState(50);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const size = custom ? Number(custom) : bottle;
  const sizeValid = Number.isFinite(size) && size > 0 && size <= 100000;

  async function finish(skipped) {
    setSaving(true);
    setError(null);
    const answers = { ...(skipped ? {} : { default_unit: unit, default_bottle: size, locale }), onboarded_at: new Date().toISOString() };
    try {
      await save(answers);
    } catch {
      // Not saved (offline, say): use the answers for this visit anyway, so
      // the calculator opens; onboarding asks again on the next visit.
      keepLocally(answers);
      setError(t("onboarding.saveFailed"));
    }
    setSaving(false);
    // Someone who signed in from Pricing's waitlist link goes back there.
    if (window.location.pathname === "/app/account") return navigate("/app/account#pro", { replace: true });
    navigate(skipped ? "/app/calculator" : `/app/calculator?size=${size}&unit=${unit}`, { replace: true });
  }

  const choice = (selected) => ({
    background: selected ? COLORS.amber : COLORS.cardHi,
    color: selected ? COLORS.onAmber : COLORS.ink,
    border: `1px solid ${selected ? COLORS.amber : COLORS.field}`,
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.paper }}>
      {/* Same frame as sign-in, which comes just before it: the wordmark
          on the start edge, the questions on the page, no centred card. */}
      <header className="flex items-center gap-2 px-4 sm:px-8 py-5">
        <FlaconMark size={24} />
        <span className="font-serif italic text-lg" style={{ color: COLORS.forestDeep }}>{t("brand")}</span>
      </header>
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-6 md:py-10">
      <div className="w-full max-w-md">
        {/* The questions really are a sequence, so they get a step indicator. */}
        <p className="text-sm" style={{ color: COLORS.amberDeep }}>{t("onboarding.step", { n: step })}</p>
        <div aria-hidden="true" className="mt-2 mb-6 grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((n) => <span key={n} className="h-1" style={{ background: n <= step ? COLORS.amber : COLORS.line }} />)}
        </div>
        <h1 className="font-serif italic text-3xl sm:text-4xl leading-tight mb-8" style={{ color: COLORS.forestDeep }}>{t("onboarding.title")}</h1>

        <fieldset>
          {step === 1 && (
            <>
              <legend className="text-lg mb-3" style={{ color: COLORS.ink }}>{t("onboarding.unit.question")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {UNITS.map((u) => (
                  <button key={u} type="button" aria-pressed={unit === u} onClick={() => { setUnit(u); setBottle(DEFAULT_SIZE[u]); setCustom(""); }}
                    className={`px-3 py-3 text-sm text-start ${SHAPE.control}`} style={choice(unit === u)}>
                    {t(`onboarding.unit.${u}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: COLORS.inkSoft }}>{t("onboarding.unit.hint")}</p>
            </>
          )}
          {step === 2 && (
            <>
              <legend className="text-lg mb-3" style={{ color: COLORS.ink }}>{t("onboarding.bottle.question")}</legend>
              <div className="flex flex-wrap gap-2">
                {SIZES[unit].map((s) => (
                  <button key={s} type="button" aria-pressed={!custom && bottle === s} onClick={() => { setBottle(s); setCustom(""); }}
                    className={`px-4 py-2 text-sm font-mono ${SHAPE.control}`} style={choice(!custom && bottle === s)}>
                    {t("onboarding.bottle.size", { size: s, unit: UNIT_LABELS[unit] })}
                  </button>
                ))}
              </div>
              <label className="block mt-4 text-sm" style={{ color: COLORS.inkSoft }}>
                {t("onboarding.bottle.custom")}
                <input type="number" inputMode="decimal" min="0" step="any" value={custom} onChange={(e) => setCustom(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg font-mono" style={{ background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` }} />
              </label>
              <p className="text-xs mt-3" style={{ color: COLORS.inkSoft }}>{t("onboarding.bottle.hint")}</p>
            </>
          )}
          {step === 3 && (
            <>
              <legend className="text-lg mb-3" style={{ color: COLORS.ink }}>{t("onboarding.language.question")}</legend>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" lang="en" aria-pressed={locale === "en"} onClick={() => setLocale("en")} className="px-3 py-3 rounded-lg" style={choice(locale === "en")}>English</button>
                <button type="button" lang="ar" aria-pressed={locale === "ar"} onClick={() => setLocale("ar")} className="px-3 py-3 rounded-lg" style={choice(locale === "ar")}>العربية</button>
              </div>
            </>
          )}
        </fieldset>

        {error && <p role="alert" className="text-sm mt-4" style={{ color: COLORS.danger }}>{error}</p>}

        <div className="flex items-center justify-between gap-3 mt-8">
          {step > 1
            ? <button type="button" onClick={() => setStep(step - 1)} className="text-sm underline" style={{ color: COLORS.inkSoft }}>{t("onboarding.back")}</button>
            : <button type="button" disabled={saving} onClick={() => finish(true)} className="text-sm underline" style={{ color: COLORS.inkSoft }}>{t("onboarding.skip")}</button>}
          {step < 3
            ? <button type="button" disabled={step === 2 && !sizeValid} onClick={() => setStep(step + 1)}
                className="px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t("onboarding.next")}</button>
            : <button type="button" disabled={saving} onClick={() => finish(false)}
                className="px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t("onboarding.finish")}</button>}
        </div>
      </div>
      </div>
    </div>
  );
}

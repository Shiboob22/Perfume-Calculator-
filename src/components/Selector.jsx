import React, { useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { QUESTIONS, QUESTION_COUNT } from "../lib/selector/questions";
import { clearDraft, LAST_STEP, loadDraft, saveDraft } from "../lib/selector/draft";
import Choices from "./selector/Choices";
import KnownStep from "./selector/KnownStep";
import Results from "./selector/Results";

const primary = { background: COLORS.amber, color: COLORS.onAmber };
const quiet = { border: `1px solid ${COLORS.field}`, color: COLORS.ink };

const isAnswered = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "");

// /app/selector: the Scent Selector. Step 0 introduces it, 1..N are the
// questions (the last picks known fragrances), N+1 shows the profile and
// matches. Everything is kept in a local draft until the user starts over.
export default function Selector({ onSelectPerfume }) {
  const { t } = useI18n();
  const draft = useMemo(() => loadDraft(), []);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(draft?.answers ?? {});
  const [known, setKnown] = useState(draft?.known ?? []);
  const heading = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    // Not on the intro: it opens on step 0 and would overwrite where the user was.
    if (step > 0) saveDraft({ step, answers, known });
  }, [step, answers, known]);
  // Move focus to the step heading on each change so keyboard and screen
  // reader users land on the new question, not at the top of the page.
  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [step]);

  const restart = () => { clearDraft(); setAnswers({}); setKnown([]); setStep(0); };
  const hasDraft = !!draft && (Object.keys(draft.answers).length > 0 || draft.known.length > 0 || draft.step > 0);
  const wrap = "max-w-3xl mx-auto px-4 sm:px-8 py-8";

  if (step === 0) {
    return (
      <div className={wrap}>
        <p className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t("selector.intro.kicker")}</p>
        <h2 ref={heading} tabIndex={-1} className="font-serif italic text-4xl mt-2 outline-none" style={{ color: COLORS.ink }}>{t("selector.title")}</h2>
        <p className="mt-4 max-w-prose text-lg leading-relaxed" style={{ color: COLORS.inkSoft }}>{t("selector.intro.lede")}</p>
        <p className="mt-3 max-w-prose text-sm" style={{ color: COLORS.dim }}>{t("selector.intro.note")}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {hasDraft ? (
            <>
              <button type="button" onClick={() => setStep(Math.min(Math.max(draft.step, 1), LAST_STEP))} className="px-5 min-h-[48px] rounded" style={primary}>{t("selector.intro.resume")}</button>
              <button type="button" onClick={restart} className="px-4 min-h-[48px] rounded underline underline-offset-4" style={{ color: COLORS.inkSoft }}>{t("selector.restart")}</button>
              <p className="w-full text-xs" style={{ color: COLORS.dim }}>{t("selector.intro.resumeNote")}</p>
            </>
          ) : (
            <button type="button" onClick={() => setStep(1)} className="px-5 min-h-[48px] rounded" style={primary}>{t("selector.intro.begin")}</button>
          )}
        </div>
      </div>
    );
  }

  if (step === LAST_STEP) {
    return (
      <div className={wrap}>
        <h1 ref={heading} tabIndex={-1} className="sr-only">{t("selector.title")}</h1>
        <Results answers={answers} known={known} onEdit={() => setStep(1)} onRestart={restart} onSelectPerfume={onSelectPerfume} />
      </div>
    );
  }

  const q = QUESTIONS[step - 1];
  const value = answers[q.id];
  const answered = q.kind === "known" ? known.length > 0 : isAnswered(value);
  const last = step === QUESTION_COUNT;
  const hint = q.kind === "multi" ? (q.max ? t("selector.chooseUpTo", { max: q.max }) : t("selector.chooseAny")) : q.kind === "known" ? t("selector.optional") : t("selector.chooseOne");

  return (
    <div className={wrap}>
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-4 text-xs" style={{ color: COLORS.dim }}>
          <span>{t(`selector.sections.${q.section}`)}</span>
          <span className="font-mono">{t("selector.stepOf", { current: step, total: QUESTION_COUNT })}</span>
        </div>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={QUESTION_COUNT} aria-valuenow={step}
          aria-label={t("selector.stepOf", { current: step, total: QUESTION_COUNT })} className="mt-2 h-1.5" style={{ background: COLORS.sand }}>
          <div className="h-1.5 motion-safe:transition-[width] duration-200" style={{ width: `${(step / QUESTION_COUNT) * 100}%`, background: COLORS.amber }} />
        </div>
      </div>

      <fieldset className="min-w-0">
        <legend className="w-full">
          <h2 ref={heading} tabIndex={-1} className="font-serif italic text-3xl leading-snug outline-none" style={{ color: COLORS.ink }}>{t(`selector.q.${q.id}.title`)}</h2>
          <span className="block mt-1 mb-4 text-sm" style={{ color: COLORS.dim }}>{hint}</span>
        </legend>
        {q.kind === "known"
          ? <KnownStep known={known} onChange={setKnown} />
          : <Choices question={q} value={value} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />}
      </fieldset>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setStep(step - 1)} className="px-4 min-h-[48px] rounded" style={quiet}>{t("selector.back")}</button>
        <button type="button" onClick={() => setStep(step + 1)} className="px-6 min-h-[48px] rounded"
          style={answered || last ? primary : quiet}>
          {last ? t("selector.seeResults") : answered ? t("selector.next") : t("selector.skip")}
        </button>
      </div>
      <div className="mt-6">
        <button type="button" onClick={restart} className="text-xs underline underline-offset-4 min-h-[44px]" style={{ color: COLORS.dim }}>{t("selector.restart")}</button>
      </div>
    </div>
  );
}

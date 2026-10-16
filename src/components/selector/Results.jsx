import React, { useEffect, useMemo, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { buildUserProfile, familyBars, hasSignal, identityOf, recommend, signatureOf } from "../../lib/selector";
import { targetAccords } from "../../lib/selector";
import { fetchCandidates } from "../../lib/selector/api";

const pct = (v) => (v === null || v === undefined ? null : Math.round(v * 100));
const avg = (list) => { const v = list.filter((x) => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

function Bar({ value, label }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate" style={{ color: COLORS.inkSoft }}>{label}</span>
      <span className="flex-1 h-2" style={{ background: COLORS.sand }} aria-hidden="true">
        <span className="block h-2" style={{ width: `${value}%`, background: COLORS.oil }} />
      </span>
      <span className="w-10 text-end font-mono text-xs" style={{ color: COLORS.dim }}>{value}</span>
    </div>
  );
}

function Block({ title, note, children }) {
  return (
    <div className="py-4 border-t" style={{ borderColor: COLORS.line }}>
      <h3 className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{title}</h3>
      <p className="mt-2 font-serif italic text-2xl leading-snug" style={{ color: COLORS.ink }}>{children}</p>
      <p className="mt-1 text-xs" style={{ color: COLORS.dim }}>{note}</p>
    </div>
  );
}

function Alignment({ label, value }) {
  const { t } = useI18n();
  return (
    <div>
      <dt className="text-xs" style={{ color: COLORS.dim }}>{label}</dt>
      <dd className="mt-1">
        {value === null ? <span className="text-xs" style={{ color: COLORS.dim }}>{t("selector.results.notApplicable")}</span> : (
          <span className="flex items-center gap-2">
            <span className="flex-1 h-1.5" style={{ background: COLORS.sand }} aria-hidden="true"><span className="block h-1.5" style={{ width: `${value}%`, background: COLORS.amber }} /></span>
            <span className="font-mono text-xs w-10 text-end" style={{ color: COLORS.inkSoft }}>{t("selector.results.alignment", { value })}</span>
          </span>
        )}
      </dd>
    </div>
  );
}

export default function Results({ answers, known, onEdit, onRestart, onSelectPerfume }) {
  const { t, locale } = useI18n();
  const user = useMemo(() => buildUserProfile(answers, known), [answers, known]);
  const signal = hasSignal(user);
  const [load, setLoad] = useState({ status: "loading", pool: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!signal) return undefined;
    let live = true;
    setLoad({ status: "loading", pool: [] });
    fetchCandidates(targetAccords(user))
      .then((pool) => live && setLoad({ status: "done", pool }))
      .catch(() => live && setLoad({ status: "error", pool: [] }));
    return () => { live = false; };
  }, [user, signal, attempt]);

  const outcome = useMemo(() => (load.status === "done" ? recommend(user, load.pool) : null), [user, load]);
  const list = (items) => new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);

  const identity = identityOf(user);
  const identityName = identity && t("selector.results.identityName", {
    modifier: identity.modifier ? t(`selector.dim.${identity.modifier.dim}.${identity.modifier.high ? "high" : "low"}`) : "",
    families: identity.families.map((f) => t(`selector.family.${f}`)).join(" "),
  }).trim();
  const words = signatureOf(user).map((w) => t(`selector.dim.${w.dim}.${w.high ? "high" : "low"}`));
  const intents = user.intents.map((i) => t(`selector.q.intent.options.${i}`));
  const bars = familyBars(user).filter((b) => b.value > 0).slice(0, 5);

  const reasonText = (r) => {
    const arg = r.arg;
    const vars = {
      family: arg && t(`selector.family.${arg}`), dim: arg && t(`selector.dim.${arg}.label`).toLowerCase(), name: arg,
      use: arg && t(`selector.q.use.options.${arg}`).toLowerCase(), climate: arg && t(`selector.q.climate.options.${arg}`).toLowerCase(),
      projection: arg && t(`selector.q.projection.options.${arg}`).toLowerCase(),
    };
    return t(`selector.reason.${r.key}`, vars);
  };
  const cautionText = (c) => t(`selector.caution.${c.key}`, { trait: c.arg && t(`selector.traitWord.${c.arg}`), basis: c.arg && t(`selector.basis.${c.arg}`) });

  if (!signal) return <Notice title={t("selector.noSignal.title")} text={t("selector.noSignal.text")} action={t("selector.noSignal.action")} onAction={onEdit} />;

  return (
    <div>
      <h2 className="font-serif italic text-3xl" style={{ color: COLORS.ink }}>{t("selector.results.title")}</h2>
      <div className="mt-4">
        <Block title={t("selector.results.identity")} note={t("selector.results.identityNote")}>{identityName || t("selector.results.notStated")}</Block>
        <Block title={t("selector.results.signature")} note={t("selector.results.signatureNote")}>
          {words.length ? list(words) : t("selector.results.notStated")}
        </Block>
        <Block title={t("selector.results.intent")} note={t("selector.results.intentNote")}>
          {intents.length ? list(intents) : t("selector.results.notStated")}
        </Block>
        {bars.length > 0 && (
          <div className="py-4 border-t" style={{ borderColor: COLORS.line }}>
            <h3 className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal mb-2" style={{ color: COLORS.dim }}>{t("selector.results.familyBars")}</h3>
            <div className="grid gap-1.5">{bars.map((b) => <Bar key={b.key} value={b.value} label={t(`selector.family.${b.key}`)} />)}</div>
          </div>
        )}
        {user.projectionKey && (
          <p className="py-3 border-t text-sm" style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}>
            {t("selector.results.projection")}: {t(`selector.q.projection.options.${user.projectionKey}`)}
          </p>
        )}
      </div>

      <h2 className="font-serif italic text-3xl mt-8 mb-2" style={{ color: COLORS.ink }}>{t("selector.results.topMatches")}</h2>
      <div aria-live="polite">
        {load.status === "loading" && <p className="py-6 text-sm font-mono" style={{ color: COLORS.inkSoft }}>{t("selector.loading")}</p>}
        {load.status === "error" && (
          <div role="alert" className="py-6">
            <p style={{ color: COLORS.danger }}>{t("selector.error")}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 px-4 min-h-[44px] rounded-none" style={{ border: `1px solid ${COLORS.field}`, color: COLORS.ink }}>{t("selector.retry")}</button>
          </div>
        )}
      </div>
      {outcome && outcome.status !== "ok" && (
        outcome.status === "empty"
          ? <Notice title={t("selector.empty.title")} text={t("selector.empty.text")} action={t("selector.empty.action")} onAction={onEdit} />
          : <Notice title={t("selector.noSignal.title")} text={t("selector.noSignal.text")} action={t("selector.noSignal.action")} onAction={onEdit} />
      )}
      {outcome?.status === "ok" && (
        <ol className="grid gap-4">
          {outcome.matches.map((m, i) => (
            <li key={m.profile.id} className="p-5 border" style={{ borderColor: COLORS.ink, background: COLORS.card }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-sans font-medium text-lg leading-snug break-words" style={{ color: COLORS.ink }}>
                    <span className="font-serif italic me-2" style={{ color: COLORS.dim }}>{i + 1}</span>{m.profile.name}
                  </h3>
                  {m.profile.brand && <p className="text-sm" style={{ color: COLORS.dim }}>{t("selector.results.byBrand", { brand: m.profile.brand })}</p>}
                </div>
                <p className="shrink-0 font-mono text-sm px-2 py-1" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
                  {t("selector.results.matchPercent", { percent: m.percent })}
                </p>
              </div>
              <dl className="grid sm:grid-cols-3 gap-x-5 gap-y-3 mt-4">
                <Alignment label={t("selector.results.family")} value={pct(m.components.family)} />
                <Alignment label={t("selector.results.sensory")} value={pct(m.components.sensory)} />
                <Alignment label={t("selector.results.moodContext")} value={pct(avg([m.components.mood, m.components.occasion, m.components.climate, m.components.intensity]))} />
              </dl>
              {m.reasons.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t("selector.results.why")}</h4>
                  <ul className="mt-1 text-[15px] list-disc ps-5" style={{ color: COLORS.inkSoft }}>{m.reasons.map((r, k) => <li key={k}>{reasonText(r)}</li>)}</ul>
                </div>
              )}
              {m.cautions.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t("selector.results.watch")}</h4>
                  <ul className="mt-1 text-sm list-disc ps-5" style={{ color: COLORS.inkSoft }}>{m.cautions.map((c, k) => <li key={k}>{cautionText(c)}</li>)}</ul>
                </div>
              )}
              {onSelectPerfume && (
                <button type="button" onClick={() => onSelectPerfume(m.profile.row)} className="mt-4 px-4 min-h-[44px] rounded-none text-sm"
                  style={{ border: `1px solid ${COLORS.actionText}`, color: COLORS.actionText }}>{t("selector.results.openCalculator")}</button>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-6 text-xs max-w-prose" style={{ color: COLORS.dim }}>{t("selector.results.method")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onEdit} className="px-4 min-h-[44px] rounded-none" style={{ border: `1px solid ${COLORS.field}`, color: COLORS.ink }}>{t("selector.empty.action")}</button>
        <button type="button" onClick={onRestart} className="px-4 min-h-[44px] rounded-none underline underline-offset-4" style={{ color: COLORS.inkSoft }}>{t("selector.restart")}</button>
      </div>
    </div>
  );
}

function Notice({ title, text, action, onAction }) {
  return (
    <div className="py-8" role="status">
      <h3 className="font-serif italic text-2xl" style={{ color: COLORS.ink }}>{title}</h3>
      <p className="mt-2 max-w-prose" style={{ color: COLORS.inkSoft }}>{text}</p>
      <button type="button" onClick={onAction} className="mt-4 px-4 min-h-[44px] rounded-none" style={{ border: `1px solid ${COLORS.field}`, color: COLORS.ink }}>{action}</button>
    </div>
  );
}

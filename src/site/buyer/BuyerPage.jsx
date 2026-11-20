import React, { useCallback, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Link } from "../../motion";
import { Button } from "../../components/kx";
import SaveState from "../../components/kx/SaveState";
import { COLORS, TYPE } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { brandName } from "../../brand";
import { TAGS } from "../../lib/noteTags";
import { tierFor } from "../../lib/calc/strength";
import { getBottle, sendFeedback, orderAgain } from "../../lib/buyerApi";

const LASTS = ["hours", "half", "day"];
const ERRORS = ["rate_limited", "invalid_feedback", "invalid_reorder", "feedback_closed", "reorder_full"];
const errText = (t, code) => (code === "network" ? t("buyer.network") : t(`errors.${ERRORS.includes(code) ? code : "server_error"}`));
const LANG_KEY = "kyphira.buyerLang";
const stored = () => { try { return localStorage.getItem(LANG_KEY); } catch { return null; } };
const store = (v) => { try { localStorage.setItem(LANG_KEY, v); } catch { /* private mode */ } };

// /o/<code>: the page a buyer opens from the QR on their bottle's label
// (0040). No sign-in, no site menu: the seller's shop at the top, the
// bottle, a short answer for the seller, "Order again", and a quiet
// "Made with Kyphira" at the foot. Arabic when the phone is in Arabic
// (or the buyer chose it), with a switch; never indexed.
export default function BuyerPage() {
  const { code = "" } = useParams();
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const [bottle, setBottle] = useState(undefined); // undefined = loading, null = not found
  const [loadError, setLoadError] = useState(false);

  // First visit on /o/<code> from a phone in Arabic opens the Arabic page.
  const choice = stored();
  const wantsAr = !ar && (choice ? choice === "ar" : typeof navigator !== "undefined" && /^ar\b/i.test(navigator.language || ""));

  useEffect(() => {
    document.title = `${t("buyer.title")} · ${brandName(locale)}`;
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.setAttribute("name", "robots"); document.head.appendChild(robots); }
    robots.setAttribute("content", "noindex, nofollow");
  }, [t, locale]);

  const load = useCallback(() => {
    setLoadError(false);
    setBottle(undefined);
    getBottle(code).then(setBottle, (e) => (e?.code === "not_found" ? setBottle(null) : setLoadError(true)));
  }, [code]);
  useEffect(() => { if (!wantsAr) load(); }, [load, wantsAr]);

  if (wantsAr) return <Navigate to={`/ar/o/${code}`} replace />;

  const other = ar ? "en" : "ar";
  return (
    <div dir={ar ? "rtl" : "ltr"} lang={locale} className="min-h-screen flex flex-col" style={{ background: COLORS.paper, color: COLORS.ink }}>
      <header className="max-w-xl w-full mx-auto px-4 pt-4 flex justify-end">
        <Link to={ar ? `/o/${code}` : `/ar/o/${code}`} onClick={() => store(other)} lang={other} title={t("buyer.languageLabel")}
          className="min-h-[44px] inline-flex items-center text-sm underline underline-offset-4" style={{ color: COLORS.ink }} data-buyer-lang>
          {t("buyer.language")}
        </Link>
      </header>
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pb-10">
        {bottle === undefined && !loadError && <p role="status" className="mt-10" style={{ color: COLORS.inkSoft }}>{t("buyer.loading")}</p>}
        {loadError && (
          <div className="mt-10">
            <p role="alert">{t("buyer.loadFailed")}</p>
            <Button variant="secondary" className="mt-4" onClick={load}>{t("buyer.retry")}</Button>
          </div>
        )}
        {bottle === null && <p role="alert" className="mt-10" data-buyer-missing>{t("buyer.notFound")}</p>}
        {bottle && <Bottle code={code} bottle={bottle} onSaved={setBottle} t={t} locale={locale} />}
      </main>
      <footer className="max-w-xl w-full mx-auto px-4 py-6 text-xs" style={{ color: COLORS.dim, borderTop: `1px solid ${COLORS.line}` }}>
        <Link to={ar ? "/ar" : "/"} className="underline underline-offset-4 min-h-[24px] inline-flex items-center">
          {t("buyer.madeWith", { brand: brandName(locale) })}
        </Link>
      </footer>
    </div>
  );
}

function Bottle({ code, bottle, onSaved, t, locale }) {
  const date = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", numberingSystem: "latn" });
  return (
    <>
      <div className="mt-8">
        {bottle.shop && <p className="text-sm" style={{ color: COLORS.actionText }} data-buyer-shop><bdi>{t("buyer.from", { shop: bottle.shop })}</bdi></p>}
        <h1 className={`${TYPE.title} mt-2`} dir="auto">{bottle.scent}</h1>
        <p className="mt-3" style={{ color: COLORS.inkSoft }}>
          {/* The tier name stays Latin in Arabic: isolate it so the Arabic sentence keeps its order. */}
          <bdi>{t("buyer.bottle", { size: bottle.size_ml, pct: bottle.strength_pct, tier: `\u2068${tierFor(bottle.strength_pct).name}\u2069` })}</bdi>
        </p>
        {bottle.bottled_on && <p className="text-sm mt-1" style={{ color: COLORS.dim }}>{t("buyer.bottled", { date: date(bottle.bottled_on) })}</p>}
      </div>
      <Feedback code={code} bottle={bottle} onSaved={onSaved} t={t} />
      <OrderAgain code={code} shop={bottle.shop} t={t} />
    </>
  );
}

function Feedback({ code, bottle, onSaved, t }) {
  const prev = bottle.feedback;
  const [rating, setRating] = useState(prev?.rating ?? 0);
  const [lasts, setLasts] = useState(prev?.lasts ?? null);
  const [tags, setTags] = useState(prev?.tags ?? []);
  const [note, setNote] = useState(prev?.note ?? "");
  const [state, setState] = useState(null); // { kind, text }
  const chip = (on) => ({ border: `1px solid ${on ? COLORS.actionText : COLORS.line}`, background: on ? COLORS.sand : "transparent", color: on ? COLORS.ink : COLORS.inkSoft });

  if (!bottle.can_edit) {
    return <p className="mt-10 p-4 rounded" style={{ border: `1px solid ${COLORS.line}` }}>{t("buyer.closed")}</p>;
  }

  async function submit(e) {
    e.preventDefault();
    if (!rating && !lasts && !tags.length && !note.trim()) { setState({ kind: "failed", text: t("buyer.empty") }); return; }
    setState({ kind: "working", text: t("buyer.sending") });
    try {
      const next = await sendFeedback(code, { rating: rating || null, lasts, tags: TAGS.filter((x) => tags.includes(x)), note: note.trim() || null });
      onSaved(next);
      setState({ kind: "saved", text: bottle.shop ? t("buyer.sentTo", { shop: bottle.shop }) : t("buyer.sent") });
    } catch (err) {
      setState({ kind: "failed", text: errText(t, err?.code) });
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 flex flex-col gap-6" aria-labelledby="buyer-ask" data-buyer-feedback>
      <div>
        <h2 id="buyer-ask" className="font-serif text-2xl">{t("buyer.ask.title")}</h2>
        <p className="mt-1 text-sm" style={{ color: COLORS.inkSoft }}>{t("buyer.ask.lead")}</p>
      </div>
      <div role="group" aria-label={t("buyer.rating")} className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-pressed={rating >= n} aria-label={t("buyer.ratingN", { count: n })}
            onClick={() => { setRating(rating === n ? 0 : n); setState(null); }}
            className="w-12 h-12 rounded-full text-[15px] tabular-nums"
            style={{ border: `1px solid ${rating >= n ? COLORS.amber : COLORS.line}`, background: rating >= n ? COLORS.amber : "transparent", color: rating >= n ? COLORS.onAmber : COLORS.inkSoft }}>
            {n}
          </button>
        ))}
      </div>
      <fieldset>
        <legend className="text-sm mb-2" style={{ color: COLORS.inkSoft }}>{t("buyer.lasts.label")}</legend>
        <div className="flex flex-wrap gap-2">
          {LASTS.map((k) => (
            <button key={k} type="button" aria-pressed={lasts === k} onClick={() => { setLasts(lasts === k ? null : k); setState(null); }}
              className="min-h-[44px] px-3.5 text-[14px] rounded" style={chip(lasts === k)}>{t(`buyer.lasts.${k}`)}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm mb-2" style={{ color: COLORS.inkSoft }}>{t("buyer.tags")}</legend>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((g) => {
            const on = tags.includes(g);
            return (
              <button key={g} type="button" aria-pressed={on} onClick={() => { setTags(on ? tags.filter((x) => x !== g) : [...tags, g]); setState(null); }}
                className="min-h-[44px] px-3 text-[14px] rounded" style={chip(on)}>{t(`journal.page.tag.${g}`)}</button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="buyer-note" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("buyer.note")}</label>
        <input id="buyer-note" type="text" dir="auto" maxLength={280} value={note} autoComplete="off"
          onChange={(e) => { setNote(e.target.value); setState(null); }} placeholder={t("buyer.notePh")}
          className="px-3 py-2 rounded border text-base min-h-[48px]" style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={state?.kind === "working"}>{prev ? t("buyer.update") : t("buyer.send")}</Button>
        <SaveState state={state?.kind}>{state?.text}</SaveState>
      </div>
    </form>
  );
}

function OrderAgain({ code, shop, t }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState(null);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setState({ kind: "working", text: t("buyer.sending") });
    try {
      await orderAgain(code, { name, phone });
      setDone(true);
      setState({ kind: "saved", text: shop ? t("buyer.again.sentTo", { shop }) : t("buyer.again.sent") });
    } catch (err) {
      setState({ kind: "failed", text: errText(t, err?.code) });
    }
  }

  const input = "px-3 py-2 rounded border text-base min-h-[48px]";
  const style = { borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink };
  return (
    <section aria-labelledby="buyer-again" className="mt-12 pt-8" style={{ borderTop: `1px solid ${COLORS.line}` }} data-buyer-again>
      <h2 id="buyer-again" className="font-serif text-2xl">{t("buyer.again.title")}</h2>
      <p className="mt-1 text-sm" style={{ color: COLORS.inkSoft }}>{t("buyer.again.lead")}</p>
      {!open && !done && <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>{t("buyer.again.open")}</Button>}
      {open && !done && (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="buyer-name" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("buyer.again.name")}</label>
            <input id="buyer-name" required maxLength={120} autoComplete="name" dir="auto" value={name} onChange={(e) => setName(e.target.value)} className={input} style={style} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="buyer-phone" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("buyer.again.phone")}</label>
            <input id="buyer-phone" required type="tel" inputMode="tel" maxLength={40} autoComplete="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${input} text-start`} style={style} />
          </div>
          <div><Button type="submit" loading={state?.kind === "working"}>{t("buyer.again.send")}</Button></div>
        </form>
      )}
      <SaveState state={state?.kind} className="mt-3">{state?.text}</SaveState>
    </section>
  );
}


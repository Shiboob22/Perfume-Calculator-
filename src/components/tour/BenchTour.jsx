import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "../../lib/theme";
import { BRAND } from "../../brand";
import { reduced } from "../../motion/env.js";
import { TOUR_STEPS, TOUR_SEEN_KEY, placeCard, tourKeyAction, tourSeen } from "../../lib/tour";

// The Bench's guided tour (Bench SaaS Phase 7, prototype startTour / goTour /
// measureTour / tourVals). Six stops; each sets the page up (the Bench does
// that, in `show`), scrolls to its [data-tour] target and rings it in amber
// with the rest of the page dimmed. Clicks pass through the dim. The card
// says "n / 6", one title, one line and Back / Next (Finish) / Skip; beside
// the target on wide screens, at the bottom on phones. Escape skips, the
// arrows step (mirrored in RTL). Finishing or skipping hands the snapshot
// back to the Bench (`restore`), which puts everything back as it was.
//
// The tour never touches the user's plan: the cost stop is a preview drawn
// in the browser, and the upgrade stop only opens the sheet.

const N = TOUR_STEPS.length;
const PAD = 8;
const CARD_W = 360;
const PHONE = "(max-width: 767px)";

const readLocal = () => { try { return localStorage.getItem(TOUR_SEEN_KEY); } catch { return null; } };

/**
 * The tour's state machine. `capture()` returns the page state to put back,
 * `show(key, snap)` sets the page up for a stop, `restore(snap)` puts it
 * back. `profile` is useProfile(): signed in, "seen" is kept on the server
 * (profiles.bench_tour_at), and always in this browser too.
 */
export function useBenchTour({ capture, show, restore, profile }) {
  const [tour, setTourState] = useState(null); // { i, snap } while open
  const now = useRef(null);
  const setTour = useCallback((v) => { now.current = v; setTourState(v); }, []);
  const fns = useRef({ capture, show, restore, profile });
  fns.current = { capture, show, restore, profile };

  const start = useCallback(() => { if (!now.current) setTour({ i: 0, snap: fns.current.capture() }); }, [setTour]);
  const go = useCallback((i) => { const s = now.current; if (s && i >= 0 && i < N) setTour({ ...s, i }); }, [setTour]);
  const end = useCallback(() => {
    const s = now.current;
    if (!s) return;
    setTour(null);
    fns.current.restore(s.snap);
    try { localStorage.setItem(TOUR_SEEN_KEY, "1"); } catch { /* the tour may show again next visit */ }
    const p = fns.current.profile;
    if (p?.loaded && !p.failed && !p.profile?.bench_tour_at) {
      const at = new Date().toISOString();
      p.save({ bench_tour_at: at }).catch(() => p.keepLocally({ bench_tour_at: at }));
    }
  }, [setTour]);

  useEffect(() => { if (tour) fns.current.show(TOUR_STEPS[tour.i], tour.snap); }, [tour?.i, tour?.snap]); // eslint-disable-line react-hooks/exhaustive-deps

  const seen = tourSeen(profile?.profile, readLocal());
  return { tour, start, go, end, seen, ready: Boolean(profile?.loaded) };
}

const inField = (el) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

/** The spotlight and the card for stop `i`. */
// `onJournal` follows the last stop's "Open the Journal" link: the Bench
// ends the tour (puts its state back) before it leaves the page.
export function TourLayer({ i, t, rtl, onGo, onEnd, onJournal, journalHref = "/journal" }) {
  const key = TOUR_STEPS[i];
  const [target, setTarget] = useState(null);
  const [rect, setRect] = useState(null);
  const [cardH, setCardH] = useState(260);
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia?.(PHONE).matches);
  const card = useRef(null);
  const last = i === N - 1;
  const anim = !reduced();

  // Find the stop's target (it may only appear once its panel opens), then scroll to it.
  useEffect(() => {
    let tries = 0;
    let timer = 0;
    setTarget(null);
    const find = () => {
      const el = [...document.querySelectorAll(`[data-tour="${key}"]`)].find(visible);
      if (!el) { if (tries++ < 40) timer = setTimeout(find, 50); return; }
      setTarget(el);
      const tall = el.getBoundingClientRect().height > window.innerHeight * 0.75;
      try { el.scrollIntoView({ block: tall ? "start" : "center", behavior: anim ? "smooth" : "auto" }); } catch { el.scrollIntoView(); }
    };
    find();
    return () => clearTimeout(timer);
  }, [key, anim]);

  // Follow it: measure on scroll and resize (one read per frame), and for a
  // short while after a stop changes, while the scroll and any panel settle.
  useEffect(() => {
    if (!target) return undefined;
    let queued = 0;
    let settle = 0;
    let frames = 0;
    const measure = () => {
      const r = target.getBoundingClientRect();
      const h = card.current?.offsetHeight;
      setRect((o) => (o && o.top === r.top && o.left === r.left && o.width === r.width && o.height === r.height ? o
        : { top: r.top, left: r.left, width: r.width, height: r.height }));
      if (h) setCardH(h);
    };
    const onMove = () => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; measure(); }); };
    const again = () => { measure(); if (++frames < 40) settle = requestAnimationFrame(again); };
    settle = requestAnimationFrame(again);
    const mq = window.matchMedia?.(PHONE);
    const onMq = () => setPhone(Boolean(mq?.matches));
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    mq?.addEventListener?.("change", onMq);
    return () => {
      cancelAnimationFrame(queued); cancelAnimationFrame(settle);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      mq?.removeEventListener?.("change", onMq);
    };
  }, [target]);

  // Escape skips; the arrows step through, mirrored in RTL.
  useEffect(() => {
    const onKey = (e) => {
      const act = tourKeyAction(e.key, rtl, inField(e.target));
      if (!act) return;
      e.preventDefault();
      if (act === "skip") onEnd();
      else if (act === "next") (last ? onEnd() : onGo(i + 1));
      else onGo(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, rtl, last, onGo, onEnd]);

  // The card takes focus when the tour opens and whenever focus would be lost.
  useLayoutEffect(() => {
    const a = document.activeElement;
    if (!a || a === document.body || !document.contains(a)) card.current?.focus({ preventScroll: true });
  });
  useEffect(() => { card.current?.focus({ preventScroll: true }); }, []);

  // In a modal sheet (the upgrade stop) the page outside it is inert: draw inside it.
  const host = target?.closest("dialog[open]") || document.body;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const ease = "350ms cubic-bezier(.65,0,.35,1)";
  const spot = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, borderRadius: 6,
      boxShadow: `0 0 0 2px ${COLORS.amber}, 0 0 0 9999px rgba(16,14,11,.58)`,
      transition: anim ? `top ${ease}, left ${ease}, width ${ease}, height ${ease}` : "none" }
    : { inset: 0, background: "rgba(16,14,11,.58)" };
  const pos = phone
    ? { left: 12, right: 12, bottom: "calc(16px + env(safe-area-inset-bottom))" }
    : (() => {
      const p = placeCard(rect, { vw, vh, cw: CARD_W, ch: cardH, rtl });
      return { width: CARD_W, top: p.top, left: p.left, transition: anim ? `top ${ease}, left ${ease}` : "none" };
    })();
  const [title, body] = [t(`tour.steps.${i}.0`), t(`tour.steps.${i}.1`, { name: rtl ? BRAND.nameAr : BRAND.name })];

  const ghost = { color: COLORS.dim };
  return createPortal(
    <>
      <div aria-hidden="true" data-tour-spot={key} className="kx-tour-spot fixed pointer-events-none" style={{ zIndex: 80, ...spot }} />
      <div ref={card} role="dialog" aria-modal="false" aria-label={t("tour.label")} aria-describedby="kx-tour-body" tabIndex={-1}
        data-tour-card={key} dir={rtl ? "rtl" : "ltr"} className="kx-tour-card kx-grain fixed box-border px-5 pt-4 pb-[18px] outline-none"
        style={{ zIndex: 81, ...pos, borderRadius: 2, backgroundColor: COLORS.paper, border: `1px solid ${COLORS.ink}`, boxShadow: "0 30px 60px -20px rgba(0,0,0,.5)", color: COLORS.ink }}>
        <div className="flex items-center justify-between gap-3">
          <span dir="ltr" data-tour-count className="text-xs tracking-[0.12em]" style={{ fontFamily: "'Share Tech Mono', ui-monospace, monospace", color: COLORS.actionText }}>
            {t("tour.count", { n: i + 1, m: N })}
          </span>
          <button type="button" onClick={onEnd} className="min-h-[36px] text-[13px] underline underline-offset-4" style={ghost}>{t("tour.skip")}</button>
        </div>
        <div aria-hidden="true" className="flex gap-1 mt-1.5">
          {TOUR_STEPS.map((s, j) => <span key={s} data-pip={j <= i ? "on" : "off"} className="flex-1 h-[3px]" style={{ background: j <= i ? COLORS.amber : COLORS.line }} />)}
        </div>
        <p className="mt-3.5 font-serif text-[26px] leading-[1.15]">{title}</p>
        <p id="kx-tour-body" aria-live="polite" className="mt-1.5 text-[15px] leading-normal" style={{ color: COLORS.inkSoft, textWrap: "pretty" }}>{body}</p>
        {last && (
          <a href={journalHref} onClick={(e) => { e.preventDefault(); onJournal(); }} className="inline-flex items-center min-h-[40px] mt-1 text-sm underline-offset-4" style={{ color: COLORS.actionText }}>
            {t("tour.journal")} <span aria-hidden="true" className="ms-1">{rtl ? "←" : "→"}</span>
          </a>
        )}
        <div className="flex gap-2 justify-end mt-3.5">
          <button type="button" onClick={() => onGo(i - 1)} disabled={i === 0}
            className="min-h-[44px] px-4 text-[15px] rounded-[2px] disabled:opacity-40" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink }}>{t("tour.back")}</button>
          <button type="button" onClick={() => (last ? onEnd() : onGo(i + 1))} data-tour-next
            className="min-h-[44px] px-5 text-[15px] font-medium rounded-[2px]" style={{ background: COLORS.ink, color: COLORS.paper, border: `1px solid ${COLORS.ink}` }}>
            {t(last ? "tour.done" : "tour.next")}
          </button>
        </div>
      </div>
    </>,
    host,
  );
}

/** "Take the tour", under the Bench's heading. */
export function TakeTour({ onStart, t }) {
  return (
    <button type="button" onClick={onStart} data-take-tour
      className="mt-2.5 min-h-[40px] inline-flex items-center gap-2 text-sm underline underline-offset-4" style={{ color: COLORS.actionText }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" /><path d="m10 8.5 5 3.5-5 3.5Z" fill="currentColor" />
      </svg>
      {t("tour.take")}
    </button>
  );
}

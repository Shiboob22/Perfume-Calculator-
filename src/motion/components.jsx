import React, { Children, cloneElement, isValidElement, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate as useRouterNavigate, useNavigationType } from "react-router-dom";
import { TOKENS, countValue, splitWords, staggerIndex } from "./config.js";
import { calm, motionOn, reduced } from "./env.js";
import { watch, watchAmbient } from "./observe.js";
import { isPlainClick, navCommitted, startNav, takeViaTransition } from "./nav.js";
import { createScrollMemory, navDirection, popDirection } from "./carry.js";

// The primitives every page uses. They render the same markup on the server
// and in the browser (the entrance state is set after hydration, on the DOM),
// and they do nothing at all until the `motion` flag has set <html data-motion>.

const cx = (...a) => a.filter(Boolean).join(" ");
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * A block that fades and rises once as it is reached. `eager` is for content
 * that appears after load (client-rendered): it plays on mount even in view.
 * Never use `eager` in prerendered markup. `from`: "up" (default), "start", "end",
 * "down" (set down from above: the Wardrobe's answer).
 */
export function Reveal({ as: Tag = "div", from = "up", eager = false, className, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => (eager ? undefined : watch(ref.current)), [eager]);
  return (
    <Tag ref={ref} className={cx("mo-reveal", className)} data-mo={eager ? "enter" : undefined} data-mo-from={from === "up" ? undefined : from} {...rest}>
      {children}
    </Tag>
  );
}

/** Children enter one after another (each needs to accept className and style, as DOM elements do). */
export function Stagger({ as: Tag = "div", eager = false, max = TOKENS.stagger.max, className, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => (eager ? undefined : watch(ref.current)), [eager]);
  let n = 0;
  const items = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const i = staggerIndex(n++, max);
    return cloneElement(child, { className: cx("mo-item", child.props.className), style: { ...child.props.style, "--i": i } });
  });
  return (
    <Tag ref={ref} className={cx("mo-stagger", className)} data-mo={eager ? "enter" : undefined} {...rest}>{items}</Tag>
  );
}

/**
 * A heading whose words rise out of a mask, one by one. Whole words only:
 * Arabic letters must keep their joins. The words are the real text in order.
 * `eager` is for client-rendered headings (rooms): the words rise on mount,
 * even on the first screen. Never use it in prerendered markup.
 */
export function TextReveal({ as: Tag = "h2", text, eager = false, className, ...rest }) {
  const ref = useRef(null);
  useEffect(() => (eager ? undefined : watch(ref.current)), [eager]);
  const words = splitWords(text);
  return (
    <Tag ref={ref} className={cx("mo-text", className)} data-mo={eager ? "in" : undefined} {...rest}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          {i > 0 && " "}
          <span className="mo-w"><span className="mo-wi" style={{ "--i": Math.min(i, TOKENS.stagger.maxWords) }}>{w}</span></span>
        </React.Fragment>
      ))}
    </Tag>
  );
}

/** A hairline that draws from the start edge (the right in Arabic). Decorative. */
export function DrawLine({ className, style, ...rest }) {
  const ref = useRef(null);
  useEffect(() => watch(ref.current), []);
  return <span ref={ref} aria-hidden="true" className={cx("mo-line", className)} style={style} {...rest} />;
}

/**
 * A stage that stays on screen while the page scrolls through `height`
 * (a CSS length such as "300vh"). Children can read the progress as the named
 * timeline `--mo-pin`. Under reduced motion it is a plain block.
 */
export function Pin({ as: Tag = "section", height = "300vh", className, style, children, ...rest }) {
  return (
    <Tag className={cx("mo-pin", className)} style={{ ...style, "--mo-pin-h": height }} {...rest}>
      <div className="mo-pin__stage">{children}</div>
    </Tag>
  );
}

/**
 * A figure that counts to its new value (250 ms, eased) when it changes.
 * The first value is shown at once; with `onView` it counts up from zero the
 * first time it is reached. Screen readers get the final value, never the
 * count. `format` turns a number into text.
 */
export function CountUp({ value, format = (n) => String(Math.round(n)), onView = false, className, ...rest }) {
  const ref = useRef(null);
  const shown = useRef(value);
  const [text, setText] = useState(() => format(value));
  const raf = useRef(0);

  const run = (from, to) => {
    cancelAnimationFrame(raf.current);
    if (!motionOn() || reduced() || from === to) { shown.current = to; setText(format(to)); return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = (now - t0) / TOKENS.duration.base;
      shown.current = t >= 1 ? to : countValue(from, to, t);
      setText(format(shown.current));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (onView && motionOn() && !reduced() && ref.current && ref.current.getBoundingClientRect().top >= window.innerHeight * (1 - TOKENS.view.lead)) {
        shown.current = 0; setText(format(0));
        const io = new IntersectionObserver((l) => { if (l.some((e) => e.isIntersecting)) { io.disconnect(); run(0, value); } });
        io.observe(ref.current);
        return () => io.disconnect();
      }
      return undefined;
    }
    run(shown.current, value);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={cx("tabular-nums", className)} {...rest}>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

/** A slow grey sweep for content on its way. Decorative: give the region its own accessible name. */
export function Skeleton({ w, h = 14, className, style, ...rest }) {
  const ref = useRef(null);
  useEffect(() => watchAmbient(ref.current), []);
  return <span ref={ref} aria-hidden="true" className={cx("mo-skel", className)} style={{ width: w, height: h, ...style }} {...rest} />;
}

// Where each history entry was scrolled to (M2: coming back to a list lands
// where it was left). One per tab, kept in sessionStorage across reloads.
const SCROLL_KEY = "kyphira.scroll";
let scrollMemory = null;
function memory() {
  if (scrollMemory) return scrollMemory;
  const store = (() => { try { return window.sessionStorage; } catch { return null; } })();
  scrollMemory = createScrollMemory({ load: () => store?.getItem(SCROLL_KEY), persist: (v) => store?.setItem(SCROLL_KEY, v) });
  return scrollMemory;
}

/** Scrolls back to `y` once the page is tall enough (lists load after the route), unless the reader moves first. */
function restoreScroll(y) {
  const t0 = performance.now();
  let stop = false;
  const cancel = () => { stop = true; };
  const opts = { passive: true, once: true };
  for (const ev of ["wheel", "touchstart", "keydown", "pointerdown"]) window.addEventListener(ev, cancel, opts);
  const step = () => {
    if (stop) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max >= y - 1 || performance.now() - t0 > 1500) { window.scrollTo(0, Math.min(y, Math.max(0, max))); return; }
    requestAnimationFrame(step);
  };
  step();
  return cancel;
}

/**
 * The page body of a layout. Moves the page in on a route change that did not
 * run as a View Transition (browser back and forward, or a browser without
 * them), with the Web Animations API so nothing remounts: back comes in from
 * the start edge, forward from the end edge (mirrored in Arabic), anything
 * else rises. A change of query on the same page (a row picked) does not move
 * the page. Browser back and forward return to where the page was scrolled.
 */
export function PageTransition({ as: Tag = "main", className, children, ...rest }) {
  const ref = useRef(null);
  const { key, pathname, hash } = useLocation();
  const type = useNavigationType();
  const prev = useRef({ key, pathname, idx: null });
  const current = useRef(key);
  // Remember the scroll of the entry being read.
  useEffect(() => {
    if (!motionOn()) return undefined;
    try { window.history.scrollRestoration = "manual"; } catch { /* old browsers */ }
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; memory().set(current.current, window.scrollY); }); };
    const flush = () => { memory().set(current.current, window.scrollY); memory().flush(); };
    const onHidden = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);
  useIsoLayoutEffect(() => {
    const idx = window.history.state?.idx;
    if (prev.current.key === key) { prev.current.idx = idx; return undefined; }
    const from = prev.current;
    const moved = from.pathname !== pathname;
    prev.current = { key, pathname, idx };
    current.current = key;
    let cancel;
    if (motionOn()) {
      // A new page opens at its top (the router leaves the scroll where it was);
      // back and forward return to where that entry was left.
      if (type === "POP") { const y = memory().get(key); if (y != null) cancel = restoreScroll(y); }
      else if (moved && type === "PUSH" && !hash) window.scrollTo(0, 0);
    }
    navCommitted();
    if (takeViaTransition() || !moved || !motionOn() || reduced() || !ref.current?.animate) return cancel;
    const dir = type === "POP" ? popDirection(from.idx, idx) : navDirection(from.pathname, pathname);
    const rtl = document.documentElement.dir === "rtl" ? -1 : 1;
    const d = TOKENS.distance.m;
    // Motion: Calm (M6): a plain cross-fade, no travel.
    const startAt = calm() ? "0 0" : dir === "back" ? `${-d * rtl}px 0` : dir === "forward" ? `${d * rtl}px 0` : `0 ${TOKENS.distance.s}px`;
    ref.current.animate(
      [{ opacity: 0, translate: startAt }, { opacity: 1, translate: "0 0" }],
      { duration: TOKENS.duration.base, easing: TOKENS.ease.out },
    );
    return cancel;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Tag ref={ref} className={className} {...rest}>{children}</Tag>;
}

/**
 * Router's Link, with the route change run as a View Transition when the
 * layer is on. Same props as Link, plus `direction` ("forward", "back",
 * "fade"; by default worked out from the two paths). A link marked
 * `data-mo-share="<key>"` (or holding an element so marked) carries that
 * element to the `data-mo-share-to="<key>"` element of the new page. Use this,
 * not react-router-dom's Link (eslint enforces it).
 */
export const Link = React.forwardRef(function Link({ onClick, to, replace, state, target, reloadDocument, direction, ...rest }, ref) {
  const navigate = useRouterNavigate();
  const handle = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || reloadDocument || !motionOn() || !isPlainClick(e, target)) return;
    e.preventDefault();
    const a = e.currentTarget;
    const share = a.getAttribute("data-mo-share") ?? a.querySelector("[data-mo-share]")?.getAttribute("data-mo-share") ?? null;
    startNav(() => navigate(to, { replace, state }), {
      direction: direction ?? navDirection(window.location.pathname, a.getAttribute("href")), share, from: a,
    });
  };
  return <RouterLink ref={ref} to={to} replace={replace} state={state} target={target} reloadDocument={reloadDocument} onClick={handle} {...rest} />;
});

/** useNavigate whose pushes run as View Transitions when the layer is on (`opts.direction`, `opts.share` as for Link). */
export function useNavigate() {
  const navigate = useRouterNavigate();
  return React.useCallback((to, opts) => {
    if (typeof to === "number" || opts?.transition === false) return navigate(to, opts);
    const path = typeof to === "string" ? to : to?.pathname ?? window.location.pathname;
    return startNav(() => navigate(to, opts), { direction: opts?.direction ?? navDirection(window.location.pathname, path), share: opts?.share ?? null });
  }, [navigate]);
}

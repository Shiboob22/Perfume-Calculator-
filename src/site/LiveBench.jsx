import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { COLORS, OFFSET_SHADOW, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { fmt2 } from "../lib/calc";
import { Segmented } from "../components/Bottle";
import { createBenchClock, useBenchFrame, useThemeName } from "../components/kx/benchClock";
import { reduced } from "../motion/env.js";
import { IconArrow, IconBalance, IconFlameTriangle } from "../components/icons";
import {
  BENCH_DEFAULT, BENCH_EMPTY, BENCH_FLACON_BOX, BENCH_INTRO_PACE, BENCH_JITTER, BENCH_SEEN_AT,
  BENCH_SIZES, BENCH_STRENGTHS, benchFigures, benchHref, benchTarget,
} from "./benchFigures";

// The home page's bench card: the handbook's method working in the first
// screen. Prerendered at 100 mL and 25% (the worked example), so the page is
// whole without JavaScript; hydration turns the choices on. "Full bench"
// opens the calculator at the same bottle and strength.
//
// Section I: the Bench's glass flacon (kx/Flacon, without its weighing pan)
// and the Bench's pour. One clock (kx/benchClock) drives the bottle, the
// three figures and the scroll scene's side gauge: a change of bottle or
// strength pours (cap up, stream, ripple, wobble) while the figures roll
// (350 ms, a little overshoot, the last decimal settling last). The first
// time the card comes into view it pours once from empty, at half speed.
// Off screen the clock jumps to rest, so nothing moves in the background;
// reduced motion jumps everywhere. The figures in the live region are the
// text of record and never roll; the rolling ones are decoration.

// Once per page load: a later visit to the home page in the same tab (the
// public router) shows the figures at rest.
let introPlayed = false;

const ROWS = [["exampleOil", 0, COLORS.oil], ["exampleAlcohol", 1, COLORS.mist], ["exampleTotal", 2, null]];
const rowStyle = (i) => ({ borderTop: i === 2 ? `1px solid ${COLORS.ink}` : "none", borderBottom: i === 0 ? `1px solid ${COLORS.line}` : "none" });

/**
 * One rolling figure. The tens digit has a cell of its own, one digit wide
 * whether it shows or not, so the rest of the number ("3.75 g") never moves
 * when a figure crosses 10 g: no layout shift while it rolls. Every figure
 * here is under 100 g (a 100 mL bottle weighs at most 85.20 g).
 */
function Fig({ k, grams }) {
  const s = fmt2(Math.min(99.99, Math.max(0, grams)));
  const two = s.length === 5;
  return (
    <span dir="ltr" data-fig={k} className="hb-val font-mono">
      <span className="hb-tens"><span>{two ? s[0] : ""}</span></span>{two ? s.slice(1) : s} g
    </span>
  );
}

/** The figures as they roll. Decoration: the live region beside them reads the final ones. */
function Rolling({ clock, target, t }) {
  const f = useBenchFrame(clock, target);
  return (
    <div aria-hidden="true" className="min-w-0" data-hb-rolling>
      {ROWS.map(([key, n, swatch], i) => (
        <div key={key} className="hb-row" style={rowStyle(i)}>
          <span className={`${TYPE.label} inline-flex items-center gap-2 min-w-0`} style={{ color: COLORS.dim }}>
            {swatch && <span className="w-2.5 h-2.5 shrink-0" style={{ background: swatch, border: `1px solid ${COLORS.ink}` }} />}
            {t(`site.home.${key}`)}
          </span>
          <Fig k={key} grams={f.values[n]} />
        </div>
      ))}
    </div>
  );
}

// The flacon is drawn in the browser, after hydration, into a box of its
// final size, from its own small chunk. Its SVG would take the home page's
// HTML past what fits in the first round trip (about 14 KB compressed),
// costing a mobile visitor a round trip before the first paint, and its code
// would weigh on the entry bundle every public page loads. The prerender
// holds the empty box, so nothing moves when the bottle appears; without
// JavaScript the figures stand alone.
const Flacon = lazy(() => import("../components/kx/Flacon"));
const EmptyBox = () => <div aria-hidden="true" data-flacon-box className="flex-none" style={{ width: BENCH_FLACON_BOX[0], height: BENCH_FLACON_BOX[1] }} />;

/** The flacon, drawn from the same frame. */
function Bottle({ clock, target, pct, size }) {
  const f = useBenchFrame(clock, target);
  const theme = useThemeName({ prerendered: true });
  const [drawn, setDrawn] = useState(false);
  useEffect(() => setDrawn(true), []);
  if (!drawn) return <EmptyBox />;
  return (
    <Suspense fallback={<EmptyBox />}>
      <Flacon stand={false} box={BENCH_FLACON_BOX} share={f.values[3]} flow={f.flow} wobble={f.wobble} pct={pct} totalMl={size} theme={theme} />
    </Suspense>
  );
}

export default function LiveBench({ onTotal }) {
  const { t } = useI18n();
  const [size, setSize] = useState(BENCH_DEFAULT.size);
  const [pct, setPct] = useState(BENCH_DEFAULT.pct);
  const f = benchFigures(size, pct);
  const target = benchTarget(f);
  const [clock] = useState(() => createBenchClock({ jitter: BENCH_JITTER }));
  const ref = useRef(null);
  const latest = useRef(target);
  latest.current = target;
  // on: any of the card on screen; sync: seen enough that the side gauge reads the card.
  const view = useRef({ on: false, sync: false, gauge: null, first: true });

  // A new bottle or strength pours, on screen; off screen it just rests there.
  // (Compared with the last choice, not "first run", so StrictMode's second
  // run in development is not taken for a change.)
  const last = useRef(null);
  useEffect(() => {
    const key = `${size}/${pct}`;
    if (last.current === key) return;
    const first = last.current === null;
    last.current = key;
    if (first) { clock.retarget(latest.current); return; }
    introPlayed = true;
    clock.retarget(latest.current, { jump: !view.current.on });
    onTotal?.(f.total);
  }, [clock, size, pct]); // eslint-disable-line react-hooks/exhaustive-deps

  // The scroll scene's side gauge (when the card sits in it) reads this card's
  // rolling total while the card is in view: written straight to its custom
  // properties each frame, no React render.
  useEffect(() => {
    const v = view.current;
    v.gauge = ref.current?.closest("[data-compounding]")?.querySelector("[data-gauge-live]") ?? null;
    const write = () => {
      const g = v.gauge;
      if (!g) return;
      if (v.on && v.sync) {
        g.style.setProperty("--cg-sync", String(Math.round((clock.get()?.values[2] ?? latest.current[2]) * 100)));
        g.setAttribute("data-sync", "");
      } else if (g.hasAttribute("data-sync")) g.removeAttribute("data-sync");
    };
    v.write = write;
    const off = clock.subscribe(write);
    return () => { off(); v.gauge?.removeAttribute("data-sync"); clock.stop(); };
  }, [clock]);

  // In view or not: the first pour, the gauge, and nothing moving off screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") return undefined;
    const io = new IntersectionObserver(([e]) => {
      const v = view.current;
      v.on = e.isIntersecting;
      const seen = e.isIntersecting && e.intersectionRatio >= BENCH_SEEN_AT;
      if (!v.on) { clock.finish(); v.sync = false; }
      else if (seen) v.sync = true;
      if (!introPlayed) {
        if (reduced()) introPlayed = true;
        else if (v.first && !v.on) clock.retarget(BENCH_EMPTY, { jump: true }); // below the fold: wait empty
        else if (v.first || seen) {
          if (v.first) clock.retarget(BENCH_EMPTY, { jump: true }); // already in view: pour now
          introPlayed = true;
          v.sync = true;
          clock.retarget(latest.current, { pace: BENCH_INTRO_PACE });
        }
      }
      v.first = false;
      v.write?.();
    }, { threshold: [0, BENCH_SEEN_AT] });
    io.observe(el);
    return () => io.disconnect();
  }, [clock]);

  return (
    <figure ref={ref} data-home-bench style={{ background: COLORS.card, border: `1px solid ${COLORS.ink}`, boxShadow: OFFSET_SHADOW }}>
      <figcaption className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <span className="inline-flex items-center gap-2 text-sm font-medium"><IconBalance size={24} />{t("site.home.bench.label")}</span>
        <span dir="ltr" className="font-mono text-xs" style={{ color: COLORS.dim }}>{t("site.home.bench.no")}</span>
      </figcaption>

      <div className="hb p-5 grid gap-4">
        <Segmented legend={t("site.home.bench.size")} value={size} onChange={setSize} mono cols="hb-sizes"
          options={BENCH_SIZES.map((s) => ({ value: s, label: `${s} mL` }))} />
        <Segmented legend={t("site.home.bench.strength")} value={pct} onChange={setPct} cols="hb-strengths"
          options={BENCH_STRENGTHS.map((s) => ({ value: s.pct, label: `${s.pct} ${s.name.replace(/^EDP /, "")}` }))} />

        <div className="hb-figs mt-2">
          <Bottle clock={clock} target={target} pct={pct} size={size} />
          <Rolling clock={clock} target={target} t={t} />
          {/* The text of record: final figures, announced once per change. */}
          <div role="status" aria-live="polite" className="sr-only">
            {ROWS.map(([key, n]) => (
              <p key={key}>{t(`site.home.${key}`)}<span dir="ltr" className="readout">{fmt2(target[n])} g</span></p>
            ))}
          </div>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: COLORS.dim }}>{t("site.home.exampleNote")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <span className="inline-flex items-center gap-2 text-xs" style={{ color: COLORS.danger }}><IconFlameTriangle size={18} />{t("site.home.bench.safety")}</span>
        <a href={benchHref(size, pct)} aria-label={t("site.home.bench.open")}
          className="inline-flex items-center gap-2 text-sm font-medium min-h-[44px]" style={{ color: COLORS.forest }}>
          {t("site.home.bench.full")} <IconArrow size={18} />
        </a>
      </div>
    </figure>
  );
}

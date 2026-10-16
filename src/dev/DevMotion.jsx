// Development only (see Root.jsx: /dev/* is not in a production build).
// The Compounding with a panel: the scene's scroll progress, the stage it is
// in, the grams on the scale, a marker per stage (click to jump), a frame-rate
// readout, and switches for reduced motion, right-to-left and low power.
// The switches stand in for the OS settings: reduced motion rewrites the
// scene's media rules in place, and the scene is told through window.__cmp.
import React, { useEffect, useRef, useState } from "react";
import Compounding from "../site/compounding/Compounding";
import { STAGES, stageAt } from "../lib/compounding/config";
import { gramsAt } from "../lib/compounding/scale";
import { useI18n } from "../i18n/I18nProvider";

const clamp = (n) => Math.min(1, Math.max(0, n));

// Make `(prefers-reduced-motion: …)` rules behave as if the OS asked for `reduce` (or not).
function forceMotion(reduce) {
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      if (!(rule instanceof CSSMediaRule)) continue;
      rule.__orig ??= rule.media.mediaText;
      if (!rule.__orig.includes("prefers-reduced-motion")) continue;
      const wantsReduce = rule.__orig.includes("reduce") && !rule.__orig.includes("no-preference");
      rule.media.mediaText = reduce === null ? rule.__orig : (wantsReduce === reduce ? "all" : "not all");
    }
  }
}

function Switch({ on, set, children }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export default function DevMotion() {
  const { locale, setLocale } = useI18n();
  const [read, setRead] = useState({ p: 0, stage: "afternoon", fps: 0, native: false });
  const [reduce, setReduce] = useState(false);
  const [low, setLow] = useState(false);
  const frames = useRef([]);

  useEffect(() => {
    window.__cmp = { reduce, low };
    forceMotion(reduce);
    window.dispatchEvent(new Event("cmp-env"));
  }, [reduce, low]);
  useEffect(() => () => { delete window.__cmp; forceMotion(null); }, []);

  useEffect(() => {
    let raf = 0;
    const tick = (now) => {
      const fr = frames.current;
      fr.push(now);
      while (fr.length && now - fr[0] > 1000) fr.shift();
      const scene = document.querySelector("[data-compounding]");
      const r = scene?.getBoundingClientRect();
      const p = r ? clamp(-r.top / Math.max(1, r.height - window.innerHeight)) : 0;
      setRead((o) => (o.p === p && o.fps === fr.length ? o : { p, stage: stageAt(p).id, fps: fr.length, native: CSS.supports("animation-timeline: view()") }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const jump = (id) => {
    const s = STAGES.find((x) => x.id === id);
    const scene = document.querySelector("[data-compounding]");
    if (!scene) return;
    const top = scene.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (s.from + 0.0005) * (scene.offsetHeight - window.innerHeight), behavior: "auto" });
  };

  return (
    <div>
      <aside data-dev-motion dir="ltr" className="fixed z-50 bottom-2 right-2 w-[248px] p-3 text-[11px] leading-snug font-mono bg-black/85 text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
        <div className="flex justify-between"><span>progress</span><b data-readout="progress">{read.p.toFixed(3)}</b></div>
        <div className="flex justify-between"><span>stage</span><b data-readout="stage">{read.stage}</b></div>
        <div className="flex justify-between"><span>scale</span><b data-readout="grams">{gramsAt(read.p).toFixed(2)} g</b></div>
        <div className="flex justify-between"><span>fps</span><b data-readout="fps">{read.fps}</b></div>
        <div className="flex justify-between"><span>engine</span><b>{read.native ? "scroll timelines" : "JS fallback"}</b></div>
        <div className="relative my-2 h-3 bg-white/20">
          {STAGES.map((s) => (
            <button key={s.id} type="button" title={s.id} onClick={() => jump(s.id)} aria-label={s.id}
              className="absolute top-0 bottom-0 border-s border-white/60 hover:bg-white/30" style={{ left: `${s.from * 100}%`, width: `${(s.to - s.from) * 100}%` }} />
          ))}
          <span className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-amber-400" style={{ left: `${read.p * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-2 text-[10px] opacity-80">{STAGES.map((s) => <span key={s.id}>{s.id} {s.from}</span>)}</div>
        <div className="mt-2 grid gap-1">
          <Switch on={reduce} set={setReduce}>reduced motion</Switch>
          <Switch on={locale === "ar"} set={(v) => setLocale(v ? "ar" : "en")}>right to left (ar)</Switch>
          <Switch on={low} set={setLow}>low power</Switch>
        </div>
      </aside>
      <Compounding />
    </div>
  );
}

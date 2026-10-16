import React, { useState } from "react";
import Hero from "../site/compounding/Hero";
import { END } from "../lib/hero/timeline";
import { COLORS } from "../lib/theme";

// /dev/motion (vite dev only): the Compounding hero frozen at any time, to
// check each of the board's eight frames and the Arabic mirror.
export default function DevMotion() {
  const [t, setT] = useState(END);
  return (
    <div style={{ background: COLORS.paper, color: COLORS.ink }}>
      <div className="flex flex-wrap items-center gap-4 p-4 text-sm">
        <label className="flex items-center gap-2">T
          <input type="range" min="0" max={END} step="0.1" value={t} onChange={(e) => setT(Number(e.target.value))} aria-label="seconds" />
          <output dir="ltr">{t.toFixed(1)} s</output>
        </label>
        {[0, 2, 4.4, 5.4, 6.2, 7.2, 8.6, END].map((s, i) => (
          <button key={s} type="button" onClick={() => setT(s)} className="min-h-[44px] px-3 border" style={{ borderColor: COLORS.line }}>{i + 1} · {s}</button>
        ))}
      </div>
      <Hero freezeAt={t} />
    </div>
  );
}

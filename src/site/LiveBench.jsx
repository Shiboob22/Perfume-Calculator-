import React, { useState } from "react";
import { COLORS, SHAPE, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { fmt2 } from "../lib/calc";
import { BENCH_DEFAULT, BENCH_SIZES, BENCH_STRENGTHS, benchFigures, benchHref } from "./benchFigures";

// The home page's hero: the handbook's method working in the first screen.
// Prerendered at 100 mL and 25% (the worked example), so the page is whole
// without JavaScript; hydration turns the choices on.
export default function LiveBench() {
  const { t } = useI18n();
  const [size, setSize] = useState(BENCH_DEFAULT.size);
  const [pct, setPct] = useState(BENCH_DEFAULT.pct);
  const f = benchFigures(size, pct);
  const choice = (on) => ({
    background: on ? COLORS.amber : "transparent",
    color: on ? COLORS.onAmber : COLORS.ink,
    border: `1px solid ${on ? COLORS.amber : COLORS.field}`,
  });

  return (
    <figure className={`p-6 sm:p-8 ${SHAPE.panel}`} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <figcaption className={TYPE.runningHead} style={{ color: COLORS.amberDeep }}>{t("site.home.bench.label")}</figcaption>

      <fieldset className="mt-5">
        <legend className="text-sm mb-2" style={{ color: COLORS.inkSoft }}>{t("site.home.bench.size")}</legend>
        <div className="flex flex-wrap gap-2">
          {BENCH_SIZES.map((s) => (
            <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} dir="ltr"
              className="px-3 py-1.5 rounded-none font-mono text-sm min-h-[36px]" style={choice(size === s)}>{s} mL</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-sm mb-2" style={{ color: COLORS.inkSoft }}>{t("site.home.bench.strength")}</legend>
        <div className="flex flex-wrap gap-2">
          {BENCH_STRENGTHS.map((s) => (
            <button key={s.pct} type="button" aria-pressed={pct === s.pct} onClick={() => setPct(s.pct)} dir="ltr"
              className="px-3 py-1.5 rounded-none text-sm min-h-[36px]" style={choice(pct === s.pct)}>{s.pct}% {s.name}</button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-5 items-end">
        {/* The bottle's weight, split as poured: oil below, alcohol above. */}
        <div aria-hidden="true" className="relative h-36 rounded-b-xl overflow-hidden" style={{ background: COLORS.hair, border: `1px solid ${COLORS.field}`, borderTop: "none" }}>
          <div className="pour absolute inset-0" style={{ transform: `scaleY(${f.oilShare})`, background: `linear-gradient(180deg,${COLORS.amber},${COLORS.ember})` }} />
        </div>
        <div role="status" aria-live="polite">
          {[["exampleOil", f.oil], ["exampleAlcohol", f.alcohol], ["exampleTotal", f.total]].map(([key, g], i) => (
            <div key={key} className="flex justify-between items-baseline py-2.5"
              style={{ borderTop: i === 2 ? `1px solid ${COLORS.inkSoft}` : "none", borderBottom: i < 1 ? `1px solid ${COLORS.line}` : "none" }}>
              <span style={{ color: COLORS.ink }}>{t(`site.home.${key}`)}</span>
              <span key={g} dir="ltr" className="readout font-mono text-2xl sm:text-3xl" style={{ color: i === 2 ? COLORS.forestDeep : COLORS.ink }}>{fmt2(g)} g</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed" style={{ color: COLORS.inkSoft }}>{t("site.home.exampleNote")}</p>
      <a href={benchHref(size, pct)} className="inline-block mt-4 text-sm underline underline-offset-4 min-h-[24px]" style={{ color: COLORS.amber }}>
        {t("site.home.bench.open")} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
      </a>
    </figure>
  );
}

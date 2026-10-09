import React, { useState } from "react";
import { COLORS, OFFSET_SHADOW, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { fmt2 } from "../lib/calc";
import { BottleFill, Segmented } from "../components/Bottle";
import { IconArrow, IconBalance, IconFlameTriangle } from "../components/icons";
import { BENCH_DEFAULT, BENCH_SIZES, BENCH_STRENGTHS, benchFigures, benchHref } from "./benchFigures";

// The home page's hero: the handbook's method working in the first screen.
// Prerendered at 100 mL and 25% (the worked example), so the page is whole
// without JavaScript; hydration turns the choices on. "Full bench" opens the
// calculator at the same bottle and strength (the shared bench state).
export default function LiveBench() {
  const { t } = useI18n();
  const [size, setSize] = useState(BENCH_DEFAULT.size);
  const [pct, setPct] = useState(BENCH_DEFAULT.pct);
  const f = benchFigures(size, pct);
  const rows = [["exampleOil", f.oil, COLORS.oil], ["exampleAlcohol", f.alcohol, COLORS.mist], ["exampleTotal", f.total, null]];

  return (
    <figure style={{ background: COLORS.card, border: `1px solid ${COLORS.ink}`, boxShadow: OFFSET_SHADOW }}>
      <figcaption className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <span className="inline-flex items-center gap-2 text-sm font-medium"><IconBalance size={24} />{t("site.home.bench.label")}</span>
        <span dir="ltr" className="font-mono text-xs" style={{ color: COLORS.dim }}>{t("site.home.bench.no")}</span>
      </figcaption>

      <div className="p-5 grid gap-4">
        <Segmented legend={t("site.home.bench.size")} value={size} onChange={setSize} mono
          options={BENCH_SIZES.map((s) => ({ value: s, label: `${s} mL` }))} />
        <Segmented legend={t("site.home.bench.strength")} value={pct} onChange={setPct}
          options={BENCH_STRENGTHS.map((s) => ({ value: s.pct, label: `${s.pct} ${s.name.replace(/^EDP /, "")}` }))} />

        <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-5 items-end">
          <BottleFill oilShare={f.oilShare} height={150} />
          <div role="status" aria-live="polite" className="min-w-0">
            {rows.map(([key, g, swatch], i) => (
              <div key={key} className="flex justify-between items-baseline gap-3 py-2"
                style={{ borderTop: i === 2 ? `1px solid ${COLORS.ink}` : "none", borderBottom: i === 0 ? `1px solid ${COLORS.line}` : "none" }}>
                <span className={`${TYPE.label} inline-flex items-center gap-2`} style={{ color: COLORS.dim }}>
                  {swatch && <span aria-hidden="true" className="w-2.5 h-2.5" style={{ background: swatch, border: `1px solid ${COLORS.ink}` }} />}
                  {t(`site.home.${key}`)}
                </span>
                <span key={g} dir="ltr" className="readout font-mono text-xl min-[380px]:text-2xl sm:text-3xl tracking-[-0.02em]">{fmt2(g)} g</span>
              </div>
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

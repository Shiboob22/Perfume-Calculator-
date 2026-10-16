import React from "react";
import { fmt2 } from "../../lib/calc";
import { STAGE_SHOWN_GRAMS, SCALE_FULL_G } from "../../lib/compounding/scale";
import { M } from "./motion";

// One light-drawn bowl: a shallow lab vessel, no ornament. `fill` is what is
// in it: nothing, the sixteen (as grains), the pour (grains that draw together
// into the mass as the page scrolls; at rest, the mass alone), or the mass.
const POUR_AT = [120, 62];
const MASS = (
  <>
    <path d="M26 52 C30 102 66 126 120 126 C174 126 210 102 214 52 C190 62 150 66 120 66 C90 66 50 62 26 52Z" fill="var(--st-resin)" fillOpacity="0.85" stroke="none" />
    <ellipse cx="120" cy="56" rx="92" ry="9" fill="var(--st-resin)" stroke="none" />
    <path d="M70 58 C92 52 120 52 140 56" stroke="var(--st-bg)" strokeOpacity="0.7" />
  </>
);
export function Bowl({ fill = "empty", grains = [], className = "" }) {
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.5">
      {fill === "mass" && MASS}
      {fill === "pour" && (
        <>
          <M as="g" kf="mass" className="cmp-mass">{MASS}</M>
          {grains.map(([x, y, r], i) => (
            <M as="circle" kf="merge" i={i} key={i} cx={x} cy={y} r={r} fill="var(--st-resin)" stroke="none" style={{ "--dx": `${POUR_AT[0] - x}px`, "--dy": `${POUR_AT[1] - y}px` }} />
          ))}
        </>
      )}
      {fill === "grains" && grains.map(([x, y, r], i) => <M as="circle" kf="grain" i={i} key={i} cx={x} cy={y} r={r} fill="var(--st-resin)" stroke="none" />)}
      <ellipse cx="120" cy="46" rx="102" ry="14" />
      <path d="M18 46 C18 104 60 132 120 132 C180 132 222 104 222 46" />
      <path d="M92 134 C92 142 100 144 120 144 C140 144 148 142 148 134" />
    </svg>
  );
}

// Sixteen grain positions inside the bowl's mouth, fixed so the prerender is stable.
export const GRAINS = Array.from({ length: 16 }, (_, i) => {
  const col = i % 8;
  const row = Math.floor(i / 8);
  return [48 + col * 20 + (row ? 8 : 0), 52 + row * 7, 4.2];
});

// The weight scale in the margin: a thin vertical gauge and its readout, in
// grams, tabular. Decoration (aria-hidden); the scene's text never depends on it.
export function Gauge({ stage }) {
  const g = STAGE_SHOWN_GRAMS[stage] ?? 0;
  const pct = (g / SCALE_FULL_G) * 100;
  return (
    <div aria-hidden="true" className="cmp-static absolute top-6 bottom-6 flex flex-col items-start" style={{ insetInlineStart: 6 }} data-gauge>
      <div className="relative flex-1 w-px" style={{ background: "var(--st-line)" }}>
        <div className="absolute bottom-0 start-0 w-px" style={{ height: `${pct}%`, background: "var(--st-accent)", boxShadow: "1px 0 0 var(--st-accent)" }} />
        <div className="absolute w-2 h-px" style={{ bottom: `${pct}%`, insetInlineStart: -4, background: "var(--st-accent)" }} />
      </div>
      <span dir="ltr" className="mt-2 font-mono text-[10px] leading-none whitespace-nowrap" style={{ color: "var(--st-dim)", fontVariantNumeric: "tabular-nums" }}>{fmt2(g)} g</span>
    </div>
  );
}

// Smoke: a few rising strokes from the ember. Decoration; at rest under
// reduced motion there is none.
const SMOKE = [
  "M200 520 C170 440 240 400 205 330 C175 270 245 230 210 160 C190 120 220 80 205 20",
  "M196 520 C150 450 120 420 150 350 C180 290 110 250 140 190 C160 140 120 100 150 40",
  "M204 520 C250 450 290 430 262 360 C236 300 300 260 270 200 C250 150 290 110 262 50",
  "M200 520 C190 470 215 450 198 400 C185 360 210 340 200 300",
];
export function SmokeStrokes() {
  return (
    <svg viewBox="0 0 400 520" preserveAspectRatio="none" aria-hidden="true" focusable="false" className="cmp-strokes absolute inset-0 w-full h-full" fill="none" stroke="var(--st-accent)" strokeOpacity="0.28" strokeWidth="1.2">
      <M as="g" kf="clear">
        {SMOKE.map((d, i) => (
          <M as="g" kf="smoke" i={i} key={i}><path d={d} strokeOpacity={i === 3 ? 0.4 : undefined} /></M>
        ))}
      </M>
    </svg>
  );
}

export function Ember() {
  return (
    <M as="span" kf="ember" aria-hidden="true" className="block w-3 h-3 rounded-full" style={{ background: "var(--st-resin)", boxShadow: "0 0 18px 6px color-mix(in srgb, var(--st-resin) 55%, transparent)" }} />
  );
}

// The live scale: one sticky gauge for the whole scene, filled by scroll. Its
// readout is a CSS counter, so no script writes numbers. A dark strip keeps it
// legible on every stage's ground. Decoration (aria-hidden).
export function LiveGauge() {
  return (
    <div aria-hidden="true" data-gauge-live className="cmp-live" style={{ "--cg-max": Math.round(SCALE_FULL_G * 100) }}>
      <div className="cmp-stick">
        <div className="cmp-track">
          <div className="cmp-fill" />
          <div className="cmp-tickbox"><div className="cmp-tick" /></div>
        </div>
        <span dir="ltr" className="cmp-read" />
      </div>
    </div>
  );
}

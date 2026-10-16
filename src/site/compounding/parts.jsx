import React from "react";
import { fmt2 } from "../../lib/calc";
import { STAGE_SHOWN_GRAMS, SCALE_FULL_G } from "../../lib/compounding/scale";

// One light-drawn bowl: a shallow lab vessel, no ornament. `fill` is what is
// in it: nothing, the sixteen (as grains), or one amber mass.
export function Bowl({ fill = "empty", grains = [], className = "" }) {
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.5">
      {fill === "mass" && (
        <>
          <path d="M26 52 C30 102 66 126 120 126 C174 126 210 102 214 52 C190 62 150 66 120 66 C90 66 50 62 26 52Z" fill="var(--st-resin)" fillOpacity="0.85" stroke="none" />
          <ellipse cx="120" cy="56" rx="92" ry="9" fill="var(--st-resin)" stroke="none" />
          <path d="M70 58 C92 52 120 52 140 56" stroke="var(--st-bg)" strokeOpacity="0.7" />
        </>
      )}
      {fill === "grains" && grains.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="var(--st-resin)" stroke="none" />)}
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
    <div aria-hidden="true" className="absolute top-6 bottom-6 flex flex-col items-start" style={{ insetInlineStart: 6 }} data-gauge>
      <div className="relative flex-1 w-px" style={{ background: "var(--st-line)" }}>
        <div className="absolute bottom-0 start-0 w-px" style={{ height: `${pct}%`, background: "var(--st-accent)", boxShadow: "1px 0 0 var(--st-accent)" }} />
        <div className="absolute w-2 h-px" style={{ bottom: `${pct}%`, insetInlineStart: -4, background: "var(--st-accent)" }} />
      </div>
      <span dir="ltr" className="mt-2 font-mono text-[10px] leading-none whitespace-nowrap" style={{ color: "var(--st-dim)", fontVariantNumeric: "tabular-nums" }}>{fmt2(g)} g</span>
    </div>
  );
}

// Smoke: a few rising strokes from the ember. Decoration.
export function SmokeStrokes() {
  return (
    <svg viewBox="0 0 400 520" preserveAspectRatio="none" aria-hidden="true" focusable="false" className="absolute inset-0 w-full h-full" fill="none" stroke="var(--st-accent)" strokeOpacity="0.28" strokeWidth="1.2">
      <path d="M200 520 C170 440 240 400 205 330 C175 270 245 230 210 160 C190 120 220 80 205 20" />
      <path d="M196 520 C150 450 120 420 150 350 C180 290 110 250 140 190 C160 140 120 100 150 40" />
      <path d="M204 520 C250 450 290 430 262 360 C236 300 300 260 270 200 C250 150 290 110 262 50" />
      <path d="M200 520 C190 470 215 450 198 400 C185 360 210 340 200 300" strokeOpacity="0.4" />
    </svg>
  );
}

export function Ember() {
  return (
    <span aria-hidden="true" className="block w-3 h-3 rounded-full" style={{ background: "var(--st-resin)", boxShadow: "0 0 18px 6px color-mix(in srgb, var(--st-resin) 55%, transparent)" }} />
  );
}

import React from "react";
import { fmt2 } from "../../lib/calc";
import { STAGE_SHOWN_GRAMS, SCALE_FULL_G } from "../../lib/compounding/scale";
import { MOTION_SCENE } from "../../lib/compounding/config";
import { M } from "./motion";

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

export function Ember() {
  return (
    <M as="span" kf="ember" aria-hidden="true" className="block w-3 h-3">
      <span className="cmp-breath block w-3 h-3 rounded-full" style={{ background: "var(--st-resin)", boxShadow: "0 0 18px 6px color-mix(in srgb, var(--st-resin) 55%, transparent)", animationDuration: `${MOTION_SCENE.ambient.emberBreathMs}ms` }} />
    </M>
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

// Weights on the beam: a ruled track filled, from the reading edge (mirrored in
// Arabic), by one or more segments. Each `share` is 0–1 of the track. The numbers
// sit beside it as real text, so the bar is decoration (aria-hidden).
export function Beam({ segments, className = "" }) {
  return (
    <div aria-hidden="true" className={`flex h-3 overflow-clip ${className}`} style={{ border: "1px solid var(--c-field)", background: "var(--c-card)" }}>
      {segments.map((seg, i) => (
        <M key={i} kf="beam" className="h-full" style={{ width: `${Math.round(seg.share * 1000) / 10}%`, background: seg.tone === "ink" ? "var(--c-ink)" : "var(--c-amber)" }} />
      ))}
    </div>
  );
}

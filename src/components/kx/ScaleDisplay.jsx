import React from "react";
import { COLORS } from "../../lib/theme";
import { pourProgress } from "../../lib/pourProgress.js";
import { POUR_BAND } from "../../lib/calc";

// The jeweller's-scale display: a lit digit window (STABLE mark, unit badge,
// ghost 8s behind the digits), the "poured vs target" bar and its state.
//
// STUB for Bench SaaS Phase 6, which builds the shared ScaleDisplay used by
// the bench and the practice scale. The interface below is the one Phase 6
// keeps; only the inside may change.
//
//   label      what is on the scale, e.g. "Oil on the scale" (group and meter name)
//   caption    the small heading above the window; defaults to label
//   grams      the reading, a number
//   target     grams to reach, or null for a plain reading (no bar)
//   tolerance  the "on target" band as a fraction of the target (POUR_BAND)
//   stable     light the STABLE mark; defaults to "on target", or a zero
//              reading when there is no target
//   labels     { under, ok, over } spoken after the reading
//   states     { under, ok, over } shown under the bar (optional)
//   format     number → text for the digits (default 2 decimals)
//   children   controls under the display (tare, practice pour buttons)
//
// The digit colours are the scale's own lit display and stay the same in
// both themes, like a real instrument.
const LIT = "#F6CB86";
const GLOW = "0 0 10px rgba(242,170,80,.55)";

export default function ScaleDisplay({ label, caption, grams, target = null, tolerance = POUR_BAND, unit = "g", stable, labels, states, format, children }) {
  const value = Number(grams) > 0 ? Number(grams) : 0;
  const fmt = format || ((n) => Number(n).toFixed(2));
  const shown = fmt(value);
  const p = target == null || !(Number(target) > 0) ? null : pourProgress(value, target, tolerance);
  const state = p?.state ?? null;
  const lit = stable ?? (p ? state === "ok" : value === 0);
  const barColor = state === "ok" ? COLORS.verdigris : state === "over" ? COLORS.ember : COLORS.amber;
  const spoken = p
    ? `${label}: ${shown} ${unit} of ${fmt(target)} ${unit}${labels?.[state] ? `, ${labels[state]}` : ""}`
    : `${label}: ${shown} ${unit}`;
  return (
    <div role="group" aria-label={label} className="p-5 rounded" style={{ background: COLORS.inkBand, color: COLORS.onInk, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal" style={{ opacity: 0.8 }}>{caption || label}</span>
        {p && <span dir="ltr" className="text-[13px] tabular-nums" style={{ opacity: 0.8 }}>{fmt(target)} {unit}</span>}
      </div>
      <div dir="ltr" className="mt-3 p-1.5 rounded-[5px]" style={{ background: "linear-gradient(180deg,#4A443B,#1B1814)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.10)" }}>
        <div className="px-3.5 pt-2.5 pb-3 rounded-sm" style={{ background: "#100E0B", boxShadow: "inset 0 2px 8px rgba(0,0,0,.75)", fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" }}>
          <div aria-hidden="true" className="flex items-center justify-between text-[11px] tracking-[0.12em]">
            {/* The mark's text is generated content: a dim, unlit mark is decoration, not text to read or contrast-check. */}
            <span data-stable={lit ? "true" : "false"} data-mark="○ STABLE" className="before:content-[attr(data-mark)]"
              style={{ color: LIT, opacity: lit ? 1 : 0.12, textShadow: "0 0 6px rgba(242,170,80,.6)", transition: "opacity 120ms" }} />
            <span className="px-1.5 rounded-sm" style={{ border: "1px solid rgba(246,203,134,.5)", color: LIT }}>{unit}</span>
          </div>
          <p aria-live="polite" aria-label={spoken} className="mt-2 relative text-right leading-none tabular-nums" style={{ fontSize: "clamp(44px, 14vw, 64px)" }}>
            <span aria-hidden="true" className="absolute right-0 top-0" style={{ color: "#F2C27A", opacity: 0.07 }}>{shown.replace(/\d/g, "8")}</span>
            <span className="relative" style={{ color: LIT, textShadow: GLOW }}>{shown}</span>
          </p>
        </div>
      </div>
      {p && (
        <>
          <div dir="ltr" className="mt-4">
            <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={Number(target)} aria-valuenow={Math.max(0, Math.min(value, Number(target)))}
              className="h-2 w-full relative" style={{ background: COLORS.line }}>
              <div className="h-full" data-state={state} style={{ width: `${p.fraction * 100}%`, background: barColor, transition: "width 120ms linear, background 150ms" }} />
              <span aria-hidden="true" className="absolute top-[-3px] bottom-[-3px] right-0 w-px" style={{ background: COLORS.onInk }} />
            </div>
          </div>
          {states?.[state] && <p className="mt-2.5 text-sm" style={{ color: COLORS.onInk }}>{states[state]}</p>}
        </>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

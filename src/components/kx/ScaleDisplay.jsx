import React from "react";
import "@fontsource/share-tech-mono/latin-400.css";
import { COLORS } from "../../lib/theme";
import { pourProgress } from "../../lib/pourProgress.js";
import { POUR_BAND, ghostDigits } from "../../lib/calc";

// The jeweller's-scale display (Bench SaaS Phase 6), shared by the bench
// readout, the phone's pinned bar and Pour Along: a dark bezel around an LCD
// window, amber digits in Share Tech Mono with a glow, faint 88.88 ghost
// segments behind them, a lit unit lamp and a "○ STABLE" mark that lights
// when the reading settles. No paper grain on it: it is an instrument.
//
//   label      what is on the scale, e.g. "Oil on the scale" (group and meter name)
//   caption    the small heading above the window; defaults to label
//   grams      the reading, a number
//   rows       several readings in one window instead: [{ key, label, grams }]
//              (the bench readout: concentrate and ethanol); no bar
//   target     grams to reach, or null for a plain reading (no bar)
//   tolerance  the "on target" band as a fraction of the target (POUR_BAND)
//   stable     light the STABLE mark; defaults to "on target", or a zero
//              reading when there is no target
//   labels     { under, ok, over } spoken after the reading
//   states     { under, ok, over } shown under the bar (optional)
//   format     number → text for the digits (default 2 decimals)
//   variant    "full" (default) or "bar": the phone's pinned strip, rows side by side
//   decorative the figures are shown elsewhere in text (the bench readout):
//              hidden from screen readers, no live region
//   children   controls under the display (tare, practice pour buttons)
//
// The digit colours are the scale's own lit display and stay the same in
// both themes, like a real instrument.
const LIT = "#F6CB86";
const DIM = "#F2C27A";
const GLOW = "0 0 8px rgba(242,170,80,.55)";
const LCD_FONT = "'Share Tech Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

function Digits({ shown, size }) {
  return (
    <span className="relative block text-right leading-none tabular-nums" style={{ fontSize: size, fontFamily: LCD_FONT }}>
      <span aria-hidden="true" className="absolute right-0 top-0" style={{ color: DIM, opacity: 0.07 }}>{ghostDigits(shown)}</span>
      <span className="relative" style={{ color: LIT, textShadow: GLOW }}>{shown}</span>
    </span>
  );
}

function Stable({ lit }) {
  // The mark's text is generated content: a dim, unlit mark is decoration, not text to read or contrast-check.
  return (
    <span data-stable={lit ? "true" : "false"} data-mark="○ STABLE" className="before:content-[attr(data-mark)]"
      style={{ color: LIT, opacity: lit ? 1 : 0.12, textShadow: lit ? "0 0 6px rgba(242,170,80,.6)" : "none", transition: "opacity 120ms" }} />
  );
}

function Lamp({ unit }) {
  return <span data-lamp className="px-1.5 rounded-sm" style={{ border: "1px solid rgba(246,203,134,.5)", color: LIT, textShadow: "0 0 6px rgba(242,170,80,.6)" }}>{unit}</span>;
}

// Containment: the digits change every frame while rolling; their layout stays inside the window.
const bezel = { contain: "layout paint", background: "linear-gradient(180deg,#4A443B,#1B1814)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.10), 0 6px 14px -8px rgba(0,0,0,.5)" };
const windowStyle = { background: "#100E0B", boxShadow: "inset 0 2px 8px rgba(0,0,0,.75)" };

export default function ScaleDisplay({ label, caption, grams, rows, target = null, tolerance = POUR_BAND, unit = "g", stable, labels, states, format, variant = "full", decorative = false, children }) {
  const fmt = format || ((n) => Number(n).toFixed(2));
  const clean = (g) => (Number(g) > 0 ? Number(g) : 0);

  if (variant === "bar") {
    return (
      <div dir="ltr" data-scale="bar" aria-hidden={decorative || undefined} className="flex-1 min-w-0 p-1 rounded-[4px]" style={bezel}>
        <div className="flex justify-between gap-3 px-2.5 py-1.5 rounded-sm" style={windowStyle}>
          {(rows || []).map((r) => (
            <span key={r.key} className="min-w-0 flex flex-col">
              <span dir="auto" className="text-[10px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: DIM, opacity: 0.75 }}>{r.label}</span>
              <span className="whitespace-nowrap leading-tight tabular-nums" style={{ fontFamily: LCD_FONT, fontSize: 20, color: LIT, textShadow: GLOW }}>{fmt(clean(r.grams))}<span className="text-sm ms-0.5">{unit}</span></span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Several readings: the window alone, on the readout card (the bench).
  if (rows) {
    return (
      <div dir="ltr" data-scale="rows" role={decorative ? undefined : "group"} aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined}
        className="p-1.5 rounded-[5px]" style={bezel}>
        <div className="px-3.5 pt-2.5 pb-3 rounded-sm flex flex-col gap-2.5" style={windowStyle}>
          <div aria-hidden="true" className="flex items-center justify-between text-[11px] tracking-[0.12em]" style={{ fontFamily: LCD_FONT }}>
            <Stable lit={stable ?? true} />
            <Lamp unit={unit} />
          </div>
          {rows.map((r) => (
            <div key={r.key} data-row={r.key}>
              <span dir="auto" className="block text-[10px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: DIM, opacity: 0.75 }}>{r.label}</span>
              <Digits shown={fmt(clean(r.grams))} size="clamp(30px, 9vw, 40px)" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const value = clean(grams);
  const shown = fmt(value);
  const p = target == null || !(Number(target) > 0) ? null : pourProgress(value, target, tolerance);
  const state = p?.state ?? null;
  const lit = stable ?? (p ? state === "ok" : value === 0);
  const barColor = state === "ok" ? COLORS.verdigris : state === "over" ? COLORS.ember : COLORS.amber;
  const spoken = p
    ? `${label}: ${shown} ${unit} of ${fmt(target)} ${unit}${labels?.[state] ? `, ${labels[state]}` : ""}`
    : `${label}: ${shown} ${unit}`;
  return (
    <div role="group" aria-label={label} data-scale="full"
      className="p-5 rounded" style={{ background: COLORS.inkBand, color: COLORS.onInk, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal" style={{ opacity: 0.8 }}>{caption || label}</span>
        {p && <span dir="ltr" className="text-[13px] tabular-nums" style={{ opacity: 0.8 }}>{fmt(target)} {unit}</span>}
      </div>
      <div dir="ltr" className="mt-3 p-1.5 rounded-[5px]" style={bezel}>
        <div className="px-3.5 pt-2.5 pb-3 rounded-sm flex flex-col gap-2.5" style={windowStyle}>
          <div aria-hidden="true" className="flex items-center justify-between text-[11px] tracking-[0.12em]" style={{ fontFamily: LCD_FONT }}>
            <Stable lit={lit} />
            <Lamp unit={unit} />
          </div>
          <p aria-live="polite" aria-label={spoken} className="m-0">
            <Digits shown={shown} size="clamp(44px, 14vw, 64px)" />
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

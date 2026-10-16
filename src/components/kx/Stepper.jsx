import React, { useEffect, useRef } from "react";
import { COLORS } from "../../lib/theme";

const HOLD_MS = 120;
const FIRST_MS = 400;

// The board's numeric stepper: a 64 px bar, minus, a large tabular figure with
// its unit, plus. The figure is LTR in both languages; the buttons swap sides
// under dir="rtl" (logical borders). Holding a button repeats every 120 ms.
// The caller owns the value, the step, and what counts as in range: `onStep`
// gets +1 or -1. With `onType` the figure is a real number field (typing still
// works, e.g. a batch of 37 mL); `after` sits beside it (a unit picker). The
// figure itself never animates.
export default function Stepper({ label, value, unit, decLabel, incLabel, onStep, onType, inputId, hideLabel = false, decDisabled = false, incDisabled = false, className = "", after = null }) {
  const timer = useRef(null);
  const stop = () => { clearTimeout(timer.current); clearInterval(timer.current); };
  useEffect(() => stop, []);
  const hold = (dir) => {
    onStep(dir);
    timer.current = setTimeout(() => { timer.current = setInterval(() => onStep(dir), HOLD_MS); }, FIRST_MS);
  };
  const btn = (dir, aria, off, edge, glyph) => (
    <button type="button" aria-label={aria} disabled={off}
      onPointerDown={(e) => { if (e.pointerType === "mouse" && e.button !== 0) return; hold(dir); }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStep(dir); } }}
      className="w-16 flex items-center justify-center touch-manipulation hover:bg-[var(--c-sand)] disabled:opacity-40"
      style={{ color: COLORS.ink, [edge]: `1px solid ${COLORS.line}` }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
        <path d={glyph} />
      </svg>
    </button>
  );
  return (
    <div role={onType ? undefined : "group"} aria-label={onType ? undefined : label} className={className}>
      <span className={hideLabel ? "sr-only" : "block text-sm mb-2"} style={{ color: COLORS.inkSoft }}>{label}</span>
      <div className="flex items-stretch rounded h-16 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--c-focus)]" style={{ border: `1px solid ${COLORS.field}`, background: COLORS.cardHi }}>
        {btn(-1, decLabel, decDisabled, "borderInlineEnd", "M5 12h14")}
        <div dir="ltr" className="flex-1 min-w-0 flex items-baseline justify-center gap-1.5 pt-3.5 tabular-nums" aria-live={onType ? undefined : "polite"}>
          {onType ? (
            <input id={inputId} type="number" inputMode="decimal" min="0" step="any" value={value} aria-label={label}
              onChange={(e) => onType(e.target.value)}
              className="w-full min-w-0 text-center text-[32px] leading-none font-medium bg-transparent tabular-nums focus:outline-none" style={{ color: COLORS.ink }} />
          ) : (
            <span className="text-[32px] leading-none font-medium" style={{ color: COLORS.ink }}>{value}</span>
          )}
          {unit && <span className="text-base" style={{ color: COLORS.dim }}>{unit}</span>}
        </div>
        {btn(1, incLabel, incDisabled, "borderInlineStart", "M12 5v14M5 12h14")}
      </div>
      {after}
    </div>
  );
}

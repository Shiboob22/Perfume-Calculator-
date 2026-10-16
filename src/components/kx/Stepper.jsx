import React, { useId } from "react";
import { COLORS } from "../../lib/theme";

// A numeric stepper (Design System IV): minus, the value in large figures
// with its unit, plus. The value stays a text field (decimal keypad on a
// phone) and its figures read left to right; in Arabic the buttons swap sides
// with the layout. `step` sets both the rounding and the button increment.
// The caller owns the value as a string, so typing is never rewritten.
const decimals = (step) => (String(step).split(".")[1] || "").length;

export function stepValue(value, delta, { step = 1, min = -Infinity, max = Infinity } = {}) {
  const base = Number(String(value).replace(",", "."));
  const from = Number.isFinite(base) ? base : 0;
  const next = Math.min(max, Math.max(min, Math.round((from + delta) / step) * step));
  return next.toFixed(decimals(step));
}

export default function Stepper({ label, hint, value, onChange, step = 1, min, max, unit, decLabel, incLabel, size = "lg", hideLabel = false, className = "", inputProps }) {
  const id = useId();
  const h = size === "lg" ? 64 : 48;
  const bump = (dir) => onChange(stepValue(value, dir * step, { step, min, max }));
  const btn = "flex items-center justify-center shrink-0 hover:bg-[color:var(--c-card-hi)] focus-visible:outline-offset-[-2px]";
  return (
    <div className={className}>
      {label && <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-sm mb-2.5"} style={{ color: COLORS.inkSoft }}>{label}</label>}
      <div className="flex items-stretch rounded-sm" style={{ height: h, border: `1px solid ${COLORS.field}`, background: COLORS.paper }}>
        <button type="button" aria-label={decLabel} onClick={() => bump(-1)} className={btn} style={{ width: h, color: COLORS.ink, borderInlineEnd: `1px solid ${COLORS.line}` }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><path d="M4 10h12" /></svg>
        </button>
        <div className="flex-1 min-w-0 flex items-baseline justify-center gap-1.5 self-center" dir="ltr">
          <input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} {...inputProps}
            className="min-w-0 w-full bg-transparent text-center font-medium focus-visible:outline-offset-[-2px]"
            style={{ fontSize: size === "lg" ? 32 : 24, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }} />
          {unit && <span className="text-sm shrink-0 pe-3" style={{ color: COLORS.dim }}>{unit}</span>}
        </div>
        <button type="button" aria-label={incLabel} onClick={() => bump(1)} className={btn} style={{ width: h, color: COLORS.ink, borderInlineStart: `1px solid ${COLORS.line}` }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><path d="M4 10h12M10 4v12" /></svg>
        </button>
      </div>
      {hint && <p id={`${id}-hint`} className="text-[13px] mt-2" style={{ color: COLORS.dim }}>{hint}</p>}
    </div>
  );
}

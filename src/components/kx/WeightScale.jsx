import React from "react";
import { COLORS } from "../../lib/theme";

// The weight-scale progress (Design System IV): the weight so far over the
// target in large figures, a ruled scale with a resin fill, what comes next
// and what is left. The fill runs from the start edge, so it mirrors in
// Arabic; the figures and units stay Latin and left to right. Display only:
// the numbers come from src/lib/calc and pourProgress, formatted by the
// caller. Nothing here animates the figures; the fill moves in 250 ms.
export default function WeightScale({ label, now, target, unit = "g", fraction, next, left, state = "ok", format = (n) => Number(n).toFixed(2), className = "" }) {
  const frac = Math.max(0, Math.min(1, fraction ?? (target > 0 ? now / target : 0)));
  const fill = state === "over" ? COLORS.ember : COLORS.amber;
  return (
    <div role="group" aria-label={label} className={`p-5 sm:p-6 rounded-sm ${className}`} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px]" style={{ color: COLORS.dim }}>{label}</span>
        <span dir="ltr" className="flex items-baseline gap-1.5" aria-live="polite">
          <span className="text-[32px] sm:text-[40px] font-medium leading-none" style={{ color: COLORS.ink }}>{format(now)}</span>
          <span className="text-sm" style={{ color: COLORS.dim }}>/ {format(target)} {unit}</span>
        </span>
      </div>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={Number(target)} aria-valuenow={Math.min(Number(now), Number(target))} className="relative h-4 mt-4">
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px" style={{ background: COLORS.line }} />
        <div aria-hidden="true" className="absolute top-1/2 h-0.5 -mt-px fill-anim" style={{ insetInlineStart: 0, width: `${frac * 100}%`, background: fill }} />
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} aria-hidden="true" className="absolute top-1/2 w-px -translate-y-1/2" style={{ insetInlineStart: `${i * 10}%`, height: i % 5 === 0 ? 16 : 8, background: i * 10 <= frac * 100 ? fill : COLORS.field }} />
        ))}
      </div>
      <div className="flex justify-between gap-4 mt-3 text-[13px]" style={{ color: COLORS.dim }}>
        <span dir="auto">{next}</span>
        <span dir="auto">{left}</span>
      </div>
    </div>
  );
}

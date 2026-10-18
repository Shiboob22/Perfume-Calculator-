import React from "react";
import { COLORS } from "../../lib/theme";
import { pourProgress } from "../../lib/pourProgress.js";

// The weight-scale progress indicator (v7, direction A "Weighed"): progress
// shown as grams on a ruled beam, with a brass pan that fills and a verdigris
// light when the reading is on target. Used wherever something is "this much
// of that": a pour, a quota, a stock level, reading progress.
//
// Pure display. The fill moves with `transform` only (a scaleX from the
// inline-start edge, so it mirrors in RTL) and is held still under reduced
// motion by `.fill-anim`. The numbers stay left-to-right in either language.
export default function WeightScale({ label, value, max, unit = "g", digits = 2, ticks = 4, tolerance = 0.05, target = null, format, labels, className = "" }) {
  const fmt = (n) => (format ? format(n) : Number(n).toFixed(digits));
  const m = Number(max) > 0 ? Number(max) : 0;
  const v = Math.max(0, Number(value) || 0);
  const fraction = m > 0 ? Math.min(1, v / m) : 0;
  const p = target == null ? null : pourProgress(v, Number(target), tolerance);
  const state = p?.state ?? null;
  const fill = state === "ok" ? COLORS.verdigris : state === "over" ? COLORS.ember : COLORS.amber;
  const spoken = `${label}: ${fmt(v)} ${unit} of ${fmt(m)} ${unit}${state && labels?.[state] ? `, ${labels[state]}` : ""}`;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm" style={{ color: COLORS.dim }}>{label}</span>
        <span dir="ltr" className="font-mono tabular-nums text-sm" style={{ color: state === "ok" ? COLORS.verdigrisText : COLORS.ink }}>
          <span className="text-xl font-serif">{fmt(v)}</span>
          <span style={{ color: COLORS.dim }}> / {fmt(m)} {unit}</span>
        </span>
      </div>
      <div role="meter" aria-label={spoken} aria-valuemin={0} aria-valuemax={m} aria-valuenow={Math.min(v, m)}
        className="relative mt-2 h-3 overflow-hidden" style={{ border: `1px solid ${COLORS.field}`, background: COLORS.card }}>
        <div className="fill-anim absolute inset-0 origin-left rtl:origin-right" style={{ background: fill, transform: `scaleX(${fraction})` }} />
        {Array.from({ length: Math.max(0, ticks - 1) }, (_, i) => (
          <span key={i} aria-hidden="true" className="absolute top-0 bottom-0 w-px" style={{ insetInlineStart: `${((i + 1) / ticks) * 100}%`, background: COLORS.paper, opacity: 0.8 }} />
        ))}
      </div>
      <div aria-hidden="true" className="mt-1 flex justify-between font-mono tabular-nums text-[11px]" style={{ color: COLORS.dim }}>
        {Array.from({ length: ticks + 1 }, (_, i) => <span key={i} dir="ltr">{fmt((m * i) / ticks)}</span>)}
      </div>
    </div>
  );
}

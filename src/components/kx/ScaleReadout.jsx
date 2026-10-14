import React from "react";
import { COLORS } from "../../lib/theme";
import { pourProgress } from "../../lib/pourProgress.js";
import Button from "./Button";

// A precision-scale display: large mono digits for the weight, a tare action
// and a live "poured vs target" bar. Pure display: the weight, target and
// formatting come from the caller (src/lib/calc does the arithmetic; the bar
// state comes from pourProgress). The digits are a single live region so a
// screen reader hears each settled weight with its unit and target.
export default function ScaleReadout({ label, grams, target = null, digits = 2, unit = "g", tolerance = 0.05, onTare, tareLabel, format, labels }) {
  const shown = format ? format(grams) : Number(grams).toFixed(digits);
  const p = target == null ? null : pourProgress(grams, target, tolerance);
  const state = p?.state ?? null;
  const barColor = state === "ok" ? COLORS.verdigris : state === "over" ? COLORS.ember : COLORS.resin;
  const spoken = target == null ? `${label}: ${shown} ${unit}` : `${label}: ${shown} ${unit} of ${format ? format(target) : Number(target).toFixed(digits)} ${unit}${labels?.[state] ? `, ${labels[state]}` : ""}`;
  return (
    <div role="group" aria-label={label} className="p-5 rounded-none" style={{ background: COLORS.inkBand, color: COLORS.onInk, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.onInk, opacity: 0.8 }}>{label}</span>
        {onTare && <Button variant="secondary" onClick={onTare} style={{ color: COLORS.onInk, borderColor: COLORS.onInk, minHeight: 36 }}>{tareLabel}</Button>}
      </div>
      <p aria-live="polite" aria-label={spoken} className="font-mono tabular-nums leading-none mt-3 flex items-baseline justify-end gap-2" dir="ltr">
        <span className="text-[clamp(2.5rem,10vw,4rem)]">{shown}</span>
        <span className="text-xl whitespace-nowrap" style={{ opacity: 0.7 }}>{unit}</span>
      </p>
      {p && (
        <div className="mt-4" dir="ltr">
          <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={Number(target)} aria-valuenow={Math.max(0, Math.min(Number(grams), Number(target)))}
            className="h-2 w-full relative" style={{ background: COLORS.line }}>
            <div className="h-full" style={{ width: `${p.fraction * 100}%`, background: barColor, transition: "width 320ms cubic-bezier(.2,0,0,1)" }} />
            <span aria-hidden="true" className="absolute top-[-3px] bottom-[-3px] w-px" style={{ insetInlineEnd: 0, background: COLORS.onInk }} />
          </div>
        </div>
      )}
    </div>
  );
}

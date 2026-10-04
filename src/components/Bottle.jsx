import React from "react";
import { COLORS } from "../lib/theme";
import { fmt2, weightRatio, weightShare } from "../lib/calc";

// The bench's two pictures of one batch, shared by the home bench, the
// calculator and the recipe card. Figures come in already computed; these
// only draw them.

/** A flacon filled as poured: oil at the bottom, ethanol (mist) above. */
export function BottleFill({ oilShare = 0, height = 180, label }) {
  const share = Math.min(1, Math.max(0, oilShare));
  return (
    <svg viewBox="0 0 120 160" height={height} width={height * 0.75} role={label ? "img" : undefined}
      aria-label={label} aria-hidden={label ? undefined : true} className="shrink-0">
      <rect x="45" y="4" width="30" height="18" fill={COLORS.ink} />
      <path d="M52 22v20M68 22v20" stroke={COLORS.ink} strokeWidth="1.5" />
      <rect x="20" y="58" width="80" height="88" fill={COLORS.mist} />
      <rect x="20" y="58" width="80" height="88" fill={COLORS.oil} className="pour"
        style={{ transformBox: "fill-box", transform: `scaleY(${share})` }} />
      <rect x="12" y="42" width="96" height="112" fill="none" stroke={COLORS.ink} strokeWidth="1.5" />
    </svg>
  );
}

/** Oil against ethanol by weight, with "1 : x by weight". */
export function RatioBar({ oilG, ethanolG, caption, className = "" }) {
  const share = weightShare(oilG, ethanolG);
  const r = weightRatio(oilG, ethanolG);
  return (
    <div className={className}>
      <div className="flex h-3 w-full overflow-hidden" style={{ border: `1px solid ${COLORS.ink}` }} aria-hidden="true">
        <span className="fill-anim block h-full" style={{ width: `${share * 100}%`, background: COLORS.oil }} />
        <span className="block h-full flex-1" style={{ background: COLORS.mist }} />
      </div>
      <p className="mt-2 flex justify-between gap-3 text-xs" style={{ color: COLORS.dim }}>
        <span dir="ltr" className="font-mono">{r === null ? "—" : `1 : ${fmt2(r)}`}</span>
        {caption && <span>{caption}</span>}
      </p>
    </div>
  );
}

/** A row of square segmented choices (bottle sizes, strengths). */
export function Segmented({ legend, options, value, onChange, mono = false }) {
  return (
    <fieldset>
      <legend className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal mb-2" style={{ color: COLORS.dim }}>{legend}</legend>
      <div className="flex flex-wrap" style={{ border: `1px solid ${COLORS.ink}` }}>
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)} dir="ltr"
              className={`flex-1 px-3 min-h-[44px] text-sm whitespace-nowrap ${mono ? "font-mono" : ""}`}
              style={{
                background: on ? COLORS.amber : "transparent",
                color: on ? COLORS.onAmber : COLORS.ink,
                borderInlineStart: i ? `1px solid ${COLORS.line}` : "none",
              }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

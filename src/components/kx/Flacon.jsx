import React, { useId } from "react";
import { COLORS, INGREDIENT_SWATCH } from "../../lib/theme";
import { BENCH_MOTION, RESIZE_EASE, ETHANOL_TINT, bottleScale, liquidShape, oilShade } from "../../lib/calc";

// The glass flacon on its weighing pan (Bench SaaS Phase 6, prototype's
// bottle SVG). Drawn from one frame of the bench clock: the oil (concentrate)
// fills its share of the glass under the pale ethanol, coloured by strength
// tier; a blend shows its materials as layers. While a pour runs the cap
// lifts, a stream falls, a ripple spreads and the surface wobbles to rest.
//
// The box is fixed (150 × 190), so the readout never shifts: the bottle
// scales inside it with a transform (compositor only, no layout), springing
// between sizes. Decoration: the figures are in the readout's text.
//
// `stand={false}` draws the bottle alone, without the weighing pan and its
// engraving (the home page's bench card), in a box of `box` = [width,
// height] that must hold the largest bottle it will show (100 mL is 104 ×
// 134 at scale 1).

const W = 104;
const H = 134;

export default function Flacon({ share = 0, flow = 0, wobble = 0, pct, totalMl, layers = [], theme = "light", stand = true, box = stand ? [150, 190] : [150, 172] }) {
  const id = useId().replace(/:/g, "");
  const k = bottleScale(totalMl);
  const liq = liquidShape(share, wobble, flow);
  const oil = oilShade(pct, theme);
  const eth = ETHANOL_TINT[theme] ?? ETHANOL_TINT.light;
  const ink = COLORS.ink;
  const u = (n) => `url(#${id}${n})`;
  return (
    <div aria-hidden="true" data-flacon className="flex-none flex flex-col items-center justify-end" style={{ width: box[0], height: box[1], contain: "layout" }}>
      <svg viewBox="0 0 120 155" width={W} height={H} data-scale-k={k.toFixed(3)}
        className="block overflow-visible kx-flacon" style={{ transform: `scale(${k})`, transformOrigin: "50% 100%", transition: `transform ${BENCH_MOTION.resize}ms ${RESIZE_EASE}` }}>
        <defs>
          <clipPath id={`${id}cav`}><path d="M24 50H96C98.5 50 100 51.5 100 54V139C100 141.5 98.5 143 96 143H24C21.5 143 20 141.5 20 139V54C20 51.5 21.5 50 24 50Z" /></clipPath>
          <linearGradient id={`${id}oil`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={oil.top} /><stop offset="1" stopColor={oil.deep} /></linearGradient>
          <linearGradient id={`${id}eth`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={eth.top} /><stop offset="1" stopColor={eth.deep} /></linearGradient>
          <linearGradient id={`${id}glass`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".32" /><stop offset=".18" stopColor="#FFFFFF" stopOpacity=".06" /><stop offset=".8" stopColor="#FFFFFF" stopOpacity=".02" /><stop offset="1" stopColor="#FFFFFF" stopOpacity=".24" /></linearGradient>
          <linearGradient id={`${id}metal`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6F6A61" /><stop offset=".35" stopColor="#E7E2D8" /><stop offset=".55" stopColor="#B3AEA4" /><stop offset="1" stopColor="#5E5951" /></linearGradient>
          <filter id={`${id}soft`} x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="1.1" /></filter>
        </defs>
        {/* liquid, inside the glass cavity */}
        <g clipPath={u("cav")}>
          <rect x="20" y="50" width="80" height="93" fill={u("eth")} />
          <path d={liq.oilPath} fill={u("oil")} data-oil />
          {layers.map((L, n) => <rect key={n} x="20" y={L.y} width="80" height={L.h} fill={INGREDIENT_SWATCH[L.type] ?? INGREDIENT_SWATCH.eo} opacity=".5" data-layer={L.type} />)}
          <rect x="20" y={liq.bandY} width="80" height="3" fill={oil.top} opacity=".45" filter={u("soft")} />
          <path d={liq.surfacePath} fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth=".8" />
          <ellipse cx="60" cy={liq.surfaceY} rx={liq.rippleRx} ry="1.1" fill="none" stroke="#FFFFFF" strokeOpacity={liq.rippleOpacity} strokeWidth=".7" />
        </g>
        <path d={liq.streamPath} fill={oil.top} opacity={flow} data-stream />
        {/* glass: outer wall, inner wall (thickness), heavy base, highlights, shoulder glint */}
        <path d="M48 30H72V38C72 42 76 44 82 44H98C103 44 106 47 106 52V146C106 151 103 154 98 154H22C17 154 14 151 14 146V52C14 47 17 44 22 44H38C44 44 48 42 48 38Z" fill={u("glass")} stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M24 50H96C98.5 50 100 51.5 100 54V139C100 141.5 98.5 143 96 143H24C21.5 143 20 141.5 20 139V54C20 51.5 21.5 50 24 50Z" fill="none" stroke={ink} strokeOpacity=".28" strokeWidth=".7" />
        <path d="M22 148.5H98" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="1" />
        <rect x="23.5" y="56" width="3.5" height="78" rx="1.75" fill="#FFFFFF" opacity=".5" />
        <rect x="29.5" y="58" width="1" height="60" rx=".5" fill="#FFFFFF" opacity=".28" />
        <path d="M92 47.5C95 47.5 97.5 48.5 99 50.5" stroke="#FFFFFF" strokeOpacity=".85" strokeWidth="1" strokeLinecap="round" fill="none" />
        {/* brushed metal cap with ridges; lifts while pouring */}
        <g data-cap={flow > 0 ? "up" : "down"} className="kx-cap" style={{ transform: `translateY(${flow > 0 ? -12 : 0}px)`, opacity: flow > 0 ? 0.4 : 1, transition: "transform 200ms ease, opacity 200ms ease" }}>
          <rect x="44" y="26" width="32" height="5" rx="1" fill={u("metal")} stroke={ink} strokeWidth=".8" />
          <rect x="40" y="4" width="40" height="23" rx="2" fill={u("metal")} stroke={ink} strokeWidth="1" />
          <path d="M44 6.5V24.5M47.5 6.5V24.5M51 6.5V24.5M54.5 6.5V24.5M58 6.5V24.5M61.5 6.5V24.5M65 6.5V24.5M68.5 6.5V24.5M72 6.5V24.5M75.5 6.5V24.5" stroke="#000000" strokeOpacity=".14" strokeWidth=".6" />
          <rect x="41.5" y="5" width="37" height="2" rx="1" fill="#FFFFFF" opacity=".35" />
        </g>
      </svg>
      {stand && <>
        <div style={{ width: 144, height: 5, marginTop: -1, boxSizing: "border-box", borderRadius: 3, background: "linear-gradient(180deg,#EDE9E1,#9A958C 60%,#6F6A61)", border: `1px solid ${ink}` }} />
        {/* Engraved text as generated content: an engraving is decoration, not text to contrast-check. */}
        <div dir="ltr" data-engrave={`${Math.round(Math.max(0, Number(totalMl) || 0))} mL`} className="flex items-center justify-center before:content-[attr(data-engrave)]"
          style={{ width: 112, height: 12, borderRadius: "0 0 4px 4px", background: "linear-gradient(180deg,#3A352D,#1B1814)", boxShadow: "0 8px 12px -8px rgba(0,0,0,.5)", fontFamily: "'Share Tech Mono', ui-monospace, monospace", fontSize: 8, letterSpacing: ".18em", color: "rgba(234,223,206,.55)" }} />
      </>}
    </div>
  );
}

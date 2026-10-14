import React from "react";
import { SYMBOL, SYMBOL_BOX, LOCKUPS } from "./logoData";

// The Kyphira logo, from the owner's files (design/logo/). The ink follows the
// text colour (`currentColor`), so the same component serves the light paper
// and the dark edition; the brass of the flame and the censer's mark is the
// brand's own and does not change with the theme.
//   form "symbol"      the mark alone (flacon, smoke, flame)
//   form "horizontal"  mark + outlined wordmark, side by side
//   form "stacked"     mark above the outlined wordmark
// `height` is the rendered height in px. The wordmark is outlined Latin
// letters: where the brand is shown in Arabic use the symbol and live text.

const [, , BOX_W, BOX_H] = SYMBOL_BOX.split(" ").map(Number);

const part = (p, i) =>
  p.stroke
    ? <path key={i} d={p.d} fill="none" stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" />
    : <path key={i} d={p.d} fill={p.fill === "ink" ? "currentColor" : p.fill} />;

export function SymbolParts() {
  return <>{SYMBOL.map(part)}</>;
}

export default function KyphiraLogo({ form = "symbol", height = 40, title }) {
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": "true", focusable: "false" };
  if (form === "symbol") {
    return (
      <svg viewBox={SYMBOL_BOX} height={height} width={Math.round((height * BOX_W) / BOX_H * 100) / 100} fill="none" {...a11y}>
        <SymbolParts />
      </svg>
    );
  }
  const l = LOCKUPS[form];
  const [, , w, h] = l.viewBox.split(" ").map(Number);
  return (
    <svg viewBox={l.viewBox} height={height} width={Math.round((height * w) / h * 100) / 100} fill="none" {...a11y}>
      <g transform={l.symbol}><SymbolParts /></g>
      <g transform={l.word.transform}><path d={l.word.d} fill="currentColor" /></g>
    </svg>
  );
}

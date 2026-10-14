import React from "react";
import { COLORS } from "../lib/theme";
import KyphiraMark from "./kx/KyphiraMark";

// The brand mark, at the size every header, footer and sign-in already asks
// for. Direction A (censer with smoke) is the chosen mark; the other two stay
// in the styleguide. `color` is the vessel's colour; the smoke is resin.
export default function FlaconMark({ size = 34, color = COLORS.ink }) {
  return (
    <span style={{ color }} className="inline-flex">
      <KyphiraMark variant="A" size={size} inkColor="currentColor" />
    </span>
  );
}

/** Mark + wordmark + italic tagline. */
export function BrandMark({ tagline = true, color = COLORS.ink, brand, sub, signature }) {
  return (
    <span className="inline-flex items-center gap-3" style={{ color }}>
      <FlaconMark size={34} color={color} />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[22px] tracking-[-0.02em] rtl:tracking-normal">{brand}</span>
        {tagline && <span className="font-serif italic text-[13px] mt-1" style={{ opacity: 0.8 }}>{sub}</span>}
        {tagline && signature && <span className="font-serif italic text-[12px] mt-0.5" style={{ color: COLORS.brass }}>{signature}</span>}
      </span>
    </span>
  );
}

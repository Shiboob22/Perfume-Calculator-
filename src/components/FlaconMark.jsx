import React from "react";
import { COLORS } from "../lib/theme";
import KyphiraLogo from "./kx/KyphiraLogo";

// The brand mark (the owner's logo, design/logo/), at the size every header,
// footer and sign-in already asks for. The symbol is a tall flacon, so `size`
// sets its width class of the old square mark: it renders 1.25 × `size` high.
// `color` is the ink; the flame is the brand's brass.
export default function FlaconMark({ size = 34, color = COLORS.ink }) {
  return (
    <span style={{ color }} className="inline-flex">
      <KyphiraLogo form="symbol" height={Math.round(size * 1.25)} />
    </span>
  );
}

/** Mark + wordmark + italic tagline. */
export function BrandMark({ tagline = true, color = COLORS.ink, brand, sub, signature }) {
  return (
    <span className="inline-flex items-center gap-3" style={{ color }}>
      <FlaconMark size={40} color={color} />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[22px] tracking-[-0.02em] rtl:tracking-normal">{brand}</span>
        {tagline && <span className="font-serif italic text-[13px] mt-1" style={{ opacity: 0.8 }}>{sub}</span>}
        {tagline && signature && <span className="font-serif italic text-[12px] mt-0.5" style={{ color: COLORS.brass }}>{signature}</span>}
      </span>
    </span>
  );
}

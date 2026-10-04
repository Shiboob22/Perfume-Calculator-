import React from "react";
import { COLORS } from "../lib/theme";

// The brand flacon (v3): ink outline, solid ink cap, one oil liquid line.
export default function FlaconMark({ size = 34, color = COLORS.ink }) {
  return (
    <svg width={size * 0.78} height={size} viewBox="0 0 28 36" fill="none" aria-hidden="true" style={{ color }}>
      <rect x="10" y="1" width="8" height="5" fill="currentColor" />
      <path d="M12 6v3.5M16 6v3.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3.7" y="10.2" width="20.6" height="24.1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 24.5h15" stroke={COLORS.oil} strokeWidth="2.4" />
    </svg>
  );
}

/** Flacon + wordmark + italic tagline. */
export function BrandMark({ tagline = true, color = COLORS.ink, brand, sub, signature }) {
  return (
    <span className="inline-flex items-center gap-3" style={{ color }}>
      <FlaconMark size={30} color={color} />
      <span className="flex flex-col leading-none">
        <span className="font-sans font-medium text-[19px] tracking-[-0.03em] rtl:tracking-normal">{brand}</span>
        {tagline && <span className="font-serif italic text-[13px] mt-1" style={{ opacity: 0.8 }}>{sub}</span>}
        {tagline && signature && <span className="font-serif italic text-[12px] mt-0.5" style={{ color: COLORS.brass }}>— {signature}</span>}
      </span>
    </span>
  );
}

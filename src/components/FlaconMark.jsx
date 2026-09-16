import React from "react";
import { COLORS } from "../lib/theme";

export default function FlaconMark({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size * 1.24}
      viewBox="0 0 42 52"
      fill="none"
      aria-hidden="true"
    >
      <rect x="14" y="4" width="14" height="9" rx="1.5" fill={COLORS.brass} />
      <rect x="17" y="0" width="8" height="5" rx="1" fill={COLORS.brass} />
      <path
        d="M10 15 C10 12 14 13 14 13 L28 13 C28 13 32 12 32 15 L34 46 C34 49.3 31.3 52 28 52 L14 52 C10.7 52 8 49.3 8 46 Z"
        fill={COLORS.forest}
      />
      <rect x="12" y="24" width="18" height="1.2" fill={COLORS.paper} opacity="0.5" />
      <rect x="12" y="30" width="18" height="1.2" fill={COLORS.paper} opacity="0.5" />
    </svg>
  );
}

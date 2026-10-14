import React from "react";
import { COLORS } from "../../lib/theme";

// A thin line of smoke: a section divider, or (with `loading`) a progress
// state. The drift is CSS (see .kx-smoke in src/index.css) and stops under
// prefers-reduced-motion, leaving the line still. Decorative: hidden from
// assistive tech; a loading state needs its own text (`label`, announced
// through role="status").
export default function SmokeLine({ loading = false, label, className = "" }) {
  const line = (
    <svg className={`kx-smoke ${loading ? "kx-smoke--loading" : ""} ${className}`} viewBox="0 0 600 14" preserveAspectRatio="none" width="100%" height="14" aria-hidden="true" focusable="false">
      <path d="M0 7c25-8 50 8 75 0s50-8 75 0 50 8 75 0 50-8 75 0 50 8 75 0 50-8 75 0 50 8 75 0 50-8 75 0" stroke={loading ? COLORS.resin : COLORS.line} strokeWidth="1.200" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
  return loading ? <div role="status" className="w-full">{line}<span className="sr-only">{label}</span></div> : line;
}

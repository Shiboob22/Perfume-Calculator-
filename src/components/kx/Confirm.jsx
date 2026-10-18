import React from "react";
import { COLORS } from "../../lib/theme";

// A small confirmation: a check that draws itself, then the words. The status
// region stays in the page when empty (so a screen reader hears the text when
// it arrives); the mark restarts for each new message. Still under reduced motion.
export default function Confirm({ children, className = "", ...rest }) {
  return (
    <p role="status" className={`text-sm ${className}`} style={{ color: COLORS.verdigrisText }} {...rest}>
      {children ? (
        <span key={String(children)} className="kx-confirm inline-flex items-center gap-2">
          <svg className="kx-tick shrink-0" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true" focusable="false">
            <path d="M3 9.5l4 4 8-9" pathLength="24" />
          </svg>
          {children}
        </span>
      ) : null}
    </p>
  );
}

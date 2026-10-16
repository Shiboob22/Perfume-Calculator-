import React from "react";
import { Link } from "../../motion";
import { COLORS } from "../../lib/theme";

// A note, accord, family, filter or tag. One look everywhere (Atlas, Nose,
// Wardrobe, Salon). Given `to`, it is a link with a 44 px target; given
// `onToggle`, a toggle button (`pressed` = surface-2 with a resin border, the
// board's filter chip) with an optional `count`; otherwise a label.
export default function Chip({ to, onToggle, pressed = false, count, children, className = "" }) {
  if (to) {
    return (
      <Link to={to} className={`inline-flex items-center min-h-[44px] px-3 text-[13px] border hover:underline underline-offset-4 ${className}`}
        style={{ borderColor: COLORS.field, color: COLORS.ink }}>{children}</Link>
    );
  }
  if (onToggle) {
    return (
      <button type="button" aria-pressed={pressed} onClick={onToggle}
        className={`inline-flex items-center gap-2 min-h-[44px] px-3.5 text-sm border rounded ${className}`}
        style={{ borderColor: pressed ? COLORS.actionText : COLORS.line, background: pressed ? COLORS.sand : "transparent", color: pressed ? COLORS.ink : COLORS.inkSoft }}>
        {children}
        {count != null && <span className="text-xs tabular-nums" style={{ color: COLORS.dim }}>{count}</span>}
      </button>
    );
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[13px] border rounded ${className}`} style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}>{children}</span>
  );
}

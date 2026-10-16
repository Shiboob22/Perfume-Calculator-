import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";

// A note, accord, family, filter or tag (Design System IV, "Chips"): 44 px
// high, 2 px radius, a hairline border; selected turns the border resin on
// the raised surface. One look everywhere (Atlas, Nose, Wardrobe, Library).
//   - given `to`: a link;
//   - given `onClick` or `pressed`: a toggle button (aria-pressed);
//   - otherwise a quiet label.
// `count` is the small tabular figure after the name.
export default function Chip({ to, onClick, pressed, count, children, className = "" }) {
  const body = <>{children}{count != null && <span className="ms-2 text-xs" style={{ color: COLORS.dim }}>{count}</span>}</>;
  if (to) {
    return (
      <Link to={to} className={`inline-flex items-center min-h-[44px] px-3.5 text-sm border rounded-sm hover:border-[color:var(--c-dim)] ${className}`}
        style={{ borderColor: COLORS.line, color: COLORS.ink }}>{body}</Link>
    );
  }
  if (onClick || pressed !== undefined) {
    const on = !!pressed;
    return (
      <button type="button" onClick={onClick} aria-pressed={on}
        className={`inline-flex items-center min-h-[44px] px-3.5 text-sm border rounded-sm hover:border-[color:var(--c-dim)] ${className}`}
        style={{ borderColor: on ? COLORS.amber : COLORS.line, background: on ? COLORS.cardHi : "transparent", color: on ? COLORS.ink : COLORS.inkSoft }}>{body}</button>
    );
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[13px] border rounded-sm ${className}`} style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}>{body}</span>
  );
}

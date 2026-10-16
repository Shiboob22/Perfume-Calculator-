import React from "react";
import { Link } from "../../motion";
import { COLORS } from "../../lib/theme";

// A note, accord, family or tag. One look everywhere (Atlas, Nose, Wardrobe,
// Salon). Given `to`, it is a link with a 44 px target; otherwise a label.
export default function Chip({ to, children, className = "" }) {
  if (to) {
    return (
      <Link to={to} className={`inline-flex items-center min-h-[44px] px-3 text-[13px] border hover:underline underline-offset-4 ${className}`}
        style={{ borderColor: COLORS.field, color: COLORS.ink }}>{children}</Link>
    );
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[13px] border ${className}`} style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}>{children}</span>
  );
}

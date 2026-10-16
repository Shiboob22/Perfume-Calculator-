import React from "react";
import { COLORS } from "../../lib/theme";

const VARIANTS = {
  primary: { background: COLORS.amber, color: COLORS.onAmber, border: `1px solid ${COLORS.amber}` },
  secondary: { background: "transparent", color: COLORS.ink, border: `1px solid ${COLORS.ink}` },
  ghost: { background: "transparent", color: COLORS.ink, border: "1px solid transparent" },
  danger: { background: "transparent", color: COLORS.danger, border: `1px solid ${COLORS.danger}` },
};
const SIZES = { md: "min-h-[44px] px-5 text-sm", lg: "min-h-[52px] px-6 text-base" };

// One button for the whole product. Square, 44 px minimum target, focus ring
// from the palette. `as="a"` renders a link with the same look.
export default function Button({ variant = "primary", size = "md", as: Tag = "button", loading = false, disabled, className = "", style, children, ...rest }) {
  const off = disabled || loading;
  return (
    <Tag
      type={Tag === "button" ? rest.type || "button" : undefined}
      disabled={Tag === "button" ? off : undefined}
      aria-disabled={off || undefined}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${SIZES[size]} ${off ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"} ${className}`}
      style={{ ...VARIANTS[variant], ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

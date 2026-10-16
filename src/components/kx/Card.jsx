import React from "react";
import { COLORS } from "../../lib/theme";

// A raised surface with a catalogue number ("No. 015"). `tone="inset"` is the
// quieter sand surface used inside other cards.
export default function Card({ no, title, tone = "raised", as: Tag = "section", className = "", children, ...rest }) {
  const background = tone === "inset" ? COLORS.sand : COLORS.card;
  return (
    <Tag className={`p-5 sm:p-6 rounded ${className}`} style={{ background, border: `1px solid ${COLORS.line}` }} {...rest}>
      {(no != null || title) && (
        <header className="flex items-baseline justify-between gap-4 mb-4">
          {title && <h3 className="font-serif italic text-xl" style={{ color: COLORS.ink }}>{title}</h3>}
          {no != null && <span className="font-mono tabular-nums text-xs" style={{ color: COLORS.dim }}>{catalogueNumber(no)}</span>}
        </header>
      )}
      {children}
    </Tag>
  );
}

/** 15 → "No. 015". Catalogue numbers are three digits, zero-padded. */
export function catalogueNumber(n) {
  return `No. ${String(Math.max(0, Math.trunc(Number(n) || 0))).padStart(3, "0")}`;
}

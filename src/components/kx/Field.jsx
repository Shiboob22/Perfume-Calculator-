import React, { useId } from "react";
import { COLORS } from "../../lib/theme";

// A labelled text input. The label is a real <label>; hint and error are
// tied to the input with aria-describedby, and an error is announced.
export default function Field({ label, hint, error, mono = false, className = "", ...rest }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`w-full min-h-[44px] px-3 rounded-none focus-visible:outline-none focus-visible:ring-2 ${mono ? "font-mono tabular-nums" : ""}`}
        style={{ background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${error ? COLORS.danger : COLORS.field}` }}
        {...rest}
      />
      {hint && <p id={`${id}-hint`} className="text-xs mt-1.5" style={{ color: COLORS.dim }}>{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="text-xs mt-1.5" style={{ color: COLORS.danger }}>{error}</p>}
    </div>
  );
}

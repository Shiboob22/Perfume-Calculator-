import React, { useId } from "react";
import { COLORS } from "../../lib/theme";

export const inputStyle = { background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` };
export const inputClass = "w-full min-h-[44px] px-3 rounded focus-visible:outline-none focus-visible:ring-2";

// A labelled <select> in the product's form style.
export function SelectField({ label, value, onChange, options, className = "" }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} style={inputStyle}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// A money amount in the bottle's currency: "30.00 EGP".
export const money = (amount, currency) => `${amount.toFixed(2)}${currency ? ` ${currency}` : ""}`;

export function Heading({ children, as: Tag = "h2" }) {
  return <Tag className="font-serif italic text-2xl mb-3" style={{ color: COLORS.ink }}>{children}</Tag>;
}

// The shared chip lives in kx; re-exported for the rooms that import it here.
export { default as Chip } from "../kx/Chip";

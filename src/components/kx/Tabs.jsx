import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";

// Underlined tabs (Design System IV, "Tabs"): 48 px high, a 2 px resin rule
// under the selected one, a hairline under the row. Arrow keys move between
// tabs (mirrored in Arabic); the row scrolls sideways rather than wrapping.
// tabs: [{ id, label, count? }]
export default function Tabs({ tabs, value, onChange, label, idPrefix = "tab", className = "" }) {
  const refs = useRef([]);
  const onKeyDown = (e, i) => {
    const rtl = document.documentElement.dir === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    const to = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : step == null ? null : (i + step + tabs.length) % tabs.length;
    if (to == null) return;
    e.preventDefault();
    onChange(tabs[to].id);
    refs.current[to]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={`flex overflow-x-auto ${className}`} style={{ borderBottom: `1px solid ${COLORS.line}`, scrollbarWidth: "none" }}>
      {tabs.map((tab, i) => {
        const on = tab.id === value;
        return (
          <button key={tab.id} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`${idPrefix}-${tab.id}`} aria-selected={on} aria-controls={`${idPrefix}-${tab.id}-panel`}
            tabIndex={on ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={(e) => onKeyDown(e, i)}
            className="min-h-[48px] px-5 whitespace-nowrap text-[15px] hover:text-[color:var(--c-ink)] focus-visible:outline-offset-[-2px]"
            style={{ color: on ? COLORS.ink : COLORS.inkSoft, boxShadow: `inset 0 -2px 0 ${on ? COLORS.amber : "transparent"}` }}>
            {tab.label}
            {tab.count != null && <span className="ms-2 text-xs" style={{ color: COLORS.dim }}>{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Underlined links that look like Tabs but navigate (the Atlas's sections).
 * tabs: [{ id, label, to }]; `value` is the id of the page you are on.
 */
export function TabLinks({ tabs, value, label, className = "" }) {
  return (
    <nav aria-label={label} className={`flex overflow-x-auto ${className}`} style={{ borderBottom: `1px solid ${COLORS.line}`, scrollbarWidth: "none" }}>
      {tabs.map((tab) => {
        const on = tab.id === value;
        return (
          <Link key={tab.id} to={tab.to} aria-current={on ? "page" : undefined}
            className="min-h-[48px] px-5 whitespace-nowrap text-[15px] inline-flex items-center hover:text-[color:var(--c-ink)] focus-visible:outline-offset-[-2px]"
            style={{ color: on ? COLORS.ink : COLORS.inkSoft, boxShadow: `inset 0 -2px 0 ${on ? COLORS.amber : "transparent"}` }}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

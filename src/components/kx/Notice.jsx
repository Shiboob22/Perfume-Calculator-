import React from "react";
import { COLORS } from "../../lib/theme";
import { IconFlameTriangle } from "../icons";

const TONES = {
  info: { border: COLORS.line, bar: COLORS.resin, text: COLORS.ink },
  success: { border: COLORS.line, bar: COLORS.verdigris, text: COLORS.ink },
  // The ethanol notice and other safety warnings: always visible, never dismissible.
  warning: { border: COLORS.dangerLine, bar: COLORS.ember, text: COLORS.ink },
};

// A short message with a coloured bar. `onDismiss` adds a close button
// (not for warnings). Warnings announce as alerts; the rest as status.
export default function Notice({ tone = "info", title, children, onDismiss, dismissLabel, className = "" }) {
  const c = TONES[tone];
  const warning = tone === "warning";
  return (
    <div role={warning ? "alert" : "status"} className={`flex gap-3 items-start p-4 rounded-none ${className}`}
      style={{ background: warning ? COLORS.dangerBg : COLORS.card, border: `1px solid ${c.border}`, borderInlineStart: `4px solid ${c.bar}`, color: c.text }}>
      {warning && <IconFlameTriangle size={20} />}
      <div className="flex-1 text-sm leading-relaxed">
        {title && <p className="font-medium mb-0.5">{title}</p>}
        <div style={{ color: COLORS.inkSoft }}>{children}</div>
      </div>
      {onDismiss && !warning && (
        <button type="button" onClick={onDismiss} aria-label={dismissLabel}
          className="min-w-[44px] min-h-[44px] -m-3 inline-flex items-center justify-center text-lg focus-visible:outline-none focus-visible:ring-2" style={{ color: COLORS.ink }}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

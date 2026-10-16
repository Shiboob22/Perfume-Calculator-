import React from "react";
import { useNavigate } from "../motion";
import { COLORS } from "../lib/theme";
import { Stagger } from "../motion";

// A first-visit panel: what this tab is for, and the one step that fills it.
export default function EmptyState({ title, text, action, to }) {
  const navigate = useNavigate();
  return (
    <Stagger eager className="p-6 rounded text-center" style={{ background: "transparent", border: `1px dashed ${COLORS.line}` }}>
      {title && <p className="font-serif text-xl mb-1" style={{ color: COLORS.ink }}>{title}</p>}
      <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: COLORS.inkSoft }}>{text}</p>
      <button type="button" onClick={() => navigate(to)} className="kx-fill px-4 min-h-[44px] rounded text-sm font-semibold"
        style={{ background: COLORS.amber, color: COLORS.onAmber }}>
        {action}
      </button>
    </Stagger>
  );
}

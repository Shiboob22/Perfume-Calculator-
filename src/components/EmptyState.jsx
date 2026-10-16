import React from "react";
import { useNavigate } from "../motion";
import { COLORS } from "../lib/theme";
import { Stagger } from "../motion";

// A first-visit panel: what this tab is for, and the one step that fills it.
export default function EmptyState({ text, action, to }) {
  const navigate = useNavigate();
  return (
    <Stagger eager className="p-6 rounded-none text-center" style={{ background: COLORS.card, border: `1px dashed ${COLORS.line}` }}>
      <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: COLORS.inkSoft }}>{text}</p>
      <button type="button" onClick={() => navigate(to)} className="px-4 py-2 rounded-none text-sm font-semibold"
        style={{ background: COLORS.amber, color: COLORS.onAmber }}>
        {action}
      </button>
    </Stagger>
  );
}

import React from "react";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../lib/theme";

// A first-visit panel: what this tab is for, and the one step that fills it.
export default function EmptyState({ text, action, to }) {
  const navigate = useNavigate();
  return (
    <div className="p-6 rounded-xl text-center" style={{ background: COLORS.card, border: `1px dashed ${COLORS.line}` }}>
      <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: COLORS.inkSoft }}>{text}</p>
      <button type="button" onClick={() => navigate(to)} className="px-4 py-2 rounded-lg text-sm font-semibold"
        style={{ background: COLORS.amber, color: COLORS.onAmber }}>
        {action}
      </button>
    </div>
  );
}

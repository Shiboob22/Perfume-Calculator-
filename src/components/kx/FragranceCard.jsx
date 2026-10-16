import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import Chip from "./Chip";
import { catalogueNumber } from "./Card";

// One fragrance, the same card wherever it appears (Atlas results, Nose
// picks): name (a link when there is a page), its facts as a short list,
// then accord chips. `matched` accords are marked in resin so a reader sees
// why it was chosen; `children` carries room-specific lines (a reason).
export default function FragranceCard({ name, href, facts = [], accords = [], matched = [], no, as: Tag = "li", children }) {
  const hit = new Set(matched.map((a) => a.toLowerCase()));
  const shown = facts.filter(Boolean);
  return (
    <Tag className="p-4 sm:p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-baseline justify-between gap-3">
        {href
          ? <Link to={href} className="font-serif text-xl underline-offset-4 hover:underline" style={{ color: COLORS.ink }}>{name}</Link>
          : <p className="font-serif text-xl" style={{ color: COLORS.ink }}>{name}</p>}
        {no != null && <span className="font-mono tabular-nums text-xs shrink-0" style={{ color: COLORS.dim }}>{catalogueNumber(no)}</span>}
      </div>
      {shown.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm list-none p-0" style={{ color: COLORS.inkSoft }}>
          {shown.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
      {children}
      {accords.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-3 list-none p-0">
          {accords.map((a) => (
            <li key={a}>
              {hit.has(a.toLowerCase())
                ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] border" style={{ borderColor: COLORS.actionText, color: COLORS.ink }}>
                    <span aria-hidden="true" className="w-1.5 h-1.5" style={{ background: COLORS.resin }} />{a}
                  </span>
                : <Chip>{a}</Chip>}
            </li>
          ))}
        </ul>
      )}
    </Tag>
  );
}

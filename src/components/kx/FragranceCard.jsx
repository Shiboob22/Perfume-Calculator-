import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { cat } from "../../lib/catalogue";

// One fragrance, the same ruled row wherever it appears (Atlas results, Nose
// picks; Design/boards "Atlas"): a catalogue number, the name in serif (a
// link when there is a page) with its house under it, the other facts, and
// the accords as a line of text. `matched` accords are marked with a resin
// dot so a reader sees why it was chosen; `children` carries room-specific
// lines (a reason).
export default function FragranceCard({ name, href, facts = [], accords = [], matched = [], no, as: Tag = "li", children }) {
  const hit = new Set(matched.map((a) => a.toLowerCase()));
  const [house, ...rest] = facts.filter(Boolean);
  return (
    <Tag className="grid gap-x-6 gap-y-1.5 py-5 sm:grid-cols-[88px_minmax(0,1.3fr)_minmax(0,1fr)]" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
      <span dir="ltr" className="hidden sm:block text-xs tracking-[0.06em] pt-2" style={{ color: COLORS.dim }}>{no != null ? cat("A", no, 5) : ""}</span>
      <div className="min-w-0">
        {href
          ? <Link to={href} className="font-serif text-[26px] leading-tight rtl:leading-[1.5] underline-offset-4 hover:underline" style={{ color: COLORS.ink }}>{name}</Link>
          : <p className="font-serif text-[26px] leading-tight rtl:leading-[1.5]" style={{ color: COLORS.ink }}>{name}</p>}
        {house && <p className="text-sm mt-0.5" style={{ color: COLORS.dim }}>{house}</p>}
        {children}
      </div>
      <div className="min-w-0 text-sm flex flex-col gap-1" style={{ color: COLORS.inkSoft }}>
        {rest.length > 0 && <p>{rest.join(" · ")}</p>}
        {accords.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-0.5 list-none p-0" style={{ color: COLORS.dim }}>
            {accords.map((a) => (
              <li key={a} className="inline-flex items-center gap-1.5" style={hit.has(a.toLowerCase()) ? { color: COLORS.ink } : undefined}>
                {hit.has(a.toLowerCase()) && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.resin }} />}{a}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Tag>
  );
}

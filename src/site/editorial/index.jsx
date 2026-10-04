import React from "react";
import { COLORS, TYPE } from "../../lib/theme";

// The book's furniture, shared by every public page (Phase 9). Small and
// prop-driven; nothing here fetches or computes.

/** "III · Formulation" over a page or chapter, with an optional big numeral. */
export function ChapterMark({ volume, label, numeral, className = "" }) {
  return (
    <div className={`flex items-end gap-4 ${className}`}>
      {numeral && <span aria-hidden="true" dir="ltr" className={`${TYPE.numeral} text-6xl sm:text-7xl`} style={{ color: COLORS.amberDeep }}>{numeral}</span>}
      <p className={TYPE.runningHead} style={{ color: COLORS.amberDeep }}>
        {volume && <span dir="ltr">{volume}</span>}{volume && label ? " · " : ""}{label}
      </p>
    </div>
  );
}

/** A page-foot line, like the printed folio. */
export function Folio({ children }) {
  return (
    <p className="folio mt-16 pt-4 text-xs flex justify-between gap-4" style={{ color: COLORS.dim, borderTop: `1px solid ${COLORS.line}` }}>
      {children}
    </p>
  );
}

/** A hairline, or the handbook's ornament between parts. */
export function Rule({ ornament = false }) {
  if (!ornament) return <hr className="my-12 border-0 h-px" style={{ background: COLORS.line }} />;
  return (
    <div aria-hidden="true" className="my-12 flex items-center gap-4" style={{ color: COLORS.amberDeep }}>
      <span className="flex-1 h-px" style={{ background: COLORS.line }} />
      <span className="font-serif italic">❦</span>
      <span className="flex-1 h-px" style={{ background: COLORS.line }} />
    </div>
  );
}

/** A note in the margin on wide screens, inline on a phone. */
export function MarginNote({ children }) {
  return (
    <aside className="my-4 text-sm leading-relaxed lg:float-end lg:clear-end lg:w-56 lg:-me-64 lg:my-0 lg:ps-4 lg:border-s" style={{ color: COLORS.inkSoft, borderColor: COLORS.line }}>
      {children}
    </aside>
  );
}

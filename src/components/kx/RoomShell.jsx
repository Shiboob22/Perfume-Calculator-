import React from "react";
import { Link } from "../../motion";
import { COLORS } from "../../lib/theme";
import RoomHeader from "./RoomHeader";
import RoomBeam from "./RoomBeam";

// The six rooms, in the order the home scene shows them. The beam at the top
// of every room marks which of the six you are standing in.
const ORDER = ["I", "II", "III", "IV", "V", "VI"];

// The page frame for a room (v7, direction A "Weighed"): a ruled beam across
// the top with the current room as the brass pan, then, on wide screens, a
// sticky rail (numeral, name, lead, sections as a vertical scale) beside the
// work. On phones the rail stacks above the work and the sections scroll
// sideways as one row. Pure layout: no data, no motion.
//
// `nav` items are { id, label, active, to | onClick }; a `to` renders a link,
// an `onClick` a button, both with aria-current on the active one.
export default function RoomShell({ numeral, name, title, headline, lead, notice, nav, navLabel, wide = false, children }) {
  const at = Math.max(0, ORDER.indexOf(numeral));
  return (
    <div className={`mx-auto px-4 sm:px-8 pt-6 pb-12 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
      <RoomBeam at={at} />
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <RoomHeader numeral={numeral} name={name} title={title} headline={headline} compact />
          {lead && <p className="text-sm max-w-prose" style={{ color: COLORS.inkSoft }}>{lead}</p>}
          {notice}
          {nav && (
            <nav aria-label={navLabel} className="flex gap-1 overflow-x-auto mt-5 mb-6 lg:mb-0 lg:mt-8 lg:flex-col lg:overflow-visible border-b lg:border-b-0 lg:border-s" style={{ borderColor: COLORS.line }}>
              {nav.map((n) => {
                const cls = "px-4 text-[15px] min-h-[48px] inline-flex items-center whitespace-nowrap -mb-px border-b-2 lg:mb-0 lg:-ms-px lg:border-b-0 lg:border-s-2 lg:px-4 text-start";
                const style = { borderColor: n.active ? COLORS.amber : "transparent", color: n.active ? COLORS.ink : COLORS.inkSoft, fontWeight: n.active ? 600 : 400 };
                return n.to ? (
                  <Link key={n.id} to={n.to} aria-current={n.active ? "page" : undefined} className={cls} style={style}>{n.label}</Link>
                ) : (
                  <button key={n.id} type="button" onClick={n.onClick} aria-current={n.active ? "page" : undefined} className={cls} style={style}>{n.label}</button>
                );
              })}
            </nav>
          )}
        </div>
        <div className="min-w-0 mt-6 lg:mt-0">{children}</div>
      </div>
    </div>
  );
}

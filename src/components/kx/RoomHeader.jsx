import React from "react";
import { COLORS } from "../../lib/theme";

// The head of every room (Design/boards, "Wardrobe", "Bench", …): the room's
// Roman numeral and name as a caption, one Newsreader line as the title, and
// the record's catalogue number at the far end ("W·0012", always left to right).
export default function RoomHeader({ num, kicker, title, cat, children, className = "" }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-6 ${className}`}>
      <div className="flex flex-col gap-2.5 min-w-0">
        {(num || kicker) && (
          <span className="flex items-baseline gap-3 text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case" style={{ color: COLORS.dim }}>
            {num && <span dir="ltr" className="font-serif text-base tracking-[0.06em] normal-case" style={{ color: COLORS.actionText }}>{num}</span>}
            {kicker}
          </span>
        )}
        <h1 className="font-serif font-light text-[40px] md:text-[64px] leading-[1.1] rtl:leading-[1.45] tracking-[-0.01em] rtl:tracking-normal" style={{ color: COLORS.ink }}>{title}</h1>
      </div>
      {(cat || children) && (
        <div className="flex flex-col items-end gap-1">
          {cat && <span dir="ltr" className="text-sm tracking-[0.06em]" style={{ color: COLORS.dim }}>{cat}</span>}
          {children}
        </div>
      )}
    </div>
  );
}

/** The room's page frame: 48 px margins on a desktop, 16 px on a phone, 40 / 28 px between blocks. */
export function RoomPage({ children, className = "", as: Tag = "div" }) {
  return <Tag className={`px-4 sm:px-6 lg:px-12 pt-8 md:pt-14 pb-24 flex flex-col gap-7 md:gap-10 ${className}`}>{children}</Tag>;
}

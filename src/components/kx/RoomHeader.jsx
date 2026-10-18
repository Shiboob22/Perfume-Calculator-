import React from "react";
import { COLORS, TYPE } from "../../lib/theme";
import { TextReveal } from "../../motion";

// The head of a room (board: "II · The Wardrobe", then the room's line in the
// display face). The numeral is LTR in both languages. The h1 is always a real
// heading naming the room or its title; what differs is how it is drawn:
//   headline given: the h1 is the room's name as a caption, the headline is
//     the large line (a count, "12 bottles.");
//   title given:    a caption names the room, the h1 is the large title;
//   neither:        the numeral, then the room's name as the large h1.
export default function RoomHeader({ numeral, name, title, headline, children, compact = false, className = "" }) {
  const size = compact ? "text-[clamp(2.25rem,5vw,3.5rem)] lg:text-[2.5rem]" : "text-[clamp(2.25rem,5vw,3.5rem)]";
  const big = `font-serif font-light ${size} leading-[1.1] rtl:leading-[1.5] tracking-[-0.01em] rtl:tracking-normal`;
  const cap = "uppercase tracking-[0.14em] rtl:tracking-normal text-xs font-normal";
  const num = (
    <span aria-hidden="true" dir="ltr" className={`${TYPE.numeral} text-lg not-italic font-serif`} style={{ color: COLORS.actionText }}>{numeral}</span>
  );
  // A string title rises word by word on mount (whole words: Arabic keeps its joins).
  const line = (Tag, text, style) => (typeof text === "string"
    ? <TextReveal as={Tag} eager text={text} className={big} style={style} />
    : <Tag className={big} style={style}>{text}</Tag>);
  const row = (inner) => <span className="flex items-baseline gap-3 mb-2" style={{ color: COLORS.dim }}>{num}{inner}</span>;
  return (
    <header className={`mb-6 ${className}`}>
      {headline ? (
        <>
          <h1 className="m-0">{row(<span className={cap}>{name}</span>)}</h1>
          {line("p", headline, { color: COLORS.ink })}
        </>
      ) : title ? (
        <>
          <p className="m-0">{row(<span className={cap}>{name}</span>)}</p>
          {line("h1", title, { color: COLORS.ink })}
        </>
      ) : (
        <>
          {row(null)}
          {line("h1", name, { color: COLORS.ink })}
        </>
      )}
      {children}
    </header>
  );
}

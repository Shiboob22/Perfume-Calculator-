import React from "react";
import { COLORS } from "../../lib/theme";
import { showsDetail, strokeFor } from "./stroke";

// The drawn icon family (v3): 24 grid, 2 px safe padding, line in
// currentColor with round caps and joins, and at most one accent fill —
// oil by default; state icons swap it (forest for saved/today, red for
// error/flammable). Decorative unless given a `title`.
const OIL = COLORS.oil;

function Icon({ size = 24, title, className = "", style, children, flip = false }) {
  const label = title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: "false" };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={strokeFor(size)} strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 ${flip ? "rtl:-scale-x-100" : ""} ${className}`} style={style} {...label}>
      {title && <title>{title}</title>}
      {typeof children === "function" ? children(showsDetail(size)) : children}
    </svg>
  );
}

const make = (name, draw, opts = {}) => {
  const C = ({ accent, ...p }) => <Icon {...opts} {...p}>{(d) => draw(accent ?? opts.accent ?? OIL, d)}</Icon>;
  C.displayName = name;
  return C;
};

export const IconBook = make("IconBook", (a) => <>
  <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z" />
  <path d="M12 6.5v13" />
  <path d="M15.5 4.9v6.3l1.5-1.2 1.5 1.2V4.7Z" fill={a} stroke="none" />
</>);

export const IconBalance = make("IconBalance", (a, d) => <>
  <circle cx="12" cy="4.5" r="1.2" fill="currentColor" stroke="none" />
  <path d="M12 5.7v13.8M7.5 19.5h9M4.5 7.5h15M4.5 7.5 2.5 13M4.5 7.5l2 5.5M19.5 7.5 17.5 13M19.5 7.5l2 5.5" />
  <path d="M2.2 13h4.6a2.3 2.3 0 0 1-4.6 0Z" fill={a} />
  {d && <path d="M17.2 13h4.6a2.3 2.3 0 0 1-4.6 0Z" />}
</>);

export const IconNotebook = make("IconNotebook", (a, d) => <>
  <rect x="5" y="3" width="14" height="18" rx="1.5" />
  <path d={d ? "M8.5 3v18M11.5 13h4.5M11.5 16.5h3" : "M8.5 3v18"} />
  <path d="M13 3v6l1.75-1.3L16.5 9V3Z" fill={a} stroke="none" />
</>);

export const IconSeal = make("IconSeal", (a, d) => <>
  <circle cx="12" cy="9.5" r="6.5" />
  <circle cx="12" cy="9.5" r="3.2" fill={a} stroke="none" />
  {d && <path d="M8.6 15.1 7.2 21l2.6-1.3 1.6 2M15.4 15.1l1.4 5.9-2.6-1.3-1.6 2" />}
</>);

export const IconScaleDrop = make("IconScaleDrop", (a, d) => <>
  <path d="M12 2.8c-1.7 2.3-2.6 3.6-2.6 4.8a2.6 2.6 0 0 0 5.2 0c0-1.2-.9-2.5-2.6-4.8Z" fill={a} />
  <path d="M5 12.5h14M12 12.5v2" />
  <rect x="3" y="14.5" width="18" height="6.5" rx="1.2" />
  {d && <path d="M9.5 17.75h5" />}
</>);

export const IconSteps = make("IconSteps", (a) => <>
  <circle cx="5.5" cy="6" r="1.8" fill={a} />
  <circle cx="5.5" cy="12" r="1.8" />
  <circle cx="5.5" cy="18" r="1.8" />
  <path d="M10 6h10M10 12h10M10 18h6.5" />
</>);

export const IconFlacon = make("IconFlacon", (a, d) => <>
  <rect x="9" y="2.5" width="6" height="3.5" rx=".5" fill="currentColor" />
  {d && <path d="M10.5 6v2.5M13.5 6v2.5" />}
  <rect x="5" y="8.5" width="14" height="13" rx="2" />
  <path d="M7 14.5h10v4.5a.8.8 0 0 1-.8.8H7.8a.8.8 0 0 1-.8-.8Z" fill={a} stroke="none" />
</>);

export const IconBookmark = make("IconBookmark", () => <path d="M6.5 3.5h11v17l-5.5-4-5.5 4Z" />);

export const IconBookmarkCheck = make("IconBookmarkCheck", (a) => <>
  <path d="M6.5 3.5h11v17l-5.5-4-5.5 4Z" fill={a} />
  <path d="m9.5 9.5 1.8 1.8 3.4-3.6" stroke={COLORS.paper} />
</>, { accent: COLORS.forest });

export const IconDiamondAlert = make("IconDiamondAlert", (a) => <>
  <path d="M12 2.8 21.2 12 12 21.2 2.8 12Z" />
  <path d="M12 8v5" />
  <circle cx="12" cy="16" r="1" fill={a} stroke="none" />
</>, { accent: COLORS.danger });

export const IconFlameTriangle = make("IconFlameTriangle", (a) => <>
  <path d="M12 3.2 21.2 19.8H2.8Z" />
  <path d="M12 9.6c1.7 1.8 2.5 3.1 2.5 4.4a2.5 2.5 0 0 1-5 0c0-.9.4-1.6 1-2.3.1.9.5 1.3 1 1.4-.3-1.3 0-2.4.5-3.5Z" fill={a} stroke="none" />
</>, { accent: COLORS.danger });

export const IconCrosshair = make("IconCrosshair", (a) => <>
  <circle cx="12" cy="12" r="7.5" />
  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  <circle cx="12" cy="12" r="2" fill={a} stroke="none" />
</>);

export const IconHourglass = make("IconHourglass", (a) => <>
  <path d="M6.5 3h11M6.5 21h11M8 3c0 5 4 6 4 9s-4 4-4 9M16 3c0 5-4 6-4 9s4 4 4 9" />
  <path d="M9.2 20.3c.5-2.1 1.8-3.2 2.8-3.7 1 .5 2.3 1.6 2.8 3.7Z" fill={a} stroke="none" />
</>);

const DropBase = make("IconDrop", (a) => <>
  <path d="M12 3c-3 3.8-5 6.6-5 9.3a5 5 0 0 0 10 0C17 9.6 15 6.8 12 3Z" />
  <path d="M7 12.5h10a5 5 0 0 1-10 0Z" fill={a} stroke="none" />
</>);
/** A drop, lower half filled: oil by default, `mist` for ethanol. */
export const IconDrop = ({ mist, ...p }) => <DropBase accent={mist ? COLORS.mist : undefined} {...p} />;

export const IconToday = make("IconToday", (a) => <>
  <path d="M12 4 20 12 12 20 4 12Z" fill={a} />
  <circle cx="12" cy="12" r="1.6" fill={COLORS.paper} stroke="none" />
</>, { accent: COLORS.forest });

export const IconCopy = make("IconCopy", () => <>
  <rect x="8.5" y="8.5" width="12" height="12" rx="1.2" />
  <path d="M15.5 8.5V4.7a1.2 1.2 0 0 0-1.2-1.2H4.7a1.2 1.2 0 0 0-1.2 1.2v9.6a1.2 1.2 0 0 0 1.2 1.2h3.8" />
</>);

export const IconLink = make("IconLink", () => <>
  <path d="M10 14a4 4 0 0 0 5.7 0l3.6-3.6a4 4 0 0 0-5.7-5.7l-1.1 1.1" />
  <path d="M14 10a4 4 0 0 0-5.7 0l-3.6 3.6a4 4 0 0 0 5.7 5.7l1.1-1.1" />
</>);

export const IconDownload = make("IconDownload", () => (
  <path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4 16.5v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
));

/** Points forward in reading order: mirrored in Arabic. */
export const IconArrow = make("IconArrow", () => <path d="M4 12h15.5M14 6.5l5.5 5.5-5.5 5.5" />, { flip: true });

export const IconCheck = make("IconCheck", () => <path d="m4.5 12.5 4.5 4.5 10.5-11" />);

export const IconPlus = make("IconPlus", () => <path d="M12 5v14M5 12h14" />);

export const IconBell = make("IconBell", () => <>
  <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
  <path d="M10 20.5a2 2 0 0 0 4 0" />
</>);

/** A featured icon in its square tile: 1px frame, card fill, never a circle. */
export function IconTile({ icon: I, size = 56, iconSize, border = COLORS.ink, background = COLORS.card, className = "", ...p }) {
  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, border: `1px solid ${border}`, background, color: COLORS.ink }}>
      <I size={iconSize ?? Math.round(size * 0.55)} {...p} />
    </span>
  );
}

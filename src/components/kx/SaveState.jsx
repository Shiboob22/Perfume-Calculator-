import React from "react";
import { COLORS } from "../../lib/theme";

// One way to say what happened to a save, everywhere (motion grammar, M1):
//   working  quiet words while it goes (the words pulse, still under reduced motion)
//   saved    a check that draws itself, then the words
//   queued   saved on this phone, sent when the connection returns: the same check, dashed
//   failed   the words in the danger colour, no mark
// Every state settles in the same way (`kx-settle`: a 4 px rise, the words whole within
// the fast duration). The status region stays in the page when empty, so a screen reader
// hears the words when they arrive; the mark restarts for each new message.
export const SAVE_STATES = Object.freeze(["working", "saved", "queued", "failed"]);

const COLOR = {
  working: COLORS.inkSoft,
  saved: COLORS.verdigrisText,
  queued: COLORS.actionText,
  failed: COLORS.danger,
};

export default function SaveState({ state, children, className = "", ...rest }) {
  const on = SAVE_STATES.includes(state) && children != null && children !== "" && children !== false;
  return (
    <p role="status" data-save-state={on ? state : undefined} className={`text-sm ${className}`}
      style={{ color: on ? COLOR[state] : undefined }} {...rest}>
      {on ? (
        <span key={`${state}:${String(children)}`} className={`kx-settle inline-flex items-center gap-2${state === "working" ? " motion-safe:animate-pulse" : ""}`}>
          {(state === "saved" || state === "queued") && (
            <svg className="kx-tick shrink-0" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="square" aria-hidden="true" focusable="false" data-queued={state === "queued" ? "" : undefined}>
              <path d="M3 9.5l4 4 8-9" pathLength="24" />
            </svg>
          )}
          {children}
        </span>
      ) : null}
    </p>
  );
}

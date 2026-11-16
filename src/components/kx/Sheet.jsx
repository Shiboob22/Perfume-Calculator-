import React, { useLayoutEffect, useRef, useState } from "react";
import { COLORS } from "../../lib/theme";
import { TOKENS, reduced } from "../../motion";

// A modal sheet: a bottom sheet on phones, a centred panel on wide screens.
// Built on <dialog>.showModal(), so the browser keeps focus inside it, Escape
// closes it and the page behind is inert; focus goes back to whatever opened
// it. `title` names the dialog; `closeLabel` names the close button.
// `tourKey` marks it as a stop of the Bench tour ([data-tour]).
// Closing plays a short exit (the fast duration) before the dialog closes; at once
// under reduced motion. Opening again during the exit cancels it.
// `keepMounted` keeps the contents built while closed (a closed <dialog> is not
// laid out, so it costs nothing until it opens): opening is then only showing it.
export default function Sheet({ open, onClose, title, closeLabel, wide = false, children, headerExtra, tourKey, keepMounted = false }) {
  const ref = useRef(null);
  const opener = useRef(null);
  const [leaving, setLeaving] = useState(false);
  // While it leaves, the sheet keeps what it last showed: callers often clear the title and
  // content as they close it, and the exit should not slide out an empty panel.
  const last = useRef({ title, children, headerExtra });
  if (open) last.current = { title, children, headerExtra };
  const shown = open ? { title, children, headerExtra } : last.current;

  // A layout effect, so the leaving state is set before the browser paints the closed frame.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    if (open) {
      setLeaving(false);
      if (!d.open) {
        opener.current = document.activeElement;
        d.showModal?.();
        if (!d.showModal) d.setAttribute("open", "");
      }
      return undefined;
    }
    if (!d.open) return undefined;
    const finish = () => {
      setLeaving(false);
      if (d.close) d.close(); else d.removeAttribute("open");
      opener.current?.focus?.();
    };
    if (reduced()) { finish(); return undefined; }
    setLeaving(true);
    const id = setTimeout(finish, TOKENS.duration.fast);
    return () => clearTimeout(id);
  }, [open]);

  return (
    <dialog ref={ref} aria-label={shown.title} data-tour={tourKey} data-leaving={leaving ? "" : undefined} onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={`kx-sheet p-0 mx-0 mt-auto mb-0 md:m-auto w-full max-w-none ${wide ? "md:max-w-[44rem]" : "md:max-w-[32rem]"} md:w-[calc(100%-2rem)]`}
      style={{ background: COLORS.paper, color: COLORS.ink, border: `1px solid ${COLORS.ink}`, borderRadius: 2 }}>
      {(open || leaving || keepMounted) && (
        <div className="max-h-[88vh] md:max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-3" style={{ background: COLORS.paper, borderBottom: `1px solid ${COLORS.line}` }}>
            <h2 className="font-serif italic text-2xl leading-tight me-auto">{shown.title}</h2>
            {shown.headerExtra}
            <button type="button" onClick={onClose} aria-label={closeLabel}
              className="w-11 h-11 inline-flex items-center justify-center" style={{ color: COLORS.ink }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="p-5">{shown.children}</div>
        </div>
      )}
    </dialog>
  );
}

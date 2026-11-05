import React, { useEffect, useRef } from "react";
import { COLORS } from "../../lib/theme";

// A modal sheet: a bottom sheet on phones, a centred panel on wide screens.
// Built on <dialog>.showModal(), so the browser keeps focus inside it, Escape
// closes it and the page behind is inert; focus goes back to whatever opened
// it. `title` names the dialog; `closeLabel` names the close button.
export default function Sheet({ open, onClose, title, closeLabel, wide = false, children, headerExtra }) {
  const ref = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal?.();
      if (!d.showModal) d.setAttribute("open", "");
    } else if (!open && d.open) {
      d.close?.();
      opener.current?.focus?.();
    }
  }, [open]);

  return (
    <dialog ref={ref} aria-label={title} onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={`kx-sheet p-0 mx-0 mt-auto mb-0 md:m-auto w-full max-w-none ${wide ? "md:max-w-[44rem]" : "md:max-w-[32rem]"} md:w-[calc(100%-2rem)]`}
      style={{ background: COLORS.paper, color: COLORS.ink, border: `1px solid ${COLORS.ink}`, borderRadius: 2 }}>
      {open && (
        <div className="max-h-[88vh] md:max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-3" style={{ background: COLORS.paper, borderBottom: `1px solid ${COLORS.line}` }}>
            <h2 className="font-serif italic text-2xl leading-tight me-auto">{title}</h2>
            {headerExtra}
            <button type="button" onClick={onClose} aria-label={closeLabel}
              className="w-11 h-11 inline-flex items-center justify-center" style={{ color: COLORS.ink }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

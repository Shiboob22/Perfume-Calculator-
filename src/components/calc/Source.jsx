import React, { useId, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";

// "Where does this number come from?" — a tap-to-open note beside a figure,
// naming its source and linking to the guide that explains it. Numbers that
// are not from the handbook say so. Inline elements only, so it can sit in a
// label, a paragraph or a readout row.
export default function Source({ id }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const noteId = useId();
  const note = t.raw(`calc.sources.${id}`);
  if (!note) return null;
  const href = note.guide ? `${locale === "ar" ? "/ar" : ""}/guides/${note.guide}` : null;
  return (
    <span className="relative inline-block align-middle ms-1">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={noteId}
        aria-label={t("calc.sources.label")}
        className="inline-grid place-items-center w-4 h-4 rounded-full text-[10px] font-mono not-italic"
        style={{ border: `1px solid ${COLORS.field}`, color: COLORS.inkSoft }}>
        i
      </button>
      {open && (
        <span id={noteId} role="note" className="fixed z-50 inset-x-4 bottom-24 p-3 rounded-lg text-xs leading-relaxed block not-italic font-sans shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-5 sm:start-0 sm:w-72"
          style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.line}`, color: COLORS.ink }}>
          {note.text}
          {href && <a href={href} className="block mt-2 underline" style={{ color: COLORS.amber }}>{t("calc.sources.read")}</a>}
        </span>
      )}
    </span>
  );
}

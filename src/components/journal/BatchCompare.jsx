import React, { useMemo, useState } from "react";
import { COLORS } from "../../lib/theme";
import { summarizeBatch } from "../../lib/calc";
import JournalSection from "./JournalSection";

// Two batches side by side (Journal J4, Pro): strength, size, when poured,
// how far each has rested, where each rated best, how many notes and the
// tags used. A plain table, so a screen reader reads it row by row. Only the
// owner's own notes; the same oil is offered first.
const none = "—";
const no = (n) => String(n).padStart(3, "0");

export default function BatchCompare({ batches, selectedId, locked, lockedCard, fold = false, t }) {
  const me = batches.find((x) => x.id === selectedId);
  const others = useMemo(() => batches
    .filter((x) => x.id !== selectedId)
    .sort((a, b) => Number(b.oil === me?.oil) - Number(a.oil === me?.oil) || b.no - a.no), [batches, selectedId, me]);
  const [otherId, setOtherId] = useState("");
  const other = others.find((x) => x.id === otherId) ?? null;
  if (!me || !others.length) return null;

  const name = (k) => t(`journal.page.milestones.${k}`);
  const peakText = (s) => (s.peak ? t("journal.page.cmp.peakAt", { milestone: name(s.peak.k), rating: s.peak.rating, day: s.peak.day }) : none);
  const tagsText = (s) => (s.tags.length ? s.tags.map((x) => `${t(`journal.page.tag.${x.tag}`)}${x.count > 1 ? ` ×${x.count}` : ""}`).join(", ") : none);
  const col = (b) => { const s = summarizeBatch(b); return { b, s }; };

  return (
    <JournalSection name="compare" id="journal-compare" title={t("journal.page.cmp.title")} fold={fold}>
      {locked ? lockedCard : (
        <>
          <div className="mt-2 flex flex-col gap-1.5 max-w-md">
            <label htmlFor="journal-compare-pick" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("journal.page.cmp.pick")}</label>
            <select id="journal-compare-pick" value={otherId} onChange={(e) => setOtherId(e.target.value)}
              className="min-h-[44px] px-3 rounded border text-base" style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }}>
              <option value="">{t("journal.page.cmp.choose")}</option>
              {others.map((x) => (
                <option key={x.id} value={x.id}>{t("journal.page.cmp.option", { no: no(x.no), name: x.name, pct: x.pct })}</option>
              ))}
            </select>
          </div>
          {other && (() => {
            const A = col(me), B = col(other);
            const rows = [
              [t("journal.page.cmp.strength"), (c) => t("journal.page.cmp.strengthVal", { pct: c.s.pct, tier: c.s.tier })],
              [t("journal.page.cmp.size"), (c) => (c.b.size ? <bdi dir="ltr">{c.b.size}</bdi> : none)],
              [t("journal.page.cmp.poured"), (c) => c.b.poured || none],
              [t("journal.page.cmp.rested"), (c) => t("journal.page.cmp.days", { count: c.b.day })],
              [t("journal.page.cmp.peak"), (c) => peakText(c.s)],
              [t("journal.page.cmp.notes"), (c) => t("journal.page.cmp.notesVal", { notes: c.s.notes, rated: c.s.rated, count: c.s.notes })],
              [t("journal.page.cmp.tags"), (c) => tagsText(c.s)],
            ];
            return (
              <div className="mt-3 overflow-x-auto">
                <table data-compare-table className="w-full text-sm text-start border-collapse">
                  <caption className="sr-only">{t("journal.page.cmp.caption", { a: no(me.no), b: no(other.no) })}</caption>
                  <thead>
                    <tr>
                      <td className="p-2" />
                      {[A, B].map((c) => (
                        <th key={c.b.id} scope="col" className="p-2 text-start font-medium align-bottom" style={{ borderBottom: `1px solid ${COLORS.ink}` }}>
                          <span dir="ltr">{t("journal.page.no", { no: no(c.b.no) })}</span>
                          <span className="block text-xs font-normal" style={{ color: COLORS.dim }}>{c.b.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([label, get]) => (
                      <tr key={label} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                        <th scope="row" className="p-2 text-start font-normal align-top" style={{ color: COLORS.inkSoft }}>{label}</th>
                        <td className="p-2 align-top">{get(A)}</td>
                        <td className="p-2 align-top">{get(B)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </>
      )}
    </JournalSection>
  );
}

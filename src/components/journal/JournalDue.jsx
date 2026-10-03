import React from "react";
import { COLORS } from "../../lib/theme";
import { TIERS } from "../../lib/tiers";
import { useI18n } from "../../i18n/I18nProvider";
import CheckInForm from "./CheckInForm";

// "Due for a check-in": the strip at the top of the Batches tab. Each row
// is one batch at its current scheduled point; a missed point never shows.
export default function JournalDue({ due, onDone }) {
  const { t } = useI18n();
  if (!due.length) return null;
  return (
    <section aria-labelledby="journal-due-title" className="mb-6 p-4 border rounded-lg" style={{ borderColor: COLORS.amberDeep, backgroundColor: COLORS.card }}>
      <h3 id="journal-due-title" className="text-sm font-semibold" style={{ color: COLORS.forestDeep }}>
        {t("journal.due.title", { count: due.length })}
      </h3>
      <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{t("journal.due.lead")}</p>
      <ul className="mt-3 divide-y" style={{ borderColor: COLORS.line }}>
        {due.map((d) => (
          <li key={`${d.batchId}:${d.scheduledDay}`} className="py-3" style={{ borderColor: COLORS.line }}>
            <div className="text-sm font-serif font-semibold" style={{ color: COLORS.forestDeep }}>
              <bdi>{d.batch.fragrance_name}</bdi>
            </div>
            <div className="text-xs" style={{ color: COLORS.inkSoft }}>
              {t("journal.dueMeta", { day: d.day, family: TIERS[d.batch.tier] ? t(`families.${d.batch.tier}.label`) : d.batch.tier })}
            </div>
            <CheckInForm batch={d.batch} scheduledDay={d.scheduledDay} onDone={(c, meta) => onDone(d.batch.id, c, meta)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

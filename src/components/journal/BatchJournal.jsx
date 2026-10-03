import React, { useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { errorText } from "../../i18n/errorText";
import { deleteCheckIn } from "../../lib/fragranceApi";
import CheckInForm from "./CheckInForm";

// A batch's own journal, inside its card: what was noted on which rest day,
// and an ad-hoc check-in at any time. Skips are not listed.
export default function BatchJournal({ batch, onDone, onRemoved }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const entries = (batch.batch_checkins || []).filter((c) => !c.skipped);

  async function remove(id) {
    setError("");
    try {
      await deleteCheckIn(id);
      onRemoved(batch.id, id);
    } catch (e) {
      setError(errorText(t, e, "journal.removeFailed"));
    }
  }

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.line }}>
      {entries.length > 0 && (
        <>
          <h4 className="text-[11px] font-mono uppercase tracking-wider rtl:tracking-normal mb-1" style={{ color: COLORS.amberDeep }}>{t("journal.title")}</h4>
          <ul className="space-y-1 text-sm">
            {entries.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3">
                <span>
                  <span className="font-mono text-xs" style={{ color: COLORS.inkSoft }}>{t("journal.restDay", { day: c.day })}</span>
                  {" · "}
                  <span style={{ color: COLORS.amber }} aria-label={c.rating ? t("journal.ratingValue", { n: c.rating }) : t("journal.noRating")}>
                    {c.rating ? "★".repeat(c.rating) : "–"}
                  </span>
                  {c.note && <> · <bdi dir="auto" style={{ color: COLORS.ink }}>{c.note}</bdi></>}
                </span>
                <button type="button" onClick={() => remove(c.id)} className="text-xs font-mono underline shrink-0 min-h-[24px]" style={{ color: COLORS.inkSoft }}>
                  {t("journal.remove")}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {error && <p role="alert" className="text-xs font-mono mt-1" style={{ color: COLORS.danger }}>{error}</p>}
      {adding ? (
        <CheckInForm batch={batch} onCancel={() => setAdding(false)} onDone={(c, meta) => { setAdding(false); onDone(batch.id, c, meta); }} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-1 text-xs font-mono underline min-h-[24px]" style={{ color: COLORS.forest }}>
          {t("journal.add")}
        </button>
      )}
    </div>
  );
}

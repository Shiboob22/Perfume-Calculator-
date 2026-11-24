import React, { useId, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { errorText } from "../../i18n/errorText";
import { saveCheckIn } from "../../lib/fragranceApi";
import { enqueueCheckIn, isOffline } from "../../lib/outbox";
import { todayFor } from "../../lib/journal";
import { isolate } from "../../lib/batchCard";
import RatingRow from "../kx/RatingRow";

const inputStyle = { background: COLORS.cardHi, color: COLORS.ink, borderColor: COLORS.field };

// One line and an optional 1–5 rating: fillable from a phone in seconds.
// `scheduledDay` is the point being answered (null for an ad-hoc check-in,
// which can't be skipped). onDone(checkin, { queued }) after a save or skip.
export default function CheckInForm({ batch, scheduledDay = null, onDone, onCancel }) {
  const { t } = useI18n();
  const uid = useId();
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(skipped) {
    setBusy(true); setError("");
    const checkin = {
      id: crypto.randomUUID(),
      batch_id: batch.id,
      day: todayFor(batch),
      scheduled_day: scheduledDay,
      ...(skipped ? { skipped: true } : { note: note.trim() || null, rating }),
    };
    try {
      onDone(await saveCheckIn(checkin), { queued: false });
    } catch (e) {
      if (isOffline(e)) {
        enqueueCheckIn(checkin);
        onDone({ ...checkin, created_at: new Date().toISOString() }, { queued: true });
      } else if (e.code === "already_answered" && e.detail?.checkin) {
        onDone(e.detail.checkin, { queued: false });
      } else {
        setError(errorText(t, e, "journal.failed"));
        setBusy(false);
      }
    }
  }

  const empty = !note.trim() && rating == null;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!empty) send(false); }} className="mt-2 space-y-2">
      <label htmlFor={`${uid}-note`} className="block text-xs" style={{ color: COLORS.inkSoft }}>
        {t("journal.noteLabel", { name: isolate(batch.fragrance_name) })}
      </label>
      <input id={`${uid}-note`} type="text" dir="auto" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)}
        placeholder={t("journal.notePlaceholder")} autoComplete="off" enterKeyHint="done"
        className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2" style={inputStyle} />
      {/* The same 1–5 row as the Journal, with its ends named (audit M6, owner 2026-11-23); 0 there is "no rating" here. */}
      <RatingRow value={rating ?? 0} onChange={(n) => setRating(n || null)} size="sm"
        label={t("journal.rating")} lead={t("journal.rating")} itemLabel={(n) => t("journal.ratingValue", { n })} />
      {error && <p role="alert" className="text-xs font-mono" style={{ color: COLORS.danger }}>{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || empty}
          className="px-4 py-1.5 rounded text-sm font-semibold disabled:opacity-40 focus:outline-none focus:ring-2"
          style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {busy ? t("journal.saving") : t("journal.save")}
        </button>
        {scheduledDay != null && (
          <button type="button" disabled={busy} onClick={() => send(true)}
            className="text-xs font-mono underline min-h-[24px]" style={{ color: COLORS.inkSoft }}>
            {t("journal.skip")}
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs font-mono underline min-h-[24px]" style={{ color: COLORS.inkSoft }}>
            {t("journal.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

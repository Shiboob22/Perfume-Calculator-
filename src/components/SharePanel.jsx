import React, { useId, useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { shareBatch, unshareBatch } from "../lib/fragranceApi";
import { cleanText } from "../lib/publicText";
import { recipePath } from "../lib/recipePage";
import { suggestedRestDays, shareOf } from "../lib/journal";

const inputStyle = { background: COLORS.cardHi, color: COLORS.ink, borderColor: COLORS.field };
const INDEX_MIN = 40; // same rule as shared_recipes.indexable (0013)

// "Share recipe" on a batch card: what goes public and what never does, a
// separate public note (starting from the private one, shown as it will
// read), the days it rested, then the link.
export default function SharePanel({ batch, onShared, onStatus }) {
  const { t, locale } = useI18n();
  const uid = useId();
  const share = shareOf(batch);
  const live = Boolean(share?.published);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(() => share?.public_note ?? batch.notes ?? "");
  const [rest, setRest] = useState(() => String(share?.rest_days ?? suggestedRestDays(batch) ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const preview = cleanText(note, 500);
  const previewLength = Array.from(preview || "").length; // code points, as Postgres counts
  const url = share ? window.location.origin + recipePath(locale, share.slug) : "";

  async function publish(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const restDays = rest.trim() === "" ? null : Number(rest);
      const next = await shareBatch(batch.id, { public_note: note, rest_days: restDays });
      onShared(batch.id, next);
      onStatus(t("share.published"));
    } catch (err) {
      setError(errorText(t, err, "share.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true); setError("");
    try {
      onShared(batch.id, await unshareBatch(batch.id));
      onStatus(t("share.stopped"));
    } catch (err) {
      setError(errorText(t, err, "share.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      if (navigator.share) await navigator.share({ title: batch.fragrance_name, url });
      else { await navigator.clipboard.writeText(url); onStatus(t("share.copied")); }
    } catch { /* the user closed the share sheet */ }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-expanded="false"
        className="text-xs font-mono underline min-h-[24px]" style={{ color: COLORS.forest }}>
        {live ? `${t("share.shared")} ✓` : t("share.open")}
      </button>
    );
  }

  return (
    <section aria-labelledby={`${uid}-title`} className="mt-3 p-4 border rounded-lg" style={{ borderColor: COLORS.amberDeep, backgroundColor: COLORS.paper }}>
      <div className="flex items-start justify-between gap-3">
        <h4 id={`${uid}-title`} className="text-sm font-semibold" style={{ color: COLORS.forestDeep }}>{t("share.title")}</h4>
        <button type="button" onClick={() => setOpen(false)} aria-expanded="true" className="text-xs font-mono underline min-h-[24px]" style={{ color: COLORS.inkSoft }}>
          {t("share.close")}
        </button>
      </div>
      <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{t("share.lead")}</p>
      <p className="text-xs mt-2" style={{ color: COLORS.ink }}>{t("share.public")}</p>
      <p className="text-xs mt-1" style={{ color: COLORS.ink }}><strong>{t("share.never")}</strong></p>

      {live && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono">
          <a href={url} target="_blank" rel="noopener" dir="ltr" className="underline break-all" style={{ color: COLORS.amber }}>{url}</a>
          <button type="button" onClick={copy} className="underline min-h-[24px]" style={{ color: COLORS.forest }}>
            {typeof navigator !== "undefined" && navigator.share ? t("share.native") : t("share.copy")}
          </button>
          <span style={{ color: COLORS.inkSoft }}>{share.indexable ? t("share.indexed") : t("share.unlisted")}</span>
        </div>
      )}

      <form onSubmit={publish} className="mt-3 space-y-3">
        <div>
          <label htmlFor={`${uid}-note`} className="block text-xs" style={{ color: COLORS.inkSoft }}>{t("share.noteLabel")}</label>
          <textarea id={`${uid}-note`} dir="auto" rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)}
            aria-describedby={`${uid}-hint`} className="mt-1 w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2" style={inputStyle} />
          <p id={`${uid}-hint`} className="text-xs mt-1" style={{ color: COLORS.dim }}>
            {t("share.noteHint")} ({previewLength}/500{previewLength >= INDEX_MIN ? " ✓" : ""})
          </p>
        </div>
        {preview && (
          <div>
            <p className="text-xs" style={{ color: COLORS.inkSoft }}>{t("share.preview")}</p>
            <p dir="auto" className="mt-1 text-sm font-serif whitespace-pre-line p-2 border rounded" style={{ borderColor: COLORS.line, color: COLORS.ink }}>{preview}</p>
          </div>
        )}
        <div>
          <label htmlFor={`${uid}-rest`} className="block text-xs" style={{ color: COLORS.inkSoft }}>{t("share.restLabel")}</label>
          <input id={`${uid}-rest`} type="number" inputMode="numeric" min="0" max="365" step="1" value={rest} onChange={(e) => setRest(e.target.value)}
            className="mt-1 w-28 px-3 py-2 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2" style={inputStyle} />
        </div>
        {error && <p role="alert" className="text-xs font-mono" style={{ color: COLORS.danger }}>{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40 focus:outline-none focus:ring-2"
            style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {busy ? t("share.publishing") : live ? t("share.update") : t("share.publish")}
          </button>
          {live && (
            <button type="button" disabled={busy} onClick={stop} className="text-xs font-mono underline min-h-[24px]" style={{ color: COLORS.danger }}>
              {t("share.stop")}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

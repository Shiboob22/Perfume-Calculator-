import React, { useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { deletePost, like, report, unlike } from "../../lib/salonApi";
import { profileHref } from "../../lib/salon/paths";
import { authorName, benchHref, REASONS } from "../../lib/salon/validate";
import { UNIT_LABELS } from "../../lib/calcPrefill";
import { flagOn } from "../../lib/flags";
import Button from "../kx/Button";
import { SelectField, inputClass, inputStyle } from "../wardrobe/ui";

// One post in the feed or on a profile, laid out as a notebook page rather
// than a social card: a running head (kind, date), the title in the serif,
// the blend as a ruled grid of labelled figures, the note as prose. Like,
// report (anyone else's) and delete (your own) stay quiet at the foot.
export default function PostCard({ post, onRemoved }) {
  const { t, locale } = useI18n();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(Number(post.likes));
  const [mode, setMode] = useState(null); // "report" | "delete"
  const [reason, setReason] = useState("spam");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(post.created_at));
  const hidden = post.status === "hidden";

  async function toggleLike() {
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1)); setError("");
    try { await (next ? like(post.id) : unlike(post.id)); }
    catch { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); setError(t("salon.post.failed")); }
  }
  async function sendReport(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { await report({ postId: post.id, reason, note }); setMode(null); setStatus(t("salon.post.reported")); }
    catch (err) { setError(err?.code === "54000" ? t("salon.post.reportLimit") : t("salon.post.failed")); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try { await deletePost(post.id); onRemoved?.(post.id); }
    catch { setError(t("salon.post.failed")); setBusy(false); }
  }

  return (
    <article className="h-full p-6 rounded-sm flex flex-col" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }} aria-labelledby={`post-${post.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs" style={{ color: COLORS.dim }}>
        <span>{t(`salon.post.${post.kind}`)}</span>
        {post.kind === "recipe" && post.family && <span style={{ color: COLORS.actionText }}>{t(`families.${post.family}.label`)}</span>}
      </div>
      <h3 id={`post-${post.id}`} className="font-serif text-[28px] leading-[1.15] rtl:leading-[1.5] mt-3" style={{ color: COLORS.ink }}>{post.title}</h3>
      <time dateTime={post.created_at} className="text-sm mt-1" style={{ color: COLORS.dim }}>{when}</time>
      <p className="mt-1 text-sm" style={{ color: COLORS.inkSoft }}>
        {t("salon.post.by")} <Link to={profileHref(post.handle)} className="underline underline-offset-2" style={{ color: COLORS.ink }}>{authorName(post)}</Link>
      </p>
      {post.kind === "recipe" && post.snapshot && Number(post.snapshot.concentration_pct) > 0 && (
        <div aria-hidden="true" className="flex h-[3px] mt-4" dir="ltr">
          <span style={{ width: `${Math.min(100, Number(post.snapshot.concentration_pct))}%`, background: COLORS.amber }} />
          <span className="flex-1" style={{ background: COLORS.line }} />
        </div>
      )}
      {post.kind === "recipe" && post.snapshot && (
        <dl className="mt-4 grid grid-cols-2" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          {[
            ["size", `${post.snapshot.amount} ${UNIT_LABELS[post.snapshot.unit] ?? post.snapshot.unit}`],
            ["strength", `${post.snapshot.concentration_pct}%`],
            post.snapshot.oil_density ? ["density", `${post.snapshot.oil_density} g/mL`] : null,
            post.family ? ["family", t(`families.${post.family}.label`)] : null,
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} className="py-3 pe-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <dt className="text-xs" style={{ color: COLORS.dim }}>{t(`salon.post.grid.${k}`)}</dt>
              <dd className={k === "family" ? "text-sm" : "tabular-nums text-lg"} style={{ color: COLORS.ink }}>{k === "family" ? v : <span dir="ltr">{v}</span>}</dd>
            </div>
          ))}
        </dl>
      )}
      {post.kind === "review" && (
        <p className="mt-2 text-sm flex flex-wrap items-baseline gap-x-3" style={{ color: COLORS.inkSoft }}>
          {flagOn("atlas") && post.fragrance_id
            ? <Link to={`/atlas/fragrance/${post.fragrance_id}`} className="underline underline-offset-2" style={{ color: COLORS.ink }}>{post.fragrance_name}</Link>
            : <span style={{ color: COLORS.ink }}>{post.fragrance_name}</span>}
          <span aria-label={t("salon.post.rating", { n: post.rating })} style={{ color: COLORS.actionText }}>{"★".repeat(post.rating)}{"☆".repeat(5 - post.rating)}</span>
        </p>
      )}
      {post.body && <p className="mt-4 text-base leading-relaxed whitespace-pre-line max-w-prose" style={{ color: COLORS.inkSoft }}>{post.body}</p>}
      {hidden && <p role="status" className="mt-3 text-sm" style={{ color: COLORS.danger }}>{t("salon.post.hiddenNote")}</p>}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-auto pt-4">
        {!hidden && (
          <button type="button" aria-pressed={liked} onClick={toggleLike} disabled={post.mine}
            className="inline-flex items-center gap-1.5 text-sm min-h-[44px] underline underline-offset-2 disabled:no-underline disabled:cursor-default" style={{ color: liked ? COLORS.actionText : COLORS.inkSoft }}>
            {liked ? t("salon.post.unlike") : t("salon.post.like")} <span className="font-mono tabular-nums" dir="ltr">{likes}</span>
          </button>
        )}
        {post.kind === "recipe" && !hidden && <Link to={benchHref(post)} className="text-sm underline underline-offset-2 min-h-[44px] inline-flex items-center" style={{ color: COLORS.actionText }}>{t("salon.post.openBench")} <span aria-hidden="true" className="inline-block rtl:-scale-x-100 ms-1">→</span></Link>}
        {!post.mine && !hidden && <button type="button" onClick={() => setMode(mode === "report" ? null : "report")} className="text-sm underline underline-offset-2 min-h-[44px]" style={{ color: COLORS.inkSoft }}>{t("salon.post.report")}</button>}
        {post.mine && !hidden && <button type="button" onClick={() => setMode(mode === "delete" ? null : "delete")} className="text-sm underline underline-offset-2 min-h-[44px]" style={{ color: COLORS.danger }}>{t("salon.post.delete")}</button>}
      </div>

      {mode === "report" && (
        <form onSubmit={sendReport} className="mt-3 grid gap-3 max-w-md">
          <SelectField label={t("salon.post.reportTitle")} value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: t(`salon.post.reasons.${r}`) }))} />
          <div>
            <label htmlFor={`rn-${post.id}`} className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("salon.post.reportNote")}</label>
            <textarea id={`rn-${post.id}`} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} py-2`} style={inputStyle} />
          </div>
          <div className="flex gap-3"><Button type="submit" loading={busy}>{t("salon.post.reportSend")}</Button><Button type="button" variant="secondary" onClick={() => setMode(null)}>{t("salon.cancel")}</Button></div>
        </form>
      )}
      {mode === "delete" && (
        <div className="mt-3 flex flex-wrap items-center gap-3" role="group" aria-label={t("salon.post.deleteConfirm")}>
          <span className="text-sm" style={{ color: COLORS.ink }}>{t("salon.post.deleteConfirm")}</span>
          <Button variant="danger" loading={busy} onClick={remove}>{t("salon.post.deleteYes")}</Button>
          <Button variant="secondary" onClick={() => setMode(null)}>{t("salon.cancel")}</Button>
        </div>
      )}
      <p role="status" className="text-sm mt-2" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-sm mt-2" style={{ color: COLORS.danger }}>{error}</p>}
    </article>
  );
}

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { deletePost, like, report, unlike } from "../../lib/salonApi";
import { profileHref } from "../../lib/salon/paths";
import { authorName, benchHref, recipeLine, REASONS } from "../../lib/salon/validate";
import { flagOn } from "../../lib/flags";
import Button from "../kx/Button";
import { Chip, SelectField, inputClass, inputStyle } from "../wardrobe/ui";

// One post in the feed or on a profile: a recipe's blend or a review, with
// like, report (anyone else's) and delete (your own).
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
    <article className="p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }} aria-labelledby={`post-${post.id}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: COLORS.inkSoft }}>
        <Chip>{t(`salon.post.${post.kind}`)}</Chip>
        {post.family && <Chip>{t(`families.${post.family}.label`)}</Chip>}
        <span>{t("salon.post.by")} <Link to={profileHref(post.handle)} className="underline underline-offset-2" style={{ color: COLORS.ink }}>{authorName(post)}</Link></span>
        <span aria-hidden="true">·</span>
        <time dateTime={post.created_at}>{when}</time>
      </div>
      <h3 id={`post-${post.id}`} className="font-serif text-xl mt-2" style={{ color: COLORS.ink }}>{post.title}</h3>
      {post.kind === "recipe" && (
        <p className="mt-1 text-sm">
          <span className="font-mono" dir="ltr" style={{ color: COLORS.ink }}>{recipeLine(post.snapshot)}</span>
          {post.snapshot?.oil_density && <span style={{ color: COLORS.dim }}> · {t("salon.post.oilDensity", { value: post.snapshot.oil_density })}</span>}
        </p>
      )}
      {post.kind === "review" && (
        <p className="mt-1 text-sm" style={{ color: COLORS.inkSoft }}>
          {flagOn("atlas") && post.fragrance_id
            ? <Link to={`/atlas/fragrance/${post.fragrance_id}`} className="underline underline-offset-2" style={{ color: COLORS.ink }}>{post.fragrance_name}</Link>
            : <span style={{ color: COLORS.ink }}>{post.fragrance_name}</span>}
          {" · "}<span aria-label={t("salon.post.rating", { n: post.rating })}>{"★".repeat(post.rating)}{"☆".repeat(5 - post.rating)}</span>
        </p>
      )}
      {post.body && <p className="mt-3 whitespace-pre-line max-w-prose" style={{ color: COLORS.ink }}>{post.body}</p>}
      {hidden && <p role="status" className="mt-3 text-sm" style={{ color: COLORS.danger }}>{t("salon.post.hiddenNote")}</p>}

      <div className="flex flex-wrap items-center gap-3 mt-4">
        {!hidden && (
          <Button variant="secondary" aria-pressed={liked} onClick={toggleLike} disabled={post.mine}>
            {liked ? t("salon.post.unlike") : t("salon.post.like")} <span className="font-mono ms-1" dir="ltr">{likes}</span>
          </Button>
        )}
        {post.kind === "recipe" && !hidden && <Link to={benchHref(post)} className="text-sm underline underline-offset-2 min-h-[44px] inline-flex items-center" style={{ color: COLORS.forestDeep }}>{t("salon.post.openBench")}</Link>}
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

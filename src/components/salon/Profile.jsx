import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { follow, getProfile, report, unfollow } from "../../lib/salonApi";
import { authorName, REASONS } from "../../lib/salon/validate";
import Button from "../kx/Button";
import { SelectField } from "../wardrobe/ui";
import Feed from "./Feed";

// Someone's profile: name, bio, counts, follow and report, and their posts.
export default function Profile({ handle }) {
  const { t } = useI18n();
  const [info, setInfo] = useState(undefined);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [mode, setMode] = useState(false);
  const [reason, setReason] = useState("abuse");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setInfo(undefined);
    getProfile(handle).then((p) => {
      if (!live) return;
      setInfo(p); setFollowing(p?.i_follow === true); setFollowers(Number(p?.followers ?? 0));
    }).catch(() => { if (live) setInfo(null); });
    return () => { live = false; };
  }, [handle]);

  async function toggleFollow() {
    const next = !following;
    setFollowing(next); setFollowers((n) => n + (next ? 1 : -1)); setError("");
    try { await (next ? follow(info.user_id) : unfollow(info.user_id)); }
    catch { setFollowing(!next); setFollowers((n) => n + (next ? -1 : 1)); setError(t("salon.post.failed")); }
  }
  async function sendReport(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { await report({ profileUserId: info.user_id, reason }); setMode(false); setStatus(t("salon.post.reported")); }
    catch { setError(t("salon.post.failed")); } finally { setBusy(false); }
  }

  async function share() {
    try { await navigator.clipboard.writeText(`${location.origin}/salon/u/${info.handle}`); setStatus(t("salon.profile.shared")); }
    catch { setError(t("salon.post.failed")); }
  }

  if (info === undefined) return <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.loading")}</p>;
  if (info === null) return <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.profile.notFound")}</p>;

  return (
    <section aria-labelledby="salon-profile-h">
      {/* The profile header: one of the three places the board allows cinematic motion (a 600 ms rise, off under reduced motion). */}
      <div className="flex items-center gap-4 kx-rise">
        <span aria-hidden="true" className="shrink-0 flex items-center justify-center w-16 h-16 rounded-full font-serif text-2xl" style={{ background: COLORS.sand, border: `1px solid ${COLORS.line}`, color: COLORS.actionText }}>
          {Array.from(authorName(info).replace(/^@/, "").trim()).slice(0, 2).join("").toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 id="salon-profile-h" className="font-serif font-light text-4xl rtl:leading-[1.5]" style={{ color: COLORS.ink }}>{authorName(info)}</h2>
          {info.display_name && <p className="font-mono text-sm" dir="ltr" style={{ color: COLORS.dim }}>@{info.handle}</p>}
        </div>
      </div>
      {info.bio && <p className="mt-4 max-w-prose kx-rise" style={{ color: COLORS.inkSoft, animationDelay: "120ms" }}>{info.bio}</p>}
      {!info.is_public && info.mine && <p role="status" className="mt-2 text-sm" style={{ color: COLORS.dim }}>{t("salon.profile.private")}</p>}
      <dl className="grid grid-cols-3 gap-3 mt-5 max-w-md kx-rise" style={{ animationDelay: "240ms" }}>
        {[["posts", info.posts], ["followers", followers], ["following", info.following]].map(([k, n]) => (
          <div key={k} className="p-3 rounded" style={{ border: `1px solid ${COLORS.line}` }}>
            <dd className="m-0 font-serif text-3xl tabular-nums" dir="ltr" style={{ color: COLORS.ink }}>{Number(n)}</dd>
            <dt className="text-xs" style={{ color: COLORS.dim }}>{t(`salon.profile.${k}`)}</dt>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        {info.mine
          ? <Button as={Link} to="/salon/me" variant="secondary">{t("salon.nav.mine")}</Button>
          : (
            <>
              <Button variant={following ? "secondary" : "primary"} aria-pressed={following} onClick={toggleFollow}>{following ? t("salon.profile.unfollow") : t("salon.profile.follow")}</Button>
              <Button variant="secondary" onClick={share}>{t("salon.profile.share")}</Button>
              <button type="button" onClick={() => setMode((m) => !m)} className="text-sm underline underline-offset-2 min-h-[44px]" style={{ color: COLORS.inkSoft }}>{t("salon.profile.report")}</button>
            </>
          )}
      </div>
      {mode && (
        <form onSubmit={sendReport} className="mt-3 grid gap-3 max-w-md">
          <SelectField label={t("salon.post.reportTitle")} value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: t(`salon.post.reasons.${r}`) }))} />
          <div className="flex gap-3"><Button type="submit" loading={busy}>{t("salon.post.reportSend")}</Button><Button type="button" variant="secondary" onClick={() => setMode(false)}>{t("salon.cancel")}</Button></div>
        </form>
      )}
      <p role="status" className="text-sm mt-2" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-sm mt-2" style={{ color: COLORS.danger }}>{error}</p>}
      <div className="mt-8"><Feed handle={info.handle} emptyKey="salon.profile.emptyPosts" /></div>
    </section>
  );
}

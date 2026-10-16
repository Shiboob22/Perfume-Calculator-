import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { follow, getProfile, report, unfollow } from "../../lib/salonApi";
import { authorName, REASONS } from "../../lib/salon/validate";
import Button from "../kx/Button";
import Tabs from "../kx/Tabs";
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
  const [kind, setKind] = useState("recipe");

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

  if (info === undefined) return <p role="status" className="text-sm pt-8" style={{ color: COLORS.inkSoft }}>{t("salon.loading")}</p>;
  if (info === null) return <p role="status" className="text-sm pt-8" style={{ color: COLORS.inkSoft }}>{t("salon.profile.notFound")}</p>;

  const name = authorName(info);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0]).join("").toUpperCase();
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else { await navigator.clipboard.writeText(url); setStatus(t("salon.profile.copied")); }
    } catch { /* cancelled, or the clipboard is blocked: nothing to say */ }
  }

  return (
    <section aria-labelledby="salon-profile-h" className="flex flex-col gap-10">
      {/* The header: the Salon's cinematic place (see .sal-* in index.css). */}
      <header className="relative overflow-hidden -mx-4 sm:-mx-6 lg:-mx-12 px-4 sm:px-6 lg:px-12 pt-8 md:pt-14 pb-10" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <div aria-hidden="true" className="sal-glow absolute inset-x-0 top-0 h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(70% 100% at 25% 0%, color-mix(in srgb, var(--c-amber) 26%, transparent), transparent 72%)" }} />
        <div className="relative grid gap-8 min-[1000px]:grid-cols-[minmax(0,1fr)_380px] items-end">
          <div className="flex flex-col gap-6">
            <p className="sal-fade flex items-baseline gap-3 text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case" style={{ color: COLORS.dim }}>
              <span dir="ltr" className="font-serif text-base tracking-[0.06em] normal-case" style={{ color: COLORS.actionText }}>V</span>{t("salon.title")}
            </p>
            <div className="flex items-center gap-5 sm:gap-7">
              <span aria-hidden="true" className="sal-fade shrink-0 grid place-items-center w-[84px] h-[84px] sm:w-[112px] sm:h-[112px] rounded-full font-serif text-[32px] sm:text-[44px]" style={{ border: `1px solid ${COLORS.amber}`, color: COLORS.actionText }}>{initials}</span>
              <div className="sal-name min-w-0">
                <h2 id="salon-profile-h" className="font-serif font-light text-[clamp(36px,6vw,80px)] leading-[1.05] rtl:leading-[1.4] tracking-[-0.01em] rtl:tracking-normal" dir="auto">{name}</h2>
                {info.display_name && <p className="text-sm mt-2" dir="ltr" style={{ color: COLORS.dim }}>@{info.handle}</p>}
              </div>
            </div>
            {info.bio && <p className="sal-bio max-w-[52ch] text-lg leading-relaxed" style={{ color: COLORS.dim }}>{info.bio}</p>}
            {!info.is_public && info.mine && <p role="status" className="text-sm" style={{ color: COLORS.dim }}>{t("salon.profile.private")}</p>}
          </div>

          <div className="sal-last flex flex-col gap-4">
            <dl className="grid grid-cols-3 rounded-sm" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
              {[["posts", info.posts], ["followers", followers], ["following", info.following]].map(([k, n], i) => (
                <div key={k} className="p-4 min-w-0" style={{ borderInlineStart: i ? `1px solid ${COLORS.line}` : "none" }}>
                  <dd dir="ltr" className="text-[28px] leading-none text-start rtl:text-end" style={{ color: COLORS.actionText }}>{Number(n).toLocaleString("en")}</dd>
                  <dt className="text-xs mt-2" style={{ color: COLORS.dim }}>{t(`salon.profile.${k}`)}</dt>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-3">
              {info.mine
                ? <Button as={Link} to="/salon/me" variant="secondary" size="lg" className="flex-1">{t("salon.nav.mine")}</Button>
                : <Button variant={following ? "secondary" : "primary"} size="lg" aria-pressed={following} onClick={toggleFollow} className="flex-1 on-resin">{following ? t("salon.profile.unfollow") : t("salon.profile.follow")}</Button>}
              <Button variant="ghost" size="lg" onClick={share}>{t("salon.profile.share")}</Button>
            </div>
            {!info.mine && <button type="button" onClick={() => setMode((m) => !m)} className="self-start text-sm underline underline-offset-2 min-h-[44px]" style={{ color: COLORS.inkSoft }}>{t("salon.profile.report")}</button>}
          </div>
        </div>
      </header>

      {mode && (
        <form onSubmit={sendReport} className="grid gap-3 max-w-md">
          <SelectField label={t("salon.post.reportTitle")} value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: t(`salon.post.reasons.${r}`) }))} />
          <div className="flex gap-3"><Button type="submit" loading={busy}>{t("salon.post.reportSend")}</Button><Button type="button" variant="secondary" onClick={() => setMode(false)}>{t("salon.cancel")}</Button></div>
        </form>
      )}
      <p role="status" className="text-sm -my-6" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-sm -my-6" style={{ color: COLORS.danger }}>{error}</p>}

      <Tabs label={t("salon.profile.kinds")} idPrefix="salon-kind" value={kind} onChange={setKind}
        tabs={[{ id: "recipe", label: t("salon.feed.recipe") }, { id: "review", label: t("salon.feed.review") }]} />
      <div role="tabpanel" id={`salon-kind-${kind}-panel`} aria-labelledby={`salon-kind-${kind}`}>
        <Feed handle={info.handle} kind={kind} emptyKey="salon.profile.emptyPosts" />
      </div>
    </section>
  );
}

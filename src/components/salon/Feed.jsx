import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { getFeed } from "../../lib/salonApi";
import Button from "../kx/Button";
import PostCard from "./PostCard";

const TABS = ["all", "recipe", "review", "following"];
const PAGE = 20;

// The feed: everyone's public recipes and reviews, newest first, with the
// kind filter and the people you follow. With `handle` it is one person's
// posts (their profile page).
export default function Feed({ handle = null, emptyKey = "salon.feed.empty" }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = handle ? "all" : TABS.includes(params.get("tab")) ? params.get("tab") : "all";
  const [rows, setRows] = useState(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (before = null) => {
    const page = await getFeed({ handle, kind: tab === "recipe" || tab === "review" ? tab : null, following: tab === "following", before, limit: PAGE });
    return page;
  }, [handle, tab]);

  useEffect(() => {
    let live = true;
    setRows(null); setFailed(false);
    load().then((page) => { if (live) { setRows(page); setMore(page.length === PAGE); } }).catch(() => { if (live) { setRows([]); setFailed(true); } });
    return () => { live = false; };
  }, [load]);

  async function loadMore() {
    setBusy(true);
    try {
      const page = await load(rows[rows.length - 1].created_at);
      setRows((r) => [...r, ...page]); setMore(page.length === PAGE);
    } catch { setFailed(true); } finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="salon-feed-h">
      <h2 id="salon-feed-h" className="sr-only">{t("salon.feed.label")}</h2>
      {!handle && (
        <div role="group" aria-label={t("salon.feed.tabsLabel")} className="flex flex-wrap gap-2 mb-5">
          {TABS.map((id) => (
            <button key={id} type="button" aria-pressed={tab === id}
              onClick={() => setParams(id === "all" ? {} : { tab: id }, { replace: true })}
              className="px-3 min-h-[44px] text-sm border" style={{ borderColor: tab === id ? COLORS.forest : COLORS.field, color: tab === id ? COLORS.forestDeep : COLORS.inkSoft, background: tab === id ? COLORS.cardHi : "transparent" }}>
              {t(`salon.feed.${id}`)}
            </button>
          ))}
        </div>
      )}
      {failed && <p role="alert" className="text-sm mb-3" style={{ color: COLORS.danger }}>{t("salon.loadFailed")}</p>}
      {rows === null && <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.loading")}</p>}
      {rows && rows.length === 0 && !failed && (
        <p className="text-sm" style={{ color: COLORS.inkSoft }}>
          {tab === "following" ? t("salon.feed.emptyFollowing") : t(emptyKey)}{" "}
          {!handle && <Link to="/salon/new" className="underline underline-offset-2" style={{ color: COLORS.forestDeep }}>{t("salon.feed.writeFirst")}</Link>}
        </p>
      )}
      <ul className="grid gap-4 list-none p-0 m-0">
        {(rows ?? []).map((p) => (
          <li key={p.id}><PostCard post={p} onRemoved={(id) => setRows((r) => r.filter((x) => x.id !== id))} /></li>
        ))}
      </ul>
      {more && <div className="mt-6"><Button variant="secondary" loading={busy} onClick={loadMore}>{t("salon.more")}</Button></div>}
    </section>
  );
}

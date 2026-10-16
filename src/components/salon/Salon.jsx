import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { isAdmin } from "../../lib/atlasApi";
import { getMyProfile } from "../../lib/salonApi";
import { parseSalonPath } from "../../lib/salon/paths";
import { Notice } from "../kx";
import Feed from "./Feed";
import Compose from "./Compose";
import MyProfile from "./MyProfile";
import Profile from "./Profile";
import Moderation from "./Moderation";

// The Salon room (behind the "salon" flag): recipes and reviews that people
// choose to share, follows and likes, with reporting and moderation.
// Signed-in only. Private by default: nothing of yours is shown until you make
// your profile public.
export default function Salon() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const route = parseSalonPath(pathname);
  const [admin, setAdmin] = useState(false);
  const [mine, setMine] = useState(undefined);

  useEffect(() => {
    isAdmin().then(setAdmin).catch(() => {});
    getMyProfile().then(setMine).catch(() => setMine(null));
  }, [route.view]);

  const active = route.view === "profile" ? "feed" : route.view;
  const tabs = [["feed", "/salon"], ["new", "/salon/new"], ["me", "/salon/me"], ...(admin ? [["moderation", "/salon/moderation"]] : [])];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-6">
      <h1 className="font-serif text-4xl" style={{ color: COLORS.ink }}>{t("salon.title")}</h1>
      <p className="mt-2 text-sm max-w-prose" style={{ color: COLORS.inkSoft }}>{t("salon.lead")}</p>
      <Notice tone="warning" className="mt-4">{t("salon.safety")}</Notice>
      <nav aria-label={t("salon.navLabel")} className="flex gap-2 border-b overflow-x-auto mt-5 mb-6" style={{ borderColor: COLORS.line }}>
        {tabs.map(([id, to]) => (
          <Link key={id} to={to} aria-current={active === id ? "page" : undefined}
            className="px-3 py-2 text-sm -mb-px border-b-2 whitespace-nowrap min-h-[44px] inline-flex items-center"
            style={{ borderColor: active === id ? COLORS.forest : "transparent", color: active === id ? COLORS.forestDeep : COLORS.inkSoft }}>
            {t(`salon.nav.${id}`)}
          </Link>
        ))}
      </nav>
      {route.view === "feed" && mine === null && (
        <p role="status" className="text-sm mb-5" style={{ color: COLORS.inkSoft }}>{t("salon.feed.noProfile")} <Link to="/salon/me" className="underline underline-offset-2" style={{ color: COLORS.forestDeep }}>{t("salon.feed.setUp")}</Link></p>
      )}
      {route.view === "feed" && mine && !mine.is_public && (
        <p role="status" className="text-sm mb-5" style={{ color: COLORS.inkSoft }}>{t("salon.feed.privateNotice")} <Link to="/salon/me" className="underline underline-offset-2" style={{ color: COLORS.forestDeep }}>{t("salon.nav.me")}</Link></p>
      )}
      {route.view === "feed" && <Feed />}
      {route.view === "new" && <Compose />}
      {route.view === "me" && <MyProfile />}
      {route.view === "profile" && <Profile handle={route.handle} />}
      {route.view === "moderation" && <Moderation admin={admin} />}
    </div>
  );
}

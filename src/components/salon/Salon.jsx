import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { isAdmin } from "../../lib/atlasApi";
import { getMyProfile } from "../../lib/salonApi";
import { parseSalonPath } from "../../lib/salon/paths";
import { Notice, RoomHeader, RoomPage, TabLinks } from "../kx";
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
    <RoomPage className={route.view === "profile" ? "!pt-0" : ""}>
      {route.view !== "profile" && (
        <>
          <RoomHeader num="V" kicker={t("salon.title")} title={t("salon.headline")} />
          <p className="text-sm max-w-prose -mt-4" style={{ color: COLORS.inkSoft }}>{t("salon.lead")}</p>
          <Notice tone="warning">{t("salon.safety")}</Notice>
          <TabLinks label={t("salon.navLabel")} value={active} tabs={tabs.map(([id, to]) => ({ id, to, label: t(`salon.nav.${id}`) }))} />
        </>
      )}
      {route.view === "feed" && mine === null && (
        <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.feed.noProfile")} <Link to="/salon/me" className="underline underline-offset-2" style={{ color: COLORS.actionText }}>{t("salon.feed.setUp")}</Link></p>
      )}
      {route.view === "feed" && mine && !mine.is_public && (
        <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.feed.privateNotice")} <Link to="/salon/me" className="underline underline-offset-2" style={{ color: COLORS.actionText }}>{t("salon.nav.me")}</Link></p>
      )}
      {route.view === "feed" && <Feed />}
      {route.view === "new" && <Compose />}
      {route.view === "me" && <MyProfile />}
      {route.view === "profile" && <Profile handle={route.handle} />}
      {route.view === "moderation" && <Moderation admin={admin} />}
    </RoomPage>
  );
}

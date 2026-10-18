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
import RoomShell from "../kx/RoomShell";

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
    <RoomShell numeral="V" name={t("salon.title")} lead={t("salon.lead")} navLabel={t("salon.navLabel")}
      notice={<Notice tone="warning" className="mt-4">{t("salon.safety")}</Notice>}
      nav={tabs.map(([id, to]) => ({ id, to, label: t(`salon.nav.${id}`), active: active === id }))}>
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
    </RoomShell>
  );
}

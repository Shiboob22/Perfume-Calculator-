import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { RoomHeader, RoomPage, TabLinks } from "../kx";
import { useI18n } from "../../i18n/I18nProvider";
import { isAdmin, listTerms } from "../../lib/atlasApi";
import { parseAtlasPath } from "../../lib/atlas/entities";
import Search from "./Search";
import Browse from "./Browse";
import EntityPage from "./EntityPage";
import FragrancePage from "./FragrancePage";
import Contribute from "./Contribute";
import Review from "./Review";

// The Atlas room (behind the "atlas" flag): search the catalog, browse its
// houses, notes, accords and perfumers, read a fragrance, suggest a missing
// one. Signed-in only. Editors also get the review queue.
export default function Atlas() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const route = parseAtlasPath(pathname);
  const [terms, setTerms] = useState([]);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    listTerms().then(setTerms).catch(() => {});  // Arabic names are optional
    isAdmin().then(setAdmin).catch(() => {});
  }, []);

  const active = route.view === "fragrance" ? "search" : route.view === "entity" ? "browse" : route.view;
  const tabs = [["search", "/atlas"], ["browse", "/atlas/browse"], ["contribute", "/atlas/contribute"], ...(admin ? [["review", "/atlas/review"]] : [])];

  return (
    <RoomPage>
      {/* A fragrance's own page opens without the room's header, as the board's detail does. */}
      {route.view !== "fragrance" && (
        <>
          <RoomHeader num="IV" kicker={t("atlas.title")} title={t("atlas.headline")} />
          <p className="text-sm max-w-prose -mt-4" style={{ color: COLORS.inkSoft }}>{t("atlas.lead")}</p>
          <TabLinks label={t("atlas.navLabel")} value={active} tabs={tabs.map(([id, to]) => ({ id, to, label: t(`atlas.nav.${id}`) }))} />
        </>
      )}
      <div>
      {route.view === "search" && <Search />}
      {route.view === "browse" && <Browse terms={terms} />}
      {route.view === "entity" && <EntityPage kind={route.kind} entityKey={route.key} terms={terms} />}
      {route.view === "fragrance" && <FragrancePage id={route.id} terms={terms} />}
      {route.view === "contribute" && <Contribute />}
      {route.view === "review" && <Review admin={admin} />}
      </div>
    </RoomPage>
  );
}

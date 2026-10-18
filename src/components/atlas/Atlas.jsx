import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";
import { isAdmin, listTerms } from "../../lib/atlasApi";
import { parseAtlasPath } from "../../lib/atlas/entities";
import Search from "./Search";
import Browse from "./Browse";
import EntityPage from "./EntityPage";
import FragrancePage from "./FragrancePage";
import Contribute from "./Contribute";
import Review from "./Review";
import RoomShell from "../kx/RoomShell";

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
    <RoomShell light={false} numeral="IV" name={t("atlas.title")} lead={t("atlas.lead")} navLabel={t("atlas.navLabel")}
      nav={tabs.map(([id, to]) => ({ id, to, label: t(`atlas.nav.${id}`), active: active === id }))}>
      {route.view === "search" && <Search />}
      {route.view === "browse" && <Browse terms={terms} />}
      {route.view === "entity" && <EntityPage kind={route.kind} entityKey={route.key} terms={terms} />}
      {route.view === "fragrance" && <FragrancePage id={route.id} terms={terms} />}
      {route.view === "contribute" && <Contribute />}
      {route.view === "review" && <Review admin={admin} />}
    </RoomShell>
  );
}

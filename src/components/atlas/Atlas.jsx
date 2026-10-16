import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { isAdmin, listTerms } from "../../lib/atlasApi";
import { parseAtlasPath } from "../../lib/atlas/entities";
import Search from "./Search";
import Browse from "./Browse";
import EntityPage from "./EntityPage";
import FragrancePage from "./FragrancePage";
import Contribute from "./Contribute";
import Review from "./Review";
import RoomHeader from "../kx/RoomHeader";

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
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-6">
      <RoomHeader numeral="IV" name={t("atlas.title")} />
      <p className="text-sm max-w-prose" style={{ color: COLORS.inkSoft }}>{t("atlas.lead")}</p>
      <nav aria-label={t("atlas.navLabel")} className="flex gap-2 border-b overflow-x-auto mt-5 mb-6" style={{ borderColor: COLORS.line }}>
        {tabs.map(([id, to]) => (
          <Link key={id} to={to} aria-current={active === id ? "page" : undefined}
            className="px-4 text-[15px] -mb-px border-b-2 whitespace-nowrap min-h-[48px] inline-flex items-center"
            style={{ borderColor: active === id ? COLORS.actionText : "transparent", color: active === id ? COLORS.ink : COLORS.inkSoft }}>
            {t(`atlas.nav.${id}`)}
          </Link>
        ))}
      </nav>
      {route.view === "search" && <Search />}
      {route.view === "browse" && <Browse terms={terms} />}
      {route.view === "entity" && <EntityPage kind={route.kind} entityKey={route.key} terms={terms} />}
      {route.view === "fragrance" && <FragrancePage id={route.id} terms={terms} />}
      {route.view === "contribute" && <Contribute />}
      {route.view === "review" && <Review admin={admin} />}
    </div>
  );
}

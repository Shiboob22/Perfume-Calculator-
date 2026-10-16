import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { listBottles, listWear } from "../../lib/wardrobeApi";
import { localDay } from "../../lib/wardrobe/day";
import Today from "./Today";
import Collection from "./Collection";
import Stats from "./Stats";
import Lists from "./Lists";
import Privacy from "./Privacy";
import { RoomHeader, RoomPage, Tabs } from "../kx";
import { cat } from "../../lib/catalogue";

const SECTIONS = ["today", "collection", "stats", "lists"];

// The Wardrobe room (behind the "wardrobe" flag): your bottles, what you
// wore, what to reach for. Everything is private to the signed-in user.
export default function Wardrobe() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const section = SECTIONS.includes(params.get("section")) ? params.get("section") : "today";
  const [today] = useState(() => localDay());
  const [state, setState] = useState({ loading: true, failed: false });
  const [bottles, setBottles] = useState([]);
  const [wear, setWear] = useState([]);

  useEffect(() => {
    let live = true;
    Promise.all([listBottles(), listWear()])
      .then(([b, w]) => { if (live) { setBottles(b); setWear(w); setState({ loading: false, failed: false }); } })
      .catch(() => { if (live) setState({ loading: false, failed: true }); });
    return () => { live = false; };
  }, []);

  const go = (s) => setParams(s === "today" ? {} : { section: s }, { replace: true });
  const owned = bottles.filter((b) => b.status === "owned").length;

  return (
    <RoomPage>
      <RoomHeader num="II" kicker={t("wardrobe.title")} title={!state.loading && !state.failed && owned > 0 ? t("wardrobe.headline", { count: owned }) : t("wardrobe.title")} cat={owned > 0 ? cat("W", owned) : null} />
      <p className="text-sm max-w-prose -mt-4" style={{ color: COLORS.inkSoft }}>{t("wardrobe.lead")}</p>
      <Tabs label={t("wardrobe.tabsLabel")} idPrefix="wardrobe" value={section} onChange={go} tabs={SECTIONS.map((s) => ({ id: s, label: t(`wardrobe.tabs.${s}`) }))} />
      <div role="tabpanel" id={`wardrobe-${section}-panel`} aria-labelledby={`wardrobe-${section}`}>
      {state.loading ? (
        <p className="text-xs" role="status" style={{ color: COLORS.inkSoft }}>{t("wardrobe.loading")}</p>
      ) : state.failed ? (
        <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{t("wardrobe.loadFailed")}</p>
      ) : (
        <>
          {section === "today" && <Today bottles={bottles} wear={wear} today={today} onLogged={(w) => setWear((l) => [w, ...l])} onGoCollection={() => go("collection")} />}
          {section === "collection" && <Collection bottles={bottles} wear={wear} today={today} setBottles={setBottles} onLogged={(w) => setWear((l) => [w, ...l])} onGone={(id) => setWear((l) => l.filter((w) => w.bottle_id !== id))} />}
          {section === "stats" && <Stats bottles={bottles} wear={wear} />}
          {section === "lists" && <Lists bottles={bottles} today={today} setBottles={setBottles} />}
          <Privacy />
        </>
      )}
      </div>
    </RoomPage>
  );
}

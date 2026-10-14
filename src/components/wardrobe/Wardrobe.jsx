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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-6">
      <h1 className="font-serif text-4xl" style={{ color: COLORS.ink }}>{t("wardrobe.title")}</h1>
      <p className="mt-2 text-sm max-w-prose" style={{ color: COLORS.inkSoft }}>{t("wardrobe.lead")}</p>
      <nav aria-label={t("wardrobe.tabsLabel")} className="flex gap-2 border-b overflow-x-auto mt-5 mb-6" style={{ borderColor: COLORS.line }}>
        {SECTIONS.map((s) => (
          <button key={s} type="button" onClick={() => go(s)} aria-current={section === s ? "page" : undefined}
            className="px-3 py-2 text-sm -mb-px border-b-2 whitespace-nowrap min-h-[44px]"
            style={{ borderColor: section === s ? COLORS.forest : "transparent", color: section === s ? COLORS.forestDeep : COLORS.inkSoft }}>
            {t(`wardrobe.tabs.${s}`)}
          </button>
        ))}
      </nav>
      {state.loading ? (
        <p className="text-xs font-mono" role="status" style={{ color: COLORS.inkSoft }}>{t("wardrobe.loading")}</p>
      ) : state.failed ? (
        <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{t("wardrobe.loadFailed")}</p>
      ) : (
        <>
          {section === "today" && <Today bottles={bottles} wear={wear} today={today} onLogged={(w) => setWear((l) => [w, ...l])} onGoCollection={() => go("collection")} />}
          {section === "collection" && <Collection bottles={bottles} wear={wear} today={today} setBottles={setBottles} onGone={(id) => setWear((l) => l.filter((w) => w.bottle_id !== id))} />}
          {section === "stats" && <Stats bottles={bottles} wear={wear} />}
          {section === "lists" && <Lists bottles={bottles} today={today} setBottles={setBottles} />}
          <Privacy />
        </>
      )}
    </div>
  );
}

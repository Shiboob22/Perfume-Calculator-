import React, { useEffect, useState } from "react";
import { Link, Reveal } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { getFragrance, getRelated, getWearStats } from "../../lib/atlasApi";
import { addBottle } from "../../lib/wardrobeApi";
import { flagOn } from "../../lib/flags";
import { localDay } from "../../lib/wardrobe/day";
import { bottleRow } from "../../lib/wardrobe/validate";
import { entityHref, termName } from "../../lib/atlas/entities";
import Button from "../kx/Button";
import Chip from "../kx/Chip";
import Pyramid from "./Pyramid";
import { ResultRow } from "./ResultList";

// One fragrance: its facts, the notes as light, accords, perfumers,
// anonymous community counts (when enough people opted in), related
// fragrances, and a way to add it to your Wardrobe.
export default function FragrancePage({ id, terms }) {
  const { t, locale } = useI18n();
  const [f, setF] = useState(undefined); // undefined loading, null missing
  const [related, setRelated] = useState(null);
  const [wear, setWear] = useState(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const wardrobe = flagOn("wardrobe");

  useEffect(() => {
    let live = true;
    setF(undefined); setRelated(null); setWear(null); setFailed(false); setStatus(""); setError("");
    getFragrance(id).then((row) => { if (live) setF(row); }).catch(() => { if (live) { setF(null); setFailed(true); } });
    // Extras: a failure only hides the panel.
    getRelated(id).then((r) => { if (live) setRelated(r); }).catch(() => {});
    getWearStats(id).then((w) => { if (live) setWear(w); }).catch(() => {});
    return () => { live = false; };
  }, [id]);

  async function add(list) {
    setStatus(""); setError("");
    const checked = bottleRow({ name: f.name, status: list, family: f.tier, fragrance_id: f.id }, localDay());
    if (checked.errors) return setError(t("atlas.fragrance.addFailed"));
    try {
      await addBottle(checked.row);
      setStatus(t("atlas.fragrance.added", { list: t(`atlas.fragrance.lists.${list}`) }));
    } catch (e) {
      setError(e?.code === "54000" ? t("wardrobe.collection.limit") : t("atlas.fragrance.addFailed"));
    }
  }

  if (f === undefined) return <p role="status" className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>…</p>;
  if (f === null) return <p role={failed ? "alert" : "status"} className="text-sm" style={{ color: failed ? COLORS.danger : COLORS.inkSoft }}>{t(failed ? "atlas.loadFailed" : "atlas.fragrance.notFound")}</p>;

  const house = f.brand?.trim();
  const sameHouse = related?.same_brand ?? [];
  const similar = related?.similar ?? [];
  return (
    <Reveal as="article" eager aria-labelledby="atlas-fragrance-h">
      <Link to="/atlas" className="text-sm underline underline-offset-4 inline-flex items-center min-h-[44px]" style={{ color: COLORS.forest }}>{t("atlas.nav.search")}</Link>
      <h2 id="atlas-fragrance-h" className="font-serif text-3xl sm:text-4xl mt-1" style={{ color: COLORS.ink, viewTransitionName: `frag-${f.id}` }}>{f.name}</h2>
      <p className="mt-2 text-base flex flex-wrap items-center gap-x-4 gap-y-1" style={{ color: COLORS.inkSoft }}>
        {house && <Link to={entityHref("house", house)} className="underline underline-offset-4 inline-flex items-center min-h-[44px]" style={{ color: COLORS.ink }}>{t("atlas.fragrance.by", { house: termName(terms, "house", house.toLowerCase(), locale, house) })}</Link>}
        {f.year && <span className="font-mono tabular-nums">{t("atlas.fragrance.released", { year: String(f.year) })}</span>}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2 list-none p-0">
        {f.tier && <li><Chip>{t(`families.${f.tier}.label`)}</Chip></li>}
        {f.olfactory_family && <li><Chip>{f.olfactory_family}</Chip></li>}
        {f.gender && <li><Chip>{t(`atlas.genders.${f.gender}`)}</Chip></li>}
        {f.country && <li><Chip>{f.country}</Chip></li>}
        {f.rating && <li><Chip><span className="font-mono tabular-nums" dir="ltr">{t("atlas.fragrance.rating", { rating: Number(f.rating).toFixed(2) })}</span></Chip></li>}
      </ul>

      <section aria-labelledby="atlas-notes-h" className="mt-8">
        <h3 id="atlas-notes-h" className="font-serif italic text-xl mb-3" style={{ color: COLORS.ink }}>{t("atlas.fragrance.notes")}</h3>
        <Pyramid fragrance={f} terms={terms} />
      </section>

      {f.accords?.length > 0 && (
        <section aria-labelledby="atlas-accords-h" className="mt-8">
          <h3 id="atlas-accords-h" className="font-serif italic text-xl" style={{ color: COLORS.ink }}>{t("atlas.fragrance.accords")}</h3>
          <p className="text-xs mb-2" style={{ color: COLORS.dim }}>{t("atlas.fragrance.accordsLead")}</p>
          <ol className="flex flex-wrap gap-2 list-none p-0 m-0">
            {f.accords.map((a) => (
              <li key={a}><Chip to={entityHref("accord", a)}>{termName(terms, "accord", a.toLowerCase(), locale, a)}</Chip></li>
            ))}
          </ol>
        </section>
      )}

      {f.perfumers?.length > 0 && (
        <section aria-labelledby="atlas-perfumers-h" className="mt-8">
          <h3 id="atlas-perfumers-h" className="font-serif italic text-xl mb-2" style={{ color: COLORS.ink }}>{t("atlas.fragrance.perfumers")}</h3>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 list-none p-0 m-0">
            {f.perfumers.map((p) => (
              <li key={p}><Link to={entityHref("perfumer", p)} className="underline underline-offset-4 inline-flex items-center min-h-[44px]" style={{ color: COLORS.ink }}>{termName(terms, "perfumer", p.toLowerCase(), locale, p)}</Link></li>
            ))}
          </ul>
        </section>
      )}

      {wear?.shown && (
        <section aria-labelledby="atlas-wear-h" className="mt-8 p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
          <h3 id="atlas-wear-h" className="font-serif italic text-xl mb-2" style={{ color: COLORS.ink }}>{t("atlas.fragrance.wear.title")}</h3>
          <ul className="text-sm grid gap-1 list-none p-0 m-0" style={{ color: COLORS.ink }}>
            <li className="font-mono tabular-nums">{t("atlas.fragrance.wear.owners", { n: wear.owners })}</li>
            {wear.wearers != null && <li className="font-mono tabular-nums">{t("atlas.fragrance.wear.wearers", { n: wear.wearers })}</li>}
            {wear.occasions?.length > 0 && <li>{t("atlas.fragrance.wear.occasions")}: {wear.occasions.map((o) => t(`wardrobe.occasions.${o}`)).join(", ")}</li>}
          </ul>
          <p className="text-xs mt-3" style={{ color: COLORS.dim }}>{t("atlas.fragrance.wear.note")}</p>
        </section>
      )}

      {wardrobe && (
        <section aria-labelledby="atlas-add-h" className="mt-8">
          <h3 id="atlas-add-h" className="font-serif italic text-xl mb-2" style={{ color: COLORS.ink }}>{t("atlas.fragrance.add")}</h3>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => add("owned")}>{t("atlas.fragrance.addOwned")}</Button>
            <Button variant="secondary" onClick={() => add("wishlist")}>{t("atlas.fragrance.addWishlist")}</Button>
          </div>
          <p role="status" className="text-sm mt-2" style={{ color: COLORS.verdigrisText }}>{status}</p>
          {error && <p role="alert" className="text-sm mt-2" style={{ color: COLORS.danger }}>{error}</p>}
        </section>
      )}

      {similar.length > 0 && (
        <section aria-labelledby="atlas-similar-h" className="mt-10">
          <h3 id="atlas-similar-h" className="font-serif italic text-xl mb-3" style={{ color: COLORS.ink }}>{t("atlas.fragrance.similar")}</h3>
          <ul className="grid gap-3 list-none p-0 m-0">{similar.slice(0, 6).map((s) => <ResultRow key={s.id} f={s} />)}</ul>
        </section>
      )}
      {sameHouse.length > 0 && house && (
        <section aria-labelledby="atlas-house-h" className="mt-10">
          <h3 id="atlas-house-h" className="font-serif italic text-xl mb-3" style={{ color: COLORS.ink }}>{t("atlas.fragrance.sameHouse", { house })}</h3>
          <ul className="grid gap-3 list-none p-0 m-0">{sameHouse.slice(0, 4).map((s) => <ResultRow key={s.id} f={s} />)}</ul>
        </section>
      )}

      <p className="text-xs mt-10" style={{ color: COLORS.dim }}>
        {f.source ? `${t("atlas.fragrance.source", { source: f.source })}. ` : ""}{t("atlas.fragrance.sourceNote")}
      </p>
    </Reveal>
  );
}

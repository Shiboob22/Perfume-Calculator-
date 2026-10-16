import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { getFragrance, getRelated, getWearStats } from "../../lib/atlasApi";
import { addBottle } from "../../lib/wardrobeApi";
import { flagOn } from "../../lib/flags";
import { localDay } from "../../lib/wardrobe/day";
import { bottleRow } from "../../lib/wardrobe/validate";
import { entityHref, fragranceHref, termName } from "../../lib/atlas/entities";
import Button from "../kx/Button";
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
  const blend = `/bench?${new URLSearchParams({ name: f.name, ...(f.tier ? { family: f.tier } : {}) })}`;
  return (
    <article aria-labelledby="atlas-fragrance-h" className="flex flex-col gap-10">
      <div className="flex items-center justify-between gap-4">
        <Link to="/atlas" className="inline-flex items-center gap-2 min-h-[44px] text-sm" style={{ color: COLORS.inkSoft }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden="true"><path d="M16.5 10h-13M8.5 5l-5 5 5 5" /></svg>
          {t("atlas.fragrance.all")}
        </Link>
      </div>
      <header className="flex flex-col gap-3">
        <p className="flex flex-wrap gap-x-4 text-sm" style={{ color: COLORS.dim }}>
          {f.tier && <span style={{ color: COLORS.actionText }}>{t(`families.${f.tier}.label`)}</span>}
          {f.year && <span dir="ltr">{f.year}</span>}
          {f.olfactory_family && <span>{f.olfactory_family}</span>}
        </p>
        <h1 id="atlas-fragrance-h" className="font-serif font-light text-[clamp(40px,6vw,84px)] leading-[1.05] rtl:leading-[1.4] tracking-[-0.01em] rtl:tracking-normal" dir="auto">{f.name}</h1>
        {house && (
          <Link to={entityHref("house", house)} className="text-xl inline-flex items-center min-h-[44px] self-start hover:underline underline-offset-4" style={{ color: COLORS.dim }}>
            {termName(terms, "house", house.toLowerCase(), locale, house)}
          </Link>
        )}
      </header>

      <div className="grid gap-10 min-[1000px]:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="flex flex-col gap-10 min-w-0">
          {f.accords?.length > 0 && (
            <section aria-labelledby="atlas-accords-h">
              <h3 id="atlas-accords-h" className="font-serif text-[28px] mb-1 rtl:leading-[1.5]">{t("atlas.fragrance.accords")}</h3>
              <p className="text-sm mb-3" style={{ color: COLORS.dim }}>{t("atlas.fragrance.accordsLead")}</p>
              <ol className="list-none p-0 m-0" style={{ borderTop: `1px solid ${COLORS.dim}` }}>
                {f.accords.map((a, i) => (
                  <li key={a} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                    <Link to={entityHref("accord", a)} className="flex items-baseline justify-between gap-4 min-h-[52px] py-3 hover:underline underline-offset-4">
                      <span>{termName(terms, "accord", a.toLowerCase(), locale, a)}</span>
                      <span dir="ltr" className="text-sm" style={{ color: COLORS.dim }}>{i + 1}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="atlas-notes-h">
            <h3 id="atlas-notes-h" className="font-serif text-[28px] mb-3 rtl:leading-[1.5]">{t("atlas.fragrance.notes")}</h3>
            <Pyramid fragrance={f} terms={terms} />
          </section>

          {f.perfumers?.length > 0 && (
            <section aria-labelledby="atlas-perfumers-h">
              <h3 id="atlas-perfumers-h" className="font-serif text-[28px] mb-2 rtl:leading-[1.5]">{t("atlas.fragrance.perfumers")}</h3>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 list-none p-0 m-0">
                {f.perfumers.map((p) => (
                  <li key={p}><Link to={entityHref("perfumer", p)} className="underline underline-offset-4 inline-flex items-center min-h-[44px]" style={{ color: COLORS.ink }}>{termName(terms, "perfumer", p.toLowerCase(), locale, p)}</Link></li>
                ))}
              </ul>
            </section>
          )}

          {wear?.shown && (
            <section aria-labelledby="atlas-wear-h" className="p-5 rounded-sm" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
              <h3 id="atlas-wear-h" className="font-serif text-2xl mb-2">{t("atlas.fragrance.wear.title")}</h3>
              <ul className="text-sm grid gap-1 list-none p-0 m-0" style={{ color: COLORS.ink }}>
                <li dir="auto">{t("atlas.fragrance.wear.owners", { n: wear.owners })}</li>
                {wear.wearers != null && <li dir="auto">{t("atlas.fragrance.wear.wearers", { n: wear.wearers })}</li>}
                {wear.occasions?.length > 0 && <li>{t("atlas.fragrance.wear.occasions")}: {wear.occasions.map((o) => t(`wardrobe.occasions.${o}`)).join(", ")}</li>}
              </ul>
              <p className="text-xs mt-3" style={{ color: COLORS.dim }}>{t("atlas.fragrance.wear.note")}</p>
            </section>
          )}

          {sameHouse.length > 0 && house && (
            <section aria-labelledby="atlas-house-h">
              <h3 id="atlas-house-h" className="font-serif text-[28px] mb-3 rtl:leading-[1.5]">{t("atlas.fragrance.sameHouse", { house })}</h3>
              <ul className="list-none p-0 m-0" style={{ borderTop: `1px solid ${COLORS.dim}` }}>{sameHouse.slice(0, 4).map((s) => <ResultRow key={s.id} f={s} />)}</ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-5 min-w-0">
          <section aria-label={t("atlas.fragrance.houseCard")} className="p-6 rounded-sm flex flex-col gap-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
            <p className="text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case" style={{ color: COLORS.dim }}>{t("atlas.search.house")}</p>
            <p className="font-serif text-[28px] leading-tight rtl:leading-[1.5]" dir="auto">{house || "—"}</p>
            <dl className="grid grid-cols-2" style={{ border: `1px solid ${COLORS.line}` }}>
              {[[t("atlas.fragrance.country"), f.country || "—"], [t("atlas.fragrance.gender"), f.gender ? t(`atlas.genders.${f.gender}`) : "—"]].map(([k, v], i) => (
                <div key={k} className="p-3" style={{ borderInlineStart: i ? `1px solid ${COLORS.line}` : "none" }}>
                  <dt className="text-xs" style={{ color: COLORS.dim }}>{k}</dt>
                  <dd className="mt-1.5">{v}</dd>
                </div>
              ))}
            </dl>
            {f.rating && <p className="text-sm" dir="ltr" style={{ color: COLORS.dim }}>{t("atlas.fragrance.rating", { rating: Number(f.rating).toFixed(2) })}</p>}
          </section>

          {wardrobe && (
            <section aria-labelledby="atlas-add-h" className="flex flex-col gap-3">
              <h3 id="atlas-add-h" className="sr-only">{t("atlas.fragrance.add")}</h3>
              <Button size="lg" onClick={() => add("owned")} className="on-resin">{t("atlas.fragrance.addOwned")}</Button>
              <Button size="lg" variant="secondary" onClick={() => add("wishlist")}>{t("atlas.fragrance.addWishlist")}</Button>
              <p role="status" className="text-sm" style={{ color: COLORS.verdigrisText }}>{status}</p>
              {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
            </section>
          )}
          <Button as="a" href={blend} variant="secondary" size="lg">{t("atlas.fragrance.useBlend")}</Button>

          {similar.length > 0 && (
            <section aria-labelledby="atlas-similar-h">
              <h3 id="atlas-similar-h" className="text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case pb-3" style={{ color: COLORS.dim, borderBottom: `1px solid ${COLORS.dim}` }}>{t("atlas.fragrance.similar")}</h3>
              <ul className="list-none p-0 m-0">
                {similar.slice(0, 6).map((s) => (
                  <li key={s.id} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                    <Link to={fragranceHref(s.id)} className="block py-4 min-h-[56px]">
                      <span className="block font-serif text-xl rtl:leading-[1.5]">{s.name}</span>
                      <span className="block text-sm mt-0.5" style={{ color: COLORS.dim }}>{[s.brand, s.year].filter(Boolean).join(" · ")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <p className="text-xs" style={{ color: COLORS.dim }}>
        {f.source ? `${t("atlas.fragrance.source", { source: f.source })}. ` : ""}{t("atlas.fragrance.sourceNote")}
      </p>
    </article>
  );
}

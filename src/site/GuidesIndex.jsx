import React, { useMemo, useState } from "react";
import RoomBeam from "../components/kx/RoomBeam";
import { Link, Reveal } from "../motion";
import { COLORS, SHAPE, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { GUIDES, SECTIONS } from "../content/guides";
import { searchGuides } from "../content/search";
import { localePath } from "./meta";
import MethodSequence from "./MethodSequence";
import { Folio } from "./editorial";
import Chip from "../components/kx/Chip";
import { GLOSSARY_ENTRIES, glossaryTerm } from "../content/glossary";

// The two sections are different kinds of reading, so they look different:
// Blending is one method in order (numbered steps); Wearing is a set of
// stand-alone parts of Vol. I, laid out like a book's contents with the
// handbook's own part numbers as the citation.

// "Part I" → "I"; several parts → "XIII–XV".
function partNumbers(sections) {
  const n = sections.map((s) => s.replace(/^Part\s+/, ""));
  return n.length > 1 ? `${n[0]}–${n[n.length - 1]}` : n[0];
}

function Contents({ guides }) {
  const { t, locale } = useI18n();
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 md:gap-x-10">
      {guides.map((g) => {
        const parts = g.source.sections;
        return (
          <li key={g.slug} className={`border-t ${SHAPE.row}`} style={{ borderColor: COLORS.line }}>
            <Link to={localePath(locale, `/library/${g.slug}`)} className="group grid sm:grid-cols-[6.5rem_minmax(0,1fr)] gap-1 sm:gap-3 py-5">
              <span className="font-mono text-xs sm:pt-1.5 whitespace-nowrap" style={{ color: COLORS.dim }}>
                {t(parts.length > 1 ? "site.guides.parts" : "site.guides.part", { n: partNumbers(parts) })}
              </span>
              <span>
                <span className="block font-serif text-xl leading-snug group-hover:underline underline-offset-4" style={{ color: COLORS.forestDeep }}>{g[locale].title}</span>
                <span className="block mt-1 text-sm leading-relaxed" style={{ color: COLORS.inkSoft }}>{g[locale].summary}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// The glossary: each term's definition is the handbook's own sentence, quoted
// from the guide it belongs to (src/content/glossary.js). Nothing else is added.
function Glossary() {
  const { t, locale } = useI18n();
  const terms = useMemo(() => GLOSSARY_ENTRIES.map((e) => glossaryTerm(e, locale)).filter(Boolean), [locale]);
  return (
    <section aria-labelledby="gloss-h">
      <h2 id="gloss-h" className="sr-only">{t("site.guides.tabs.glossary")}</h2>
      <p className="mb-2 text-sm" style={{ color: COLORS.dim }}>{t("site.guides.glossary.count", { count: terms.length })}</p>
      <p className="mb-8 max-w-2xl" style={{ color: COLORS.inkSoft }}>{t("site.guides.glossary.lead")}</p>
      <dl style={{ borderTop: `1px solid ${COLORS.ink}` }}>
        {terms.map((g) => {
          const guide = GUIDES.find((x) => x.slug === g.slug);
          return (
            <div key={g.id} className="grid md:grid-cols-[14rem_minmax(0,1fr)] gap-x-8 gap-y-1 py-5" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <dt className="font-serif text-2xl rtl:leading-[1.5]" style={{ color: COLORS.ink }}>{g.term}</dt>
              <dd className="m-0">
                <p className="font-serif leading-relaxed rtl:leading-[1.95]" style={{ color: COLORS.inkSoft }}>{g.text}</p>
                <Link to={localePath(locale, `/library/${g.slug}#${g.section}`)} className="inline-flex items-center min-h-[44px] mt-1 text-sm underline underline-offset-4" style={{ color: COLORS.actionText }}>
                  {t("site.guides.glossary.from", { title: guide?.[locale]?.title ?? g.slug })}
                </Link>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export default function GuidesIndex() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [tab, setTab] = useState("essays");
  const found = useMemo(() => searchGuides(GUIDES, locale, query), [locale, query]);
  const shown = section === "all" ? found : found.filter((g) => g.section === section);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-10">
      <RoomBeam at={2} />
      <p className="flex items-baseline gap-3 mb-4 text-xs" style={{ color: COLORS.dim }}>
        <span aria-hidden="true" dir="ltr" className={`${TYPE.numeral} not-italic text-lg`} style={{ color: COLORS.actionText }}>III</span>
        <span className="uppercase tracking-[0.14em] rtl:tracking-normal">{t("site.compounding.rooms.library.name")}</span>
      </p>
      <h1 className={`${TYPE.display} mb-5`} style={{ color: COLORS.forestDeep }}>{t("site.guides.title")}</h1>
      <p className={`measure ${TYPE.lead}`} style={{ color: COLORS.inkSoft }}>{t("site.guides.lead")} {t("site.guides.by")}.</p>

      <div role="group" aria-label={t("site.guides.tabs.label")} className="mt-8 flex border-b" style={{ borderColor: COLORS.line }}>
        {["essays", "glossary"].map((k) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className="px-4 min-h-[48px] text-[15px] -mb-px border-b-2"
            style={{ borderColor: tab === k ? COLORS.actionText : "transparent", color: tab === k ? COLORS.ink : COLORS.inkSoft }}>
            {t(`site.guides.tabs.${k}`)}
          </button>
        ))}
      </div>
      {tab === "glossary" ? <div className="mt-10 mb-16"><Glossary /></div> : (<>
      <div className="mt-8 mb-12 flex flex-col md:flex-row md:items-center gap-4">
        <label htmlFor="guide-search" className="sr-only">{t("site.guides.search")}</label>
        <input id="guide-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("site.guides.search")}
          className={`w-full md:max-w-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 ${SHAPE.control}`}
          style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.field}`, color: COLORS.ink }} />
        {/* Toggle buttons (aria-pressed), not radios: radios promise an
            arrow-key model these buttons don't have. */}
        <div role="group" aria-label={t("site.guides.filter")} className="flex flex-wrap gap-2">
          {["all", ...SECTIONS].map((s) => (
            <Chip key={s} onToggle={() => setSection(s)} pressed={section === s} count={s === "all" ? found.length : found.filter((g) => g.section === s).length}>
              {t(`site.guides.sections.${s}`)}
            </Chip>
          ))}
        </div>
      </div>

      <p role="status" style={{ color: COLORS.inkSoft }}>{shown.length === 0 ? t("site.guides.noResults") : ""}</p>

      {SECTIONS.map((s, part) => {
        const items = shown.filter((g) => g.section === s);
        if (!items.length) return null;
        const first = items[0].source;
        return (
          <Reveal as="section" key={s} aria-labelledby={`guides-${s}`} className="reveal mb-16 pt-8" style={{ borderTop: `1px solid ${COLORS.line}` }}>
            <div className="flex items-baseline gap-4">
              <span aria-hidden="true" dir="ltr" className={`${TYPE.numeral} text-5xl`} style={{ color: COLORS.amberDeep }}>{["I", "II", "III"][part]}</span>
              <h2 id={`guides-${s}`} className={TYPE.title} style={{ color: COLORS.forestDeep }}>{t(`site.guides.sections.${s}`)}</h2>
            </div>
            <p className="mt-2 mb-8 max-w-2xl" style={{ color: COLORS.inkSoft }}>
              {t(`site.guides.intro.${s}`, { source: t("site.guides.fromShort", { volume: first.volume, book: t(`site.guides.books.${first.book}`) }) })}
            </p>
            {s === "blending" ? <MethodSequence guides={items} showCalculator /> : <Contents guides={items} />}
          </Reveal>
        );
      })}
      </>)}
      <Folio><span>{t("brand")}</span><span>{t("site.guides.by")}</span></Folio>
    </div>
  );
}

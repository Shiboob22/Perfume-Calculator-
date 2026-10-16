import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { cat, roman } from "../lib/catalogue";
import { useI18n } from "../i18n/I18nProvider";
import { GUIDES, SECTIONS } from "../content/guides";
import { GLOSSARY_ENTRIES, glossaryTerm } from "../content/glossary";
import { searchGuides, readingMinutes } from "../content/search";
import { RoomHeader, RoomPage, Tabs, Chip } from "../components/kx";
import { localePath } from "./meta";

// The Library (Design/boards/Library.dc.html): the guides as a featured one
// and a ruled list with their catalogue numbers, a glossary of the terms the
// handbooks define, search and a section filter. Public and prerendered: the
// guides list is whole without script.
const number = (g) => cat("L", GUIDES.indexOf(g) + 1);

function Featured({ guide }) {
  const { t, locale } = useI18n();
  const g = guide[locale];
  return (
    <Link to={localePath(locale, `/library/${guide.slug}`)} className="group grid md:grid-cols-[300px_minmax(0,1fr)] rounded-sm overflow-hidden"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <div className="relative min-h-[160px] md:min-h-[370px] p-6 flex flex-col justify-between" style={{ background: COLORS.cardHi, borderInlineEnd: `1px solid ${COLORS.line}` }}>
        <span aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(90% 60% at 20% 0%, color-mix(in srgb, var(--c-amber) 28%, transparent), transparent 70%)" }} />
        <span dir="ltr" className="relative text-xs tracking-[0.06em]" style={{ color: COLORS.dim }}>{number(guide)}</span>
        <span aria-hidden="true" dir="ltr" className="relative font-serif text-[96px] leading-none" style={{ color: COLORS.actionText }}>{roman(1)}</span>
      </div>
      <div className="p-6 sm:p-10 flex flex-col justify-between gap-8">
        <p className="flex gap-4 text-sm" style={{ color: COLORS.dim }}>
          <span style={{ color: COLORS.actionText }}>{t(`site.guides.sections.${guide.section}`)}</span>
          <span>{t("site.library.minutes", { n: readingMinutes(g) })}</span>
        </p>
        <div className="flex flex-col gap-4">
          <h2 className="font-serif font-light text-[clamp(30px,3.4vw,48px)] leading-[1.15] rtl:leading-[1.5] max-w-[22ch]">{g.title}</h2>
          <p className="text-lg max-w-[48ch]" style={{ color: COLORS.dim }}>{g.summary}</p>
        </div>
        <span className="inline-flex items-center gap-2 font-semibold group-hover:underline underline-offset-4" style={{ color: COLORS.actionText }}>
          {t("site.library.read")}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden="true"><path d="M3.5 10h13M11.5 5l5 5-5 5" /></svg>
        </span>
      </div>
    </Link>
  );
}

function Rows({ guides }) {
  const { t, locale } = useI18n();
  return (
    <ol style={{ borderTop: `1px solid ${COLORS.ink}` }}>
      {guides.map((g) => (
        <li key={g.slug} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
          <Link to={localePath(locale, `/library/${g.slug}`)} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[96px_minmax(0,1fr)_140px_72px] items-baseline gap-x-6 gap-y-1 py-5 min-h-[56px] hover:bg-[color:var(--c-card)]">
            <span dir="ltr" className="hidden sm:block text-xs tracking-[0.06em]" style={{ color: COLORS.dim }}>{number(g)}</span>
            <span className="font-serif text-[22px] sm:text-2xl leading-snug rtl:leading-[1.6] hover:underline underline-offset-4">{g[locale].title}</span>
            <span className="hidden sm:block text-sm" style={{ color: COLORS.inkSoft }}>{t(`site.guides.sections.${g.section}`)}</span>
            <span dir="auto" className="text-sm text-end" style={{ color: COLORS.inkSoft }}>{t("site.library.minutes", { n: readingMinutes(g[locale]) })}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function Glossary() {
  const { t, locale } = useI18n();
  const terms = GLOSSARY_ENTRIES.map((e) => glossaryTerm(e, locale)).filter(Boolean);
  return (
    <section aria-label={t("site.library.tabs.glossary")} className="flex flex-col gap-5">
      <p className="text-sm" style={{ color: COLORS.dim }}>{t("site.library.glossary.showing", { n: terms.length })}</p>
      <dl style={{ borderTop: `1px solid ${COLORS.ink}` }}>
        {terms.map((x, i) => {
          const source = GUIDES.find((s) => s.slug === x.slug);
          return (
            <div key={x.id} id={`term-${x.id}`} className="grid sm:grid-cols-[96px_220px_minmax(0,1fr)] gap-x-6 gap-y-1 py-5 scroll-mt-24" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <span dir="ltr" className="text-xs tracking-[0.06em] sm:pt-2" style={{ color: COLORS.dim }}>{cat("G", i + 1)}</span>
              <dt className="font-serif text-[26px] leading-tight rtl:leading-[1.5]">{x.term}</dt>
              <dd style={{ color: COLORS.inkSoft }}>
                {x.text}{" "}
                <Link to={`${localePath(locale, `/library/${x.slug}`)}#${x.section}`} className="text-sm underline underline-offset-4 whitespace-nowrap" style={{ color: COLORS.actionText }}>
                  {t("site.library.glossary.from", { title: source?.[locale]?.title ?? x.slug })}
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
  const [view, setView] = useState("guides");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const found = useMemo(() => searchGuides(GUIDES, locale, query), [locale, query]);
  const shown = section === "all" ? found : found.filter((g) => g.section === section);
  const counts = (s) => (s === "all" ? GUIDES.length : GUIDES.filter((g) => g.section === s).length);
  const terms = GLOSSARY_ENTRIES.filter((e) => glossaryTerm(e, locale)).length;

  return (
    <RoomPage>
      <RoomHeader num="III" kicker={t("site.library.kicker")} title={t("site.library.headline", { guides: GUIDES.length, terms })} cat={cat("L", GUIDES.length)} />
      <p className="max-w-[56ch] -mt-4" style={{ color: COLORS.inkSoft }}>{t("site.guides.lead")} {t("site.guides.by")}.</p>
      <Tabs label={t("site.library.tabsLabel")} idPrefix="library" value={view} onChange={setView}
        tabs={[{ id: "guides", label: t("site.library.tabs.guides") }, { id: "glossary", label: t("site.library.tabs.glossary") }]} />

      <div role="tabpanel" id={`library-${view}-panel`} aria-labelledby={`library-${view}`} className="flex flex-col gap-7 md:gap-10">
        {view === "glossary" ? <Glossary /> : (
          <>
            {!query && section === "all" && <Featured guide={GUIDES[0]} />}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div role="group" aria-label={t("site.guides.filter")} className="flex flex-wrap gap-2">
                {["all", ...SECTIONS].map((s) => (
                  <Chip key={s} pressed={section === s} count={counts(s)} onClick={() => setSection(s)}>{t(`site.guides.sections.${s}`)}</Chip>
                ))}
              </div>
              <label htmlFor="guide-search" className="sr-only">{t("site.guides.search")}</label>
              <input id="guide-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("site.guides.search")}
                className="w-full md:ms-auto md:max-w-xs px-4 min-h-[44px] text-sm rounded-sm focus:outline-none focus:ring-2"
                style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.field}`, color: COLORS.ink }} />
            </div>
            <p role="status" className="text-sm -my-3" style={{ color: COLORS.inkSoft }}>{shown.length === 0 ? t("site.guides.noResults") : ""}</p>
            <Rows guides={shown} />
          </>
        )}
      </div>
    </RoomPage>
  );
}

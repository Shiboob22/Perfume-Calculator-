import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS, SHAPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { GUIDES, SECTIONS } from "../content/guides";
import { searchGuides } from "../content/search";
import { localePath } from "./meta";
import MethodSequence from "./MethodSequence";

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
            <Link to={localePath(locale, `/guides/${g.slug}`)} className="group grid sm:grid-cols-[6.5rem_minmax(0,1fr)] gap-1 sm:gap-3 py-5">
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

export default function GuidesIndex() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const found = useMemo(() => searchGuides(GUIDES, locale, query), [locale, query]);
  const shown = section === "all" ? found : found.filter((g) => g.section === section);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-10">
      <h1 className="font-serif italic text-5xl mb-3" style={{ color: COLORS.forestDeep }}>{t("site.guides.title")}</h1>
      <p className="text-lg max-w-2xl" style={{ color: COLORS.inkSoft }}>{t("site.guides.lead")} {t("site.guides.by")}.</p>

      <div className="mt-8 mb-12 flex flex-col md:flex-row md:items-center gap-4">
        <label htmlFor="guide-search" className="sr-only">{t("site.guides.search")}</label>
        <input id="guide-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("site.guides.search")}
          className={`w-full md:max-w-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 ${SHAPE.control}`}
          style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.field}`, color: COLORS.ink }} />
        {/* Toggle buttons (aria-pressed), not radios: radios promise an
            arrow-key model these buttons don't have. */}
        <div role="group" aria-label={t("site.guides.filter")} className="flex gap-5">
          {["all", ...SECTIONS].map((s) => (
            <button key={s} type="button" aria-pressed={section === s} onClick={() => setSection(s)}
              className="py-1 min-h-[24px] text-sm border-b-2" style={{ borderColor: section === s ? COLORS.amber : "transparent", color: section === s ? COLORS.forestDeep : COLORS.inkSoft }}>
              {t(`site.guides.sections.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <p role="status" style={{ color: COLORS.inkSoft }}>{shown.length === 0 ? t("site.guides.noResults") : ""}</p>

      {SECTIONS.map((s) => {
        const items = shown.filter((g) => g.section === s);
        if (!items.length) return null;
        const first = items[0].source;
        return (
          <section key={s} aria-labelledby={`guides-${s}`} className="mb-16">
            <h2 id={`guides-${s}`} className="font-serif italic text-3xl sm:text-4xl" style={{ color: COLORS.forestDeep }}>{t(`site.guides.sections.${s}`)}</h2>
            <p className="mt-2 mb-8 max-w-2xl" style={{ color: COLORS.inkSoft }}>
              {t(`site.guides.intro.${s}`, { source: t("site.guides.fromShort", { volume: first.volume, book: t(`site.guides.books.${first.book}`) }) })}
            </p>
            {s === "blending" ? <MethodSequence guides={items} showCalculator /> : <Contents guides={items} />}
          </section>
        );
      })}
    </div>
  );
}

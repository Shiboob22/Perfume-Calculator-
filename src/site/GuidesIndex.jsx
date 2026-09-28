import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { GUIDES, SECTIONS } from "../content/guides";
import { searchGuides, readingMinutes } from "../content/search";
import { localePath } from "./meta";

export default function GuidesIndex() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const found = useMemo(() => searchGuides(GUIDES, locale, query), [locale, query]);
  const shown = section === "all" ? found : found.filter((g) => g.section === section);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-10">
      <h1 className="font-serif italic text-5xl mb-3" style={{ color: COLORS.forestDeep }}>{t("site.guides.title")}</h1>
      <p className="text-lg" style={{ color: COLORS.inkSoft }}>{t("site.guides.lead")}</p>
      <p className="mt-1 mb-8 text-sm" style={{ color: COLORS.inkSoft }}>{t("site.guides.by")}</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <label htmlFor="guide-search" className="sr-only">{t("site.guides.search")}</label>
        <input id="guide-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("site.guides.search")}
          className="flex-1 px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2"
          style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.field}`, color: COLORS.ink }} />
        <div role="radiogroup" aria-label={t("site.guides.filter")} className="flex gap-2">
          {["all", ...SECTIONS].map((s) => (
            <button key={s} type="button" role="radio" aria-checked={section === s} onClick={() => setSection(s)}
              className="px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${section === s ? COLORS.amber : COLORS.line}`, color: section === s ? COLORS.amber : COLORS.inkSoft }}>
              {t(`site.guides.sections.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && <p style={{ color: COLORS.inkSoft }}>{t("site.guides.noResults")}</p>}

      {SECTIONS.map((s) => {
        const items = shown.filter((g) => g.section === s);
        if (!items.length) return null;
        return (
          <section key={s} className="mb-10">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] mb-4" style={{ color: COLORS.amberDeep }}>{t(`site.guides.sections.${s}`)}</h2>
            <ol className="space-y-3">
              {items.map((g) => (
                <li key={g.slug}>
                  <Link to={localePath(locale, `/guides/${g.slug}`)} className="block rounded-xl p-5 transition-transform hover:-translate-y-0.5"
                    style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
                    <span className="block font-serif text-2xl" style={{ color: COLORS.forestDeep }}>{g[locale].title}</span>
                    <span className="block mt-1 leading-relaxed" style={{ color: COLORS.inkSoft }}>{g[locale].summary}</span>
                    <span className="block mt-2 font-mono text-[11px]" style={{ color: COLORS.dim }}>
                      {t("site.guides.minutes", { count: readingMinutes(g[locale]) })} · {t("site.guides.fromShort", { volume: g.source.volume, book: t(`site.guides.books.${g.source.book}`) })}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

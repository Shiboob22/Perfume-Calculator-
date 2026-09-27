import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { GUIDES } from "../content/guides";
import { localePath } from "./meta";

export default function GuidesIndex() {
  const { t, locale } = useI18n();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-10">
      <h1 className="font-serif italic text-5xl mb-3" style={{ color: COLORS.forestDeep }}>{t("site.guides.title")}</h1>
      <p className="text-lg" style={{ color: COLORS.inkSoft }}>{t("site.guides.lead")}</p>
      <p className="mt-1 mb-10 text-sm" style={{ color: COLORS.inkSoft }}>{t("site.guides.by")}</p>

      <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] mb-4" style={{ color: COLORS.amberDeep }}>{t("site.guides.blending")}</h2>
      <ol className="space-y-3">
        {GUIDES.map((g, i) => (
          <li key={g.slug}>
            <Link to={localePath(locale, `/guides/${g.slug}`)} className="flex gap-4 rounded-xl p-5 transition-transform hover:-translate-y-0.5"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
              <span className="font-mono text-sm pt-1" style={{ color: COLORS.amberDeep }}>{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block font-serif text-2xl" style={{ color: COLORS.forestDeep }}>{g[locale].title}</span>
                <span className="block mt-1 leading-relaxed" style={{ color: COLORS.inkSoft }}>{g[locale].summary}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

import React from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { LEGAL } from "../content/legal";

// /privacy and /terms. While a page is a draft it says so at the top.
export default function LegalPage({ page }) {
  const { t, locale } = useI18n();
  const doc = LEGAL[page];
  const text = doc[locale];
  return (
    <article className="max-w-2xl mx-auto px-4 sm:px-8 pt-10">
      {doc.draft && (
        <p role="note" className="mb-6 p-3 rounded-lg text-sm" style={{ background: COLORS.dangerBg, border: `1px solid ${COLORS.danger}`, color: COLORS.ink }}>
          {t("site.legal.draft")}
        </p>
      )}
      <h1 className="font-serif italic text-5xl mb-3" style={{ color: COLORS.forestDeep }}>{text.title}</h1>
      <p className="text-sm font-mono mb-8" style={{ color: COLORS.inkSoft }}>{t("site.legal.updated", { date: doc.updated })}</p>
      <p className="text-lg mb-8" style={{ color: COLORS.inkSoft }}>{text.summary}</p>
      {text.sections.map((s) => (
        <section key={s.id} id={s.id} className="mb-8">
          <h2 className="font-serif text-2xl mb-3" style={{ color: COLORS.forestDeep }}>{s.h}</h2>
          {s.p.map((para, i) => <p key={i} className="mb-3 leading-relaxed" style={{ color: COLORS.ink }}>{para}</p>)}
        </section>
      ))}
    </article>
  );
}

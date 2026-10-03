import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { GUIDES } from "../content/guides";
import { localePath } from "./meta";

// The Blending guides are one method read in order (principle → arithmetic
// → bench), so they are numbered; the number is each guide's place in the
// whole sequence, kept when a search hides some of them. A vertical rule on
// a phone, a rule across the top on wider screens. Used by the guides index
// and the landing page.
const METHOD = GUIDES.filter((g) => g.section === "blending");

export function calculatorHref(guide) {
  const c = guide.calculator;
  return c ? `/app/calculator?${new URLSearchParams({ size: c.size, unit: c.unit, conc: c.conc })}` : null;
}

export default function MethodSequence({ guides = METHOD, showCalculator = false }) {
  const { t, locale } = useI18n();
  return (
    <ol className="grid grid-cols-1 md:grid-cols-3">
      {guides.map((g, i) => {
        const n = String(METHOD.findIndex((m) => m.slug === g.slug) + 1).padStart(2, "0");
        const calc = showCalculator && calculatorHref(g);
        const last = i === guides.length - 1;
        return (
          <li key={g.slug} className="grid grid-cols-[2.75rem_minmax(0,1fr)] md:block md:pe-8">
            <span aria-hidden="true" dir="ltr" className="font-mono text-sm pt-1 md:block md:pt-0 md:pb-3 md:border-b" style={{ color: COLORS.amberDeep, borderColor: COLORS.field }}>{n}</span>
            <div className={`ps-5 border-s md:border-s-0 md:ps-0 md:pt-4 md:pb-0 ${last ? "pb-0" : "pb-8"}`} style={{ borderColor: COLORS.line }}>
              <Link to={localePath(locale, `/guides/${g.slug}`)} className="group block">
                <span className="block font-serif text-2xl leading-snug group-hover:underline underline-offset-4" style={{ color: COLORS.forestDeep }}>{g[locale].title}</span>
                <span className="block mt-2 leading-relaxed" style={{ color: COLORS.inkSoft }}>{g[locale].summary}</span>
              </Link>
              {calc && (
                <a href={calc} className="inline-block mt-3 text-sm underline underline-offset-4 min-h-[24px]" style={{ color: COLORS.amber }}>
                  {t("site.guides.openCalc")} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

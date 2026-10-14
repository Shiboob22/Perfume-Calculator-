import React from "react";
import { Link } from "react-router-dom";
import { COLORS, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { GUIDES } from "../content/guides";
import { IconArrow } from "../components/icons";
import { localePath } from "./meta";
import { readingMinutes } from "../content/search";

const METHOD = GUIDES.filter((g) => g.section === "blending");
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** The guide library as ruled rows: numeral, title, summary, minutes, arrow. */
export function GuideRows({ guides = METHOD }) {
  const { t, locale } = useI18n();
  return (
    <ol style={{ borderTop: `1px solid ${COLORS.ink}` }}>
      {guides.map((g, i) => (
        <li key={g.slug} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
          <Link to={localePath(locale, `/library/${g.slug}`)}
            className="group grid grid-cols-[3rem_minmax(0,1fr)_auto] sm:grid-cols-[4rem_minmax(0,1fr)_7rem_auto] gap-x-4 items-baseline py-5 hover:bg-[color:var(--c-sand)]">
            <span aria-hidden="true" dir="ltr" className={`${TYPE.numeral} text-3xl ps-1`} style={{ color: COLORS.brass }}>{ROMAN[i] ?? i + 1}</span>
            <span>
              <span className="block text-xl font-medium tracking-[-0.02em] rtl:tracking-normal group-hover:underline underline-offset-4">{g[locale].title}</span>
              <span className="block mt-1 font-serif leading-relaxed" style={{ color: COLORS.inkSoft }}>{g[locale].summary}</span>
            </span>
            <span className="hidden sm:block font-mono text-xs" style={{ color: COLORS.dim }}>{t("site.guides.minutes", { count: readingMinutes(g[locale]) })}</span>
            <span className="self-center pe-1" style={{ color: COLORS.forest }}><IconArrow size={24} /></span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

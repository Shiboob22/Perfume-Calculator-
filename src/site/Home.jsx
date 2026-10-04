import React from "react";
import { Link } from "react-router-dom";
import { COLORS, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { localePath } from "./meta";
import PlanCards from "./PlanCards";
import LiveBench from "./LiveBench";
import MethodSequence from "./MethodSequence";
import { ChapterMark, Folio, Rule } from "./editorial";

function SectionTitle({ children }) {
  return <h2 className={`${TYPE.title} mb-4`} style={{ color: COLORS.forestDeep }}>{children}</h2>;
}

export default function Home() {
  const { t, locale } = useI18n();
  const to = (p) => localePath(locale, p);
  const benefits = t.raw("site.home.benefits") || [];
  const faq = t.raw("site.home.faq") || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8">
      {/* Hero */}
      <section className="grid grid-cols-1 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-10 md:gap-14 items-center pt-10 pb-16">
        <div>
          <ChapterMark volume="III" label={t("site.guides.books.Formulation")} className="mb-6" />
          <h1 className={TYPE.display} style={{ color: COLORS.forestDeep }}>{t("site.home.title")}</h1>
          <p className={`mt-6 measure ${TYPE.lead}`} style={{ color: COLORS.inkSoft }}>{t("site.home.lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/app/calculator?ref=home" className="px-5 py-3 rounded-xl font-semibold" style={{ background: `linear-gradient(180deg,${COLORS.amber},${COLORS.amberDeep})`, color: COLORS.onAmber }}>
              {t("site.home.ctaApp")}
            </a>
            <Link to={to("/guides")} className="px-5 py-3 rounded-xl font-semibold" style={{ border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber }}>
              {t("site.home.ctaGuides")}
            </Link>
          </div>
        </div>

        <LiveBench />
      </section>

      {/* Quote */}
      <Rule ornament />
      <blockquote className="reveal py-6 text-center">
        <p className="font-serif italic text-[clamp(1.75rem,4vw,2.75rem)] max-w-3xl mx-auto leading-snug" style={{ color: COLORS.forestDeep }}>“{t("site.home.quote")}”</p>
        <footer className={`mt-5 ${TYPE.runningHead}`} style={{ color: COLORS.amberDeep }}>{t("site.home.quoteSource")}</footer>
      </blockquote>
      <Rule ornament />

      {/* Benefits */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-10 py-12">
        {benefits.map((b, i) => (
          <div key={b.title} className="reveal">
            <span aria-hidden="true" dir="ltr" className={`${TYPE.numeral} block text-5xl mb-3`} style={{ color: COLORS.amberDeep }}>{["i", "ii", "iii"][i] ?? i + 1}</span>
            <h2 className="font-serif text-2xl mb-2" style={{ color: COLORS.forestDeep }}>{b.title}</h2>
            <p className="leading-relaxed" style={{ color: COLORS.inkSoft }}>{b.text}</p>
          </div>
        ))}
      </section>

      {/* Guides teaser */}
      <section className="reveal py-12" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <p className={`${TYPE.runningHead} mb-3`} style={{ color: COLORS.amberDeep }}>{t("site.home.contents")}</p>
        <SectionTitle>{t("site.home.guidesTitle")}</SectionTitle>
        <p className="mb-8" style={{ color: COLORS.inkSoft }}>{t("site.home.guidesLead")}</p>
        <MethodSequence />
        <Link to={to("/guides")} className="inline-block mt-10 text-sm underline underline-offset-4" style={{ color: COLORS.amber }}>
          {t("site.home.allGuides")}
        </Link>
      </section>

      {/* Pricing summary */}
      <section className="reveal py-12" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <SectionTitle>{t("site.home.pricingTitle")}</SectionTitle>
        <p className="mb-8" style={{ color: COLORS.inkSoft }}>{t("site.home.pricingLead")}</p>
        <PlanCards compact />
        <Link to={to("/pricing")} className="inline-block mt-6 text-sm underline underline-offset-4" style={{ color: COLORS.amber }}>
          {t("site.home.seePricing")}
        </Link>
      </section>

      {/* FAQ */}
      <section className="py-12" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <SectionTitle>{t("site.home.faqTitle")}</SectionTitle>
        <div className="divide-y" style={{ borderColor: COLORS.line }}>
          {faq.map((item) => (
            <details key={item.q} className="py-4 group" style={{ borderColor: COLORS.line }}>
              <summary className="cursor-pointer font-serif text-xl" style={{ color: COLORS.forestDeep }}>{item.q}</summary>
              <p className="mt-3 leading-relaxed" style={{ color: COLORS.inkSoft }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      <Folio><span>{t("brand")}</span><span>{t("site.guides.by")}</span></Folio>
    </div>
  );
}

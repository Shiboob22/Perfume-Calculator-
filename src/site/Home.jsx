import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { GUIDES } from "../content/guides";
import { localePath } from "./meta";
import PlanCards from "./PlanCards";

// Vol. III Formulation, §02 worked example: 100 ml at 25%.
const EXAMPLE = { oil: "23.75", alcohol: "60.75", total: "84.50" };

function SectionTitle({ children }) {
  return <h2 className="font-serif italic text-3xl sm:text-4xl mb-4" style={{ color: COLORS.forestDeep }}>{children}</h2>;
}

export default function Home() {
  const { t, locale } = useI18n();
  const to = (p) => localePath(locale, p);
  const benefits = t.raw("site.home.benefits") || [];
  const faq = t.raw("site.home.faq") || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8">
      {/* Hero */}
      <section className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-10 items-center pt-10 pb-16">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] mb-4" style={{ color: COLORS.amberDeep }}>{t("site.home.eyebrow")}</p>
          <h1 className="font-serif italic text-5xl sm:text-6xl leading-[1.02]" style={{ color: COLORS.forestDeep }}>{t("site.home.title")}</h1>
          <p className="mt-5 text-lg leading-relaxed" style={{ color: COLORS.inkSoft }}>{t("site.home.lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/app/calculator" className="px-5 py-3 rounded-xl font-semibold" style={{ background: `linear-gradient(180deg,${COLORS.amber},${COLORS.amberDeep})`, color: COLORS.onAmber }}>
              {t("site.home.ctaApp")}
            </a>
            <Link to={to("/guides")} className="px-5 py-3 rounded-xl font-semibold" style={{ border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber }}>
              {t("site.home.ctaGuides")}
            </Link>
          </div>
        </div>

        <figure className="rounded-2xl p-6" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
          <figcaption className="font-mono text-xs uppercase tracking-wider mb-4" style={{ color: COLORS.amberDeep }}>{t("site.home.exampleLabel")}</figcaption>
          {[["exampleOil", EXAMPLE.oil], ["exampleAlcohol", EXAMPLE.alcohol], ["exampleTotal", EXAMPLE.total]].map(([key, grams], i) => (
            <div key={key} className="flex justify-between items-baseline py-3"
              style={{ borderTop: i === 2 ? `1px solid ${COLORS.inkSoft}` : "none", borderBottom: i < 1 ? `1px solid ${COLORS.line}` : "none" }}>
              <span style={{ color: COLORS.ink }}>{t(`site.home.${key}`)}</span>
              <span dir="ltr" className="font-mono text-2xl" style={{ color: i === 2 ? COLORS.forestDeep : COLORS.ink }}>{grams} g</span>
            </div>
          ))}
          <p className="mt-4 text-xs leading-relaxed" style={{ color: COLORS.inkSoft }}>{t("site.home.exampleNote")}</p>
        </figure>
      </section>

      {/* Quote */}
      <blockquote className="py-12 text-center" style={{ borderTop: `1px solid ${COLORS.line}`, borderBottom: `1px solid ${COLORS.line}` }}>
        <p className="font-serif italic text-2xl sm:text-3xl max-w-3xl mx-auto leading-snug" style={{ color: COLORS.forestDeep }}>“{t("site.home.quote")}”</p>
        <footer className="mt-4 font-mono text-xs uppercase tracking-wider" style={{ color: COLORS.amberDeep }}>{t("site.home.quoteSource")}</footer>
      </blockquote>

      {/* Benefits */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 py-16">
        {benefits.map((b) => (
          <div key={b.title}>
            <h3 className="font-serif text-2xl mb-2" style={{ color: COLORS.forestDeep }}>{b.title}</h3>
            <p className="leading-relaxed" style={{ color: COLORS.inkSoft }}>{b.text}</p>
          </div>
        ))}
      </section>

      {/* Guides teaser */}
      <section className="py-12" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <SectionTitle>{t("site.home.guidesTitle")}</SectionTitle>
        <p className="mb-8" style={{ color: COLORS.inkSoft }}>{t("site.home.guidesLead")}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GUIDES.map((g) => (
            <Link key={g.slug} to={to(`/guides/${g.slug}`)} className="block rounded-xl p-5 transition-transform hover:-translate-y-0.5"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
              <span className="block font-serif text-xl mb-2" style={{ color: COLORS.forestDeep }}>{g[locale].title}</span>
              <span className="block text-sm leading-relaxed" style={{ color: COLORS.inkSoft }}>{g[locale].summary}</span>
            </Link>
          ))}
        </div>
        <Link to={to("/guides")} className="inline-block mt-6 font-mono text-xs uppercase tracking-wider hover:underline" style={{ color: COLORS.amber }}>
          {t("site.home.allGuides")}
        </Link>
      </section>

      {/* Pricing summary */}
      <section className="py-12" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <SectionTitle>{t("site.home.pricingTitle")}</SectionTitle>
        <p className="mb-8" style={{ color: COLORS.inkSoft }}>{t("site.home.pricingLead")}</p>
        <PlanCards compact />
        <Link to={to("/pricing")} className="inline-block mt-6 font-mono text-xs uppercase tracking-wider hover:underline" style={{ color: COLORS.amber }}>
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
    </div>
  );
}

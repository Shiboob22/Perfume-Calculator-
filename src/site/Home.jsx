import React from "react";
import { Link, Reveal } from "../motion";
import { COLORS, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { localePath } from "./meta";
import LiveBench from "./LiveBench";
import SmokeField from "../components/kx/SmokeField";
import { GuideRows } from "./GuideRows";
import { Folio } from "./editorial";
import Compounding from "@compounding-scene";
import { useCompounding } from "./compounding/useCompounding";
import { IconArrow, IconBook, IconFlacon, IconPlus, IconScaleDrop, IconSeal, IconSteps, IconTile } from "../components/icons";

const PRINCIPLE_ICONS = [IconScaleDrop, IconSteps, IconFlacon];
const WRAP = "max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14";

function SectionTitle({ children }) {
  return <h2 className={`${TYPE.title} mb-4`}>{children}</h2>;
}

export default function Home() {
  const { t, locale } = useI18n();
  const to = (p) => localePath(locale, p);
  const hero = t.raw("site.home.hero") || [];
  const benefits = t.raw("site.home.benefits") || [];
  const faq = t.raw("site.home.faq") || [];
  const compounding = useCompounding();

  return (
    <div>
      {/* Hero: the scroll scene when its flag is on, else the bench hero */}
      {compounding ? <Compounding /> : (
      <div className="relative overflow-hidden">
      <SmokeField className="absolute inset-0 w-full h-full" />
      <section className={`${WRAP} relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center pt-12 pb-20`}>
        <div>
          <p className={`${TYPE.label} mb-6`} style={{ color: COLORS.dim }}>{t("site.home.eyebrow")}</p>
          <h1 className={TYPE.display}>
            {hero.map((line, i) => (
              <span key={line} className={`block ${i === hero.length - 1 ? "font-serif italic font-normal tracking-[-0.02em] rtl:tracking-normal" : ""}`}
                style={i === hero.length - 1 ? { color: COLORS.forest } : undefined}>{line}</span>
            ))}
          </h1>
          <p className={`mt-7 measure ${TYPE.lead}`} style={{ color: COLORS.inkSoft }}>{t("site.home.lead")}</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3">
            <a href="/bench?ref=home" className="inline-flex items-center gap-2 px-6 min-h-[52px] font-medium"
              style={{ background: COLORS.amber, color: COLORS.onAmber }}>
              {t("site.home.ctaApp")} <IconArrow size={18} />
            </a>
            <Link to={to("/library")} className="inline-flex items-center gap-2 min-h-[44px] underline underline-offset-4" style={{ color: COLORS.ink }}>
              <IconBook size={18} /> {t("site.home.ctaGuides")}
            </Link>
          </div>
        </div>
        <LiveBench />
      </section>
      </div>
      )}

      {/* Three principles */}
      <Reveal as="section" className="reveal" style={{ borderBlock: `1px solid ${COLORS.line}`, background: COLORS.card }}>
        <div className={`${WRAP} py-14`}>
          <h2 className={`${TYPE.label} mb-8`} style={{ color: COLORS.dim }}>{t("site.home.principlesLabel")}</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {benefits.map((b, i) => {
              const I = PRINCIPLE_ICONS[i] ?? IconFlacon;
              return (
                <li key={b.title} className="kv grid gap-4 content-start">
                  <div className="flex items-center gap-4">
                    <IconTile icon={I} size={60} />
                    <span aria-hidden="true" dir="ltr" className={`${TYPE.numeral} text-4xl`} style={{ color: COLORS.brass }}>{["I", "II", "III"][i] ?? i + 1}</span>
                  </div>
                  <h3 className="text-xl font-medium tracking-[-0.02em] rtl:tracking-normal">{b.title}</h3>
                  <p className="font-serif leading-relaxed" style={{ color: COLORS.inkSoft }}>{b.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </Reveal>

      {/* Quote */}
      <Reveal as="blockquote" className={`${WRAP} reveal py-16 text-center`}>
        <p className="font-serif italic text-[clamp(1.6rem,3.6vw,2.5rem)] max-w-3xl mx-auto leading-snug">“{t("site.home.quote")}”</p>
        <footer className={`kv-fade mt-5 ${TYPE.label}`} style={{ color: COLORS.dim }}>{t("site.home.quoteSource")}</footer>
      </Reveal>

      {/* Guide library */}
      <Reveal as="section" className={`${WRAP} reveal py-14`} style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <p className={`${TYPE.label} mb-3`} style={{ color: COLORS.dim }}>{t("site.home.contents")}</p>
        <SectionTitle>{t("site.home.guidesTitle")}</SectionTitle>
        <p className="font-serif mb-8" style={{ color: COLORS.inkSoft }}>{t("site.home.guidesLead")}</p>
        <GuideRows />
        <Link to={to("/library")} className="inline-flex items-center gap-2 mt-8 text-sm font-medium min-h-[44px]" style={{ color: COLORS.forest }}>
          {t("site.home.allGuides")} <IconArrow size={18} />
        </Link>
      </Reveal>

      {/* Pricing teaser band */}
      <Reveal as="section" className="reveal" style={{ background: COLORS.sand, borderBlock: `1px solid ${COLORS.line}` }}>
        <div className={`${WRAP} py-10 flex flex-wrap items-center gap-6`}>
          <IconTile icon={IconSeal} size={56} />
          <div className="flex-1 min-w-[14rem]">
            <h2 className="text-2xl font-medium tracking-[-0.02em] rtl:tracking-normal">{t("site.home.pricingBand")}</h2>
            <p className="font-serif mt-1" style={{ color: COLORS.inkSoft }}>{t("site.home.pricingLead")}</p>
          </div>
          <Link to={to("/pricing")} className="inline-flex items-center gap-2 px-5 min-h-[48px] font-medium" style={{ border: `1px solid ${COLORS.ink}` }}>
            {t("site.home.comparePlans")} <IconArrow size={18} />
          </Link>
        </div>
      </Reveal>

      {/* FAQ */}
      <section className={`${WRAP} py-14`}>
        <SectionTitle>{t("site.home.faqTitle")}</SectionTitle>
        <div aria-hidden="true" className="kv-grow mb-6 h-px" style={{ background: COLORS.brass }} />
        <div style={{ borderTop: `1px solid ${COLORS.ink}` }}>
          {faq.map((item) => (
            <details key={item.q} className="kv group" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 py-4 min-h-[56px] text-lg font-medium">
                {item.q}
                <span className="inline-flex items-center justify-center w-9 h-9 shrink-0 group-open:rotate-45 fill-anim" style={{ border: `1px solid ${COLORS.ink}` }}>
                  <IconPlus size={18} />
                </span>
              </summary>
              <p className="font-serif pb-5 leading-relaxed measure" style={{ color: COLORS.inkSoft }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      <div className={WRAP}><Folio><span>{t("brand")}</span><span>{t("site.guides.by")}</span></Folio></div>
    </div>
  );
}

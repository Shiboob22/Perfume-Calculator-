import React from "react";
import { Link } from "react-router-dom";
import { COLORS, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { localePath } from "./meta";
import LiveBench from "./LiveBench";
import SmokeField from "../components/kx/SmokeField";
import { Folio } from "./editorial";
import { Rooms, Method, ProSection } from "./HomeSections";
import Compounding from "@compounding-scene";
import { useCompounding } from "./compounding/useCompounding";
import { IconArrow, IconBook, IconPlus } from "../components/icons";

const WRAP = "max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14";

function SectionTitle({ children }) {
  return <h2 className={`${TYPE.title} mb-4`}>{children}</h2>;
}

export default function Home() {
  const { t, locale } = useI18n();
  const to = (p) => localePath(locale, p);
  const hero = t.raw("site.home.hero") || [];
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

      <Rooms />
      <Method />
      <ProSection />

      {/* FAQ */}
      <section className="px-4 sm:px-6 lg:px-12 pt-[clamp(72px,8vw,128px)]">
        <SectionTitle>{t("site.home.faqTitle")}</SectionTitle>
        <div style={{ borderTop: `1px solid ${COLORS.line}` }}>
          {faq.map((item) => (
            <details key={item.q} className="group" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
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

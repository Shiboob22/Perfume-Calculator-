import React from "react";
import { COLORS, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import PlanCards from "./PlanCards";
import { Folio, Rule } from "./editorial";

export default function Pricing() {
  const { t, locale } = useI18n();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-10">
      <p className={`${TYPE.runningHead} mb-4`} style={{ color: COLORS.amberDeep }}>{t("site.nav.pricing")}</p>
      <h1 className={`${TYPE.display} mb-5`} style={{ color: COLORS.forestDeep }}>{t("site.pricing.title")}</h1>
      <p className={`measure mb-10 ${TYPE.lead}`} style={{ color: COLORS.inkSoft }}>{t("site.pricing.lead")}</p>
      <PlanCards />
      <Rule ornament />
      <div className="reveal text-center">
        <h2 className={`${TYPE.title} mb-3`} style={{ color: COLORS.forestDeep }}>{t("site.pricing.waitlistTitle")}</h2>
        <p className="measure mx-auto mb-6" style={{ color: COLORS.inkSoft }}>{t("site.pricing.waitlistLead")}</p>
        {/* A plain link: the public site never loads the auth client. The app
            asks the visitor to sign in, then opens the waitlist section. */}
        <a href="/app/account#pro" hrefLang={locale} className="inline-block px-5 py-2 rounded-lg text-sm font-semibold"
          style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {t("site.pricing.waitlistCta")}
        </a>
      </div>
      <Folio><span>{t("brand")}</span><span>{t("site.guides.by")}</span></Folio>
    </div>
  );
}

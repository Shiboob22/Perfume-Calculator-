import React from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import PlanCards from "./PlanCards";

export default function Pricing() {
  const { t, locale } = useI18n();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-10">
      <h1 className="font-serif italic text-5xl mb-4" style={{ color: COLORS.forestDeep }}>{t("site.pricing.title")}</h1>
      <p className="mb-10 text-lg" style={{ color: COLORS.inkSoft }}>{t("site.pricing.lead")}</p>
      <PlanCards />
      <div className="mt-8 p-6 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
        <h2 className="font-serif text-2xl mb-2" style={{ color: COLORS.forestDeep }}>{t("site.pricing.waitlistTitle")}</h2>
        <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>{t("site.pricing.waitlistLead")}</p>
        {/* A plain link: the public site never loads the auth client. The app
            asks the visitor to sign in, then opens the waitlist section. */}
        <a href="/app/account#pro" hrefLang={locale} className="inline-block px-5 py-2 rounded-lg text-sm font-semibold"
          style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {t("site.pricing.waitlistCta")}
        </a>
      </div>
    </div>
  );
}

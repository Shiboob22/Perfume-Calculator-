import React from "react";
import { COLORS, TYPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import PlanCards from "./PlanCards";
import { Folio } from "./editorial";
import { Film, useImagery } from "./Imagery";

export default function Pricing() {
  const { t } = useI18n();
  const imagery = useImagery();
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14 pt-12">
      <p className={`${TYPE.label} mb-5`} style={{ color: COLORS.dim }}>{t("site.nav.pricing")}</p>
      <h1 className={`${TYPE.display} mb-6`}>
        <span className="block">{t("site.pricing.title")}</span>
        <span className="block font-serif italic font-normal tracking-[-0.02em] rtl:tracking-normal" style={{ color: COLORS.forest }}>{t("site.pricing.titleEm")}</span>
      </h1>
      <p className={`measure mb-12 ${TYPE.lead}`} style={{ color: COLORS.inkSoft }}>{t("site.pricing.lead")}</p>
      <PlanCards />
      {imagery && <Film name="atomiser" ratio="21 / 9" className="mt-16" />}
      <Folio><span>{t("brand")}</span><span>{t("site.guides.by")}</span></Folio>
    </div>
  );
}

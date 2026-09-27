import React from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import PlanCards from "./PlanCards";

export default function Pricing() {
  const { t } = useI18n();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-10">
      <h1 className="font-serif italic text-5xl mb-4" style={{ color: COLORS.forestDeep }}>{t("site.pricing.title")}</h1>
      <p className="mb-10 text-lg" style={{ color: COLORS.inkSoft }}>{t("site.pricing.lead")}</p>
      <PlanCards />
    </div>
  );
}

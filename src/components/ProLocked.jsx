import React from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import WaitlistButton from "./WaitlistButton";

// Shown in place of a feature the user's plan doesn't include.
export default function ProLocked({ feature }) {
  const { t } = useI18n();
  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8">
      <div className="p-6 border rounded" style={{ borderColor: COLORS.amberDeep, backgroundColor: COLORS.card }}>
        <p className="text-[11px] font-mono uppercase tracking-wider rtl:tracking-normal mb-2" style={{ color: COLORS.amberDeep }}>
          {t("plan.pro")}
        </p>
        <h2 className="text-lg font-serif font-semibold mb-2" style={{ color: COLORS.forestDeep }}>
          {t(`plan.locked.${feature}`)}
        </h2>
        <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("plan.earlyAccess")}</p>
        <WaitlistButton source={`locked.${feature}`.replace(/[^a-z0-9_.-]/gi, "-").toLowerCase().slice(0, 40)} />
      </div>
    </div>
  );
}

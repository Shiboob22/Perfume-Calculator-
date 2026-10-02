import React from "react";
import { COLORS, SHAPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";

// Vol. III Formulation, §02 worked example: 100 ml at 25%. Shared by the
// landing hero and the sign-in screen so the two stay in sync.
const EXAMPLE = { oil: "23.75", alcohol: "60.75", total: "84.50" };

export default function WorkedExample({ className = "" }) {
  const { t } = useI18n();
  return (
    <figure className={`p-6 ${SHAPE.panel} ${className}`} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
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
  );
}

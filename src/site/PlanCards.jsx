import React, { useEffect, useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import BUILT_PLANS from "./plans.json";

// Free and Pro side by side, from the `plans` table: the build writes it to
// plans.json (so the page prerenders), and the browser refreshes it after
// load so a plan changed in the database shows without a redeploy.
function useLivePlans() {
  const [plans, setPlans] = useState(BUILT_PLANS);
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    // Only a real project (CI builds with a placeholder URL), as in
    // scripts/fetch-plans.mjs.
    if (!url || !key || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) return;
    let cancelled = false;
    fetch(`${url}/rest/v1/plans?select=id,name,features,batch_cap,sort&order=sort`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => { if (!cancelled && Array.isArray(rows) && rows.length) setPlans(rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return plans;
}

export default function PlanCards({ compact = false }) {
  const { t } = useI18n();
  const plans = useLivePlans();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {plans.map((plan) => {
        const isFree = plan.id === "free";
        return (
          <div key={plan.id} className="rounded-2xl p-6 flex flex-col"
            style={{ background: COLORS.card, border: `1px solid ${isFree ? COLORS.line : COLORS.amberDeep}` }}>
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h3 className="font-serif text-3xl" style={{ color: COLORS.forestDeep }}>{t(`plan.names.${plan.id}`)}</h3>
              <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: isFree ? COLORS.amber : COLORS.inkSoft }}>
                {isFree ? t("site.pricing.current") : t("site.pricing.notOnSale")}
              </span>
            </div>
            <ul className="space-y-2 text-sm" style={{ color: COLORS.ink }}>
              <li>· {t("site.pricing.core")}</li>
              <li>· {plan.batch_cap == null ? t("site.pricing.unlimited") : t("site.pricing.cap", { cap: plan.batch_cap })}</li>
              {!compact && plan.features.filter((f) => f !== "batches.unlimited").map((f) => (
                <li key={f}>· {t(`site.pricing.features.${f}`)}</li>
              ))}
              {compact && plan.features.filter((f) => f !== "batches.unlimited").length > 0 && (
                <li style={{ color: COLORS.inkSoft }}>
                  · {plan.features.filter((f) => f !== "batches.unlimited").map((f) => t(`site.pricing.features.${f}`)).join(" · ")}
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

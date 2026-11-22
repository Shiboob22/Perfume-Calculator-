import React, { useEffect, useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import BUILT_PLANS from "./plans.json";
import { COMPARE_ROWS, PRICES, activeOffer, compareCell, offerText, priceCurrency, priceText, yearlySavingPct } from "../lib/plansConfig";
import { IconArrow, IconBalance, IconCheck, IconNotebook, IconTile } from "../components/icons";

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
    fetch(`${url}/rest/v1/plans?select=id,name,features,batch_cap,ingredient_cap,journal_window,sort&order=sort`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => { if (!cancelled && Array.isArray(rows) && rows.length) setPlans(rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return plans;
}


/** Free (card) beside Pro (ink), then what each plan includes, row by row. */
export default function PlanCards() {
  const { t, locale } = useI18n();
  const plans = useLivePlans();
  const free = plans.find((p) => p.id === "free");
  const pro = plans.find((p) => p.id === "pro");
  const cur = priceCurrency({ locale });
  const offer = activeOffer(cur);
  const label = "text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal";
  // Free's limits from the plans table (the same numbers the app enforces).
  const freeLimits = { batches: free?.batch_cap ?? 25, ingredients: free?.ingredient_cap ?? 3, journal: free?.journal_window ?? 3 };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ border: `1px solid ${COLORS.ink}` }}>
        {free && (
          <section className="p-7 flex flex-col gap-5" style={{ background: COLORS.card }}>
            <div className="flex items-center justify-between gap-3">
              <IconTile icon={IconBalance} size={52} />
              <span className={label} style={{ color: COLORS.forest }}>{t("site.pricing.current")}</span>
            </div>
            <h2 className="text-3xl font-medium tracking-[-0.03em] rtl:tracking-normal">{t("plan.names.free")}</h2>
            <p dir="ltr" className="font-mono text-6xl tracking-[-0.04em] text-start rtl:text-end">0</p>
            <p className="font-serif" style={{ color: COLORS.inkSoft }}>{t("site.pricing.core")}</p>
            <a href="/bench?ref=pricing" className="mo-press mt-auto inline-flex items-center justify-center gap-2 min-h-[52px] font-medium" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
              {t("site.home.ctaApp")} <IconArrow size={18} />
            </a>
          </section>
        )}
        {pro && (
          <section className="p-7 flex flex-col gap-5" style={{ background: COLORS.inkBand, color: COLORS.onInk }}>
            <div className="flex items-center justify-between gap-3">
              <IconTile icon={IconNotebook} size={52} border={COLORS.onInk} background="transparent" style={{ color: COLORS.onInk }} />
              <span className={`${label} px-2 py-1`} style={{ background: COLORS.oil, color: "#100E0A" }}>{t("site.pricing.notOnSale")}</span>
            </div>
            <h2 className="text-3xl font-medium tracking-[-0.03em] rtl:tracking-normal">{t("plan.names.pro")}</h2>
            <div data-pro-price>
              <p className="text-lg">{t("site.pricing.proPrice", { monthly: priceText(PRICES[cur].monthly, locale, cur), yearly: priceText(PRICES[cur].yearly, locale, cur), pct: yearlySavingPct(cur) })}</p>
              {offer && <p className="mt-2 text-sm font-medium" style={{ color: COLORS.oil }} data-offer={offer.id}>{offerText(offer, t, locale, cur)}</p>}
              <p className="mt-2 text-sm" style={{ opacity: 0.85 }}>{t("site.pricing.payback")}</p>
            </div>
            {/* One offer wherever Pro is offered (audit H8): the trial first, the waitlist after. */}
            <p className="font-serif" style={{ opacity: 0.85 }}>{t("plan.trial.terms")}</p>
            <p className="text-sm" style={{ opacity: 0.85 }}>{t("site.pricing.waitlistLead")}</p>
            {/* A plain link: the public site never loads the auth client. The app
                asks the visitor to sign in, then opens Account's Pro section (trial and waitlist). */}
            <a href="/app/account#pro" hrefLang={locale} data-trial-link className="mo-press mt-auto inline-flex items-center justify-center gap-2 min-h-[52px] font-medium"
              style={{ background: COLORS.amber, color: COLORS.onAmber }}>
              {t("plan.trial.start")} <IconArrow size={18} />
            </a>
          </section>
        )}
      </div>

      <table className="mt-14 w-full text-sm">
        <caption className={`${label} text-start mb-3`} style={{ color: COLORS.dim }}>{t("site.pricing.tableTitle")}</caption>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLORS.ink}` }}>
            <th scope="col" className="text-start py-3"><span className="sr-only">{t("site.pricing.tableTitle")}</span></th>
            {plans.map((p) => <th key={p.id} scope="col" className="py-3 w-28 text-center font-medium">{t(`plan.names.${p.id}`)}</th>)}
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((r) => (
            <tr key={r.key} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <th scope="row" className="text-start font-normal py-3 pe-4">{t(`upgrade.rows.${r.key}`)}</th>
              {plans.map((p) => {
                const v = r[p.id];
                return (
                  <td key={p.id} className="py-3 text-center">
                    {v === "yes" ? <span className="inline-flex" style={{ color: COLORS.forest }}><IconCheck size={18} title={t("site.pricing.included")} /></span>
                      : v === "no" ? <span style={{ color: COLORS.dim }}>—<span className="sr-only">{t("site.pricing.notIncluded")}</span></span>
                        : <span className="text-xs" style={{ color: COLORS.inkSoft }}>{compareCell(v, t, freeLimits)}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

import React, { createContext, useCallback, useContext, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { COLORS } from "../../lib/theme";
import { useEntitlements } from "../../lib/useEntitlements";
import { limit } from "../../lib/entitlements";
import { COMPARE_ROWS, PRICES, priceText, yearlyPerMonth } from "../../lib/plansConfig";
import { startTrial } from "../../lib/benchApi";
import Sheet from "../kx/Sheet";

// The upgrade sheet (Bench SaaS): Free vs Pro, monthly or yearly, and the
// 14-day trial. Any screen opens it with useUpgrade().open(reason), where
// reason ("blend" | "cost" | "reminders" | null) picks the
// headline (`state` is what is open, for the Bench tour to put back). No payment is taken: the trial is the only way in for now.
const UpgradeContext = createContext({ open: () => {}, close: () => {}, state: { open: false, reason: null } });

export const useUpgrade = () => useContext(UpgradeContext);

export function UpgradeProvider({ children }) {
  const [state, setState] = useState({ open: false, reason: null });
  const open = useCallback((reason = null) => setState({ open: true, reason }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return (
    <UpgradeContext.Provider value={{ open, close, state }}>
      {children}
      <UpgradeSheet open={state.open} reason={state.reason} onClose={close} />
    </UpgradeContext.Provider>
  );
}

export const isPro = (entitlements) => entitlements?.plan === "pro";

/** "Free · Upgrade" or "Pro", in the header; opens the sheet. */
export function PlanBadge() {
  const { t } = useI18n();
  const entitlements = useEntitlements();
  const { open } = useUpgrade();
  if (!entitlements.loaded || entitlements.failed) return null;
  const pro = isPro(entitlements);
  return (
    <button type="button" onClick={() => open(null)} data-plan={pro ? "pro" : "free"}
      className="inline-flex items-center min-h-[36px] px-3 text-[13px] font-medium rounded"
      style={pro
        ? { border: `1px solid ${COLORS.amber}`, color: COLORS.actionText, background: "transparent" }
        : { border: `1px solid ${COLORS.amber}`, color: COLORS.onAmber, background: COLORS.amber }}>
      {t(pro ? "upgrade.badgePro" : "upgrade.badgeFree")}
    </button>
  );
}

const HEADLINES = { blend: "upgrade.why.blend", cost: "upgrade.why.cost", reminders: "upgrade.why.reminders" };

/**
 * Starts the 14-day Pro trial and refreshes the plan. `start()` resolves to
 * true once Pro is on; `message` says why not (used, already Pro, failed).
 * Shared by the upgrade sheet and the Journal's locked card.
 */
export function useStartTrial() {
  const { t } = useI18n();
  const entitlements = useEntitlements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function start() {
    setBusy(true); setMessage("");
    try {
      await startTrial();
      await entitlements.refresh();
      setMessage(t("plan.trial.startedNow"));
      return true;
    } catch (e) {
      setMessage(e.code === "trial_used" ? t("plan.trial.used") : e.code === "already_pro" ? t("plan.trial.alreadyPro") : t("upgrade.trialFailed"));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { start, busy, message };
}

function UpgradeSheet({ open, reason, onClose }) {
  const { t, locale } = useI18n();
  const entitlements = useEntitlements();
  const [billing, setBilling] = useState("yearly");
  const pro = isPro(entitlements);
  const yearly = billing === "yearly";

  // Free's limits are Free's (limit() with no plan), whatever plan the viewer is on.
  const freeLimits = { n: limit(undefined, "journalBatches") };
  const cell = (v) => (v && typeof v === "object" ? String(limit(undefined, v.limit)) : t(`upgrade.cells.${v}`, freeLimits));

  const { start, busy, message } = useStartTrial();
  const trial = () => start().then((ok) => ok && onClose());

  const headline = reason && HEADLINES[reason] ? t(HEADLINES[reason]) : t("upgrade.lead");
  const yearlyText = t("upgrade.billedYearly", { price: priceText(yearlyPerMonth(), locale) });
  const toggle = (on) => ({
    background: on ? COLORS.ink : "transparent", color: on ? COLORS.paper : COLORS.ink,
  });

  return (
    <Sheet open={open} onClose={onClose} title={t("upgrade.title")} closeLabel={t("upgrade.close")} wide tourKey="upgrade">
      <div className="flex flex-col gap-5">
        <div>
          <p className="font-serif text-[28px] leading-tight" style={{ textWrap: "balance" }}>{headline}</p>
          {headline !== t("upgrade.lead") && <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft }}>{t("upgrade.lead")}</p>}
        </div>
        <div role="group" aria-label={t("upgrade.billing")} className="self-start inline-flex rounded" style={{ border: `1px solid ${COLORS.ink}` }}>
          <button type="button" aria-pressed={!yearly} onClick={() => setBilling("monthly")} className="min-h-[44px] px-4 text-sm" style={toggle(!yearly)}>{t("upgrade.monthly")}</button>
          <button type="button" aria-pressed={yearly} onClick={() => setBilling("yearly")} className="min-h-[44px] px-4 text-sm" style={toggle(yearly)}>{t("upgrade.yearly")} · {t("upgrade.saveYear")}</button>
        </div>

        <table className="w-full text-sm border-collapse" style={{ border: `1px solid ${COLORS.ink}` }}>
          <caption className="sr-only">{t("upgrade.compare")}</caption>
          <thead>
            <tr>
              <th scope="col" className="p-3 text-start align-bottom text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal font-normal" style={{ color: COLORS.dim }}>{t("upgrade.feature")}</th>
              <th scope="col" className="p-3 text-start align-top font-normal" style={{ borderInlineStart: `1px solid ${COLORS.line}` }}>
                <span className="block text-[13px] font-semibold">{t("plan.names.free")}</span>
                <span dir="ltr" className="block mt-1 text-[26px] leading-none tabular-nums text-start">{priceText(0, locale)}</span>
              </th>
              <th scope="col" className="p-3 text-start align-top font-normal" style={{ background: COLORS.sand, borderInlineStart: `2px solid ${COLORS.amber}` }}>
                <span className="block text-[13px] font-semibold" style={{ color: COLORS.actionText }}>{t("plan.names.pro")}</span>
                <span className="mt-1 flex flex-wrap items-baseline gap-1">
                  <span dir="ltr" className="text-[26px] leading-none tabular-nums">{priceText(yearly ? PRICES.yearly : PRICES.monthly, locale)}</span>
                  <span className="text-xs" style={{ color: COLORS.dim }}>{t(yearly ? "upgrade.perYear" : "upgrade.perMonth")}</span>
                </span>
                {yearly && <span className="block mt-1 text-[11px]" style={{ color: COLORS.dim }}>{yearlyText}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => {
              const free = cell(row.free);
              return (
                <tr key={row.key} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <th scope="row" className="px-3 py-2.5 text-start font-normal">{t(`upgrade.rows.${row.key}`)}</th>
                  <td className="px-3 py-2.5" style={{ borderInlineStart: `1px solid ${COLORS.line}`, color: row.free === "no" ? COLORS.dim : COLORS.ink }}>{free}</td>
                  <td className="px-3 py-2.5 font-medium" style={{ background: COLORS.sand, borderInlineStart: `2px solid ${COLORS.amber}` }}>{cell(row.pro)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={trial} disabled={pro || busy || entitlements.trial?.used}
            className="min-h-[52px] px-6 text-base font-medium rounded disabled:opacity-60"
            style={{ background: pro ? "transparent" : COLORS.amber, color: pro ? COLORS.ink : COLORS.onAmber, border: `1px solid ${pro ? COLORS.ink : COLORS.amber}` }}>
            {pro ? t("upgrade.current") : entitlements.trial?.used ? t("plan.trial.used") : busy ? t("upgrade.starting") : t("plan.trial.start")}
          </button>
          <p role="status" className="text-sm text-center empty:hidden" style={{ color: COLORS.inkSoft }}>{message}</p>
          <p className="text-xs text-center" style={{ color: COLORS.dim }}>{t("upgrade.fine")}</p>
        </div>
      </div>
    </Sheet>
  );
}

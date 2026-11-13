import React, { useEffect, useState } from "react";
import { Link } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { useProfile } from "../../lib/useProfile";
import { useEntitlements } from "../../lib/useEntitlements";
import { can } from "../../lib/entitlements";
import { flagOn } from "../../lib/flags";
import { listOrders } from "../../lib/ordersApi";
import { readyToBottle, ORDERS_CHANGED } from "../../lib/orders";
import { OPEN_STATUSES } from "../../lib/calc";
import { IconSteps } from "../icons";

// A quiet card on the Bench for sellers (profiles.sells): how many orders are
// open, linking to the queue. Shown only with the `orders` flag; on Free it
// still links (the queue shows the Pro lock), without asking the API.
export default function OrdersCard() {
  const { t, locale } = useI18n();
  const { profile } = useProfile();
  const entitlements = useEntitlements();
  const pro = entitlements.loaded && can(entitlements, "orders");
  const show = flagOn("orders") && Boolean(profile?.sells);
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!show || !pro) return;
    let live = true;
    listOrders().then((rows) => { if (live) setCount(rows.filter((r) => OPEN_STATUSES.includes(r.status)).length); }).catch(() => {});
    return () => { live = false; };
  }, [show, pro]);

  if (!show) return null;
  return (
    <Link to={locale === "ar" ? "/ar/bench/orders" : "/bench/orders"}
      className="flex items-center justify-between gap-3 mb-6 p-4 sm:p-5 border rounded min-h-[48px]" style={{ borderColor: COLORS.line, color: COLORS.ink }}>
      <span className="flex items-center gap-2"><IconSteps size={18} /><span>{t("orders.benchCard.title")}</span></span>
      <span className="text-sm" style={{ color: COLORS.inkSoft }}>
        {count === null ? t("orders.benchCard.open") : t("orders.benchCard.line", { count })}
      </span>
    </Link>
  );
}

/**
 * For the Orders tab's badge: how many orders are ready to bottle today.
 * Asked once when the tab appears (Pro only; Free sees the lock, not a
 * count), then kept in step by the queue itself (ORDERS_CHANGED).
 */
export function useReadyToBottle(enabled) {
  const entitlements = useEntitlements();
  const pro = entitlements.loaded && can(entitlements, "orders");
  const [ready, setReady] = useState(0);
  useEffect(() => {
    if (!enabled || !pro) return undefined;
    let live = true;
    listOrders().then((rows) => { if (live) setReady(readyToBottle(rows)); }).catch(() => {});
    const update = (e) => setReady(e.detail?.ready ?? 0);
    window.addEventListener(ORDERS_CHANGED, update);
    return () => { live = false; window.removeEventListener(ORDERS_CHANGED, update); };
  }, [enabled, pro]);
  return enabled && pro ? ready : 0;
}

/**
 * On the Bench when it was opened from the order queue: how many orders
 * this bottle is weighed for, then (after the log) how many it took.
 */
export function OrdersFor({ count, linked }) {
  const { t, locale } = useI18n();
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 sm:p-5 border rounded" style={{ borderColor: COLORS.actionText, color: COLORS.ink }}>
      <span className="flex items-center gap-2"><IconSteps size={18} />
        <span>{linked === null ? t("orders.weigh.for", { count }) : t("orders.weigh.linked", { count: linked })}</span></span>
      <Link to={locale === "ar" ? "/ar/bench/orders" : "/bench/orders"} className="text-sm underline underline-offset-4 min-h-[44px] inline-flex items-center" style={{ color: COLORS.ink }}>
        {t("orders.weigh.back")}
      </Link>
    </div>
  );
}

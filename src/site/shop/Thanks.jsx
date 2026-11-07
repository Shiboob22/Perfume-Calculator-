import React, { useState } from "react";
import { Link } from "../../motion";
import { Button } from "../../components/kx";
import { COLORS, TYPE } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { localePath } from "../meta";
import { money } from "./money";
import { LAST_ORDER_KEY } from "./Checkout";

// The page after an order: the order number to keep. It reads the last order
// from this tab's session storage; opened cold it just points back to the shop.
export default function Thanks() {
  const { t, locale } = useI18n();
  const [order] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || "null"); } catch { return null; }
  });
  const shop = localePath(locale, "/shop");
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-10 pb-24">
      {order ? (
        <>
          <h1 className={`${TYPE.title} mb-6`}>{t("shop.thanks.title")}</h1>
          <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("shop.thanks.orderNo")}</p>
          <p dir="ltr" className="font-serif text-5xl mb-2 tabular-nums" style={{ color: COLORS.ink }}>{order.orderNo}</p>
          <p className="mb-6" style={{ color: COLORS.inkSoft }}>{t("shop.thanks.keep")}</p>
          <p className="mb-2" style={{ color: COLORS.ink }}>{t("shop.thanks.total")}: <span className="font-medium tabular-nums">{money(order.total, locale)}</span></p>
          <p className="mb-8" style={{ color: COLORS.ink }}>{t("shop.thanks.text")}</p>
          <Button as={Link} to={shop} variant="secondary">{t("shop.thanks.again")}</Button>
        </>
      ) : (
        <>
          <h1 className={`${TYPE.title} mb-4`}>{t("shop.title")}</h1>
          <p className="mb-4" style={{ color: COLORS.inkSoft }}>{t("shop.thanks.none")}</p>
          <Link to={shop} className="underline underline-offset-4" style={{ color: COLORS.actionText }}>{t("shop.thanks.again")}</Link>
        </>
      )}
    </div>
  );
}

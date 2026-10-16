import React, { useEffect, useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { useEntitlements } from "../lib/useEntitlements";
import { joinWaitlist, onWaitlist } from "../lib/accountApi";

// Join the Pro waitlist in one tap, where Pro is what's missing: a locked
// feature, the batch cap. `source` says which (pro_waitlist.source).
// Hidden when the plan didn't load: the user may well be Pro already.
export default function WaitlistButton({ source }) {
  const { t, locale } = useI18n();
  const entitlements = useEntitlements();
  const [state, setState] = useState("checking"); // checking | idle | joining | joined | failed

  useEffect(() => {
    let cancelled = false;
    onWaitlist().then((on) => !cancelled && setState(on ? "joined" : "idle")).catch(() => !cancelled && setState("idle"));
    return () => { cancelled = true; };
  }, []);

  if (entitlements.failed || state === "checking") return null;
  if (state === "joined") return <p role="status" className="mt-3 text-sm" style={{ color: COLORS.forest }}>{t("account.waitlist.joined")}</p>;

  async function join() {
    setState("joining");
    try {
      await joinWaitlist(locale, source);
      setState("joined");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={join} disabled={state === "joining"}
        className="px-4 py-2 text-sm font-semibold rounded-sm disabled:opacity-50" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
        {t("account.waitlist.join")}
      </button>
      <p role="status" className="mt-2 text-xs" style={{ color: COLORS.danger }}>{state === "failed" ? t("account.waitlist.failed") : ""}</p>
    </div>
  );
}

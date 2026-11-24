import React, { useEffect, useState } from "react";
import { COLORS } from "../../lib/theme";
import { pushSupported, pushKey, currentSubscription, enablePush, disablePush } from "../../lib/push";

// "Nudge this device" (Journal J2b, Pro): web push when a batch reaches a milestone with no note.
// Shown only where the browser can do it and the server has push set up. The push carries no
// words from the server: the device writes its own message.
export default function PushToggle({ t }) {
  const [state, setState] = useState("checking"); // checking | off | on | denied | hidden
  const [key, setKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      if (!pushSupported()) return live && setState("hidden");
      try {
        const k = await pushKey();
        if (!live) return;
        if (!k) return setState("hidden");
        setKey(k);
        if (Notification.permission === "denied") return setState("denied");
        setState((await currentSubscription()) ? "on" : "off");
      } catch {
        if (live) setState("hidden");
      }
    })();
    return () => { live = false; };
  }, []);

  if (state === "checking" || state === "hidden") return null;

  async function turnOn() {
    setBusy(true); setError("");
    try { await enablePush(key); setState("on"); }
    catch (e) { if (e?.message === "denied") setState("denied"); else setError(t("journal.page.push.failed")); }
    finally { setBusy(false); }
  }
  async function turnOff() {
    setBusy(true); setError("");
    try { await disablePush(); setState("off"); } finally { setBusy(false); }
  }

  return (
    <div data-push className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {state === "denied" ? (
        <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("journal.page.push.denied")}</p>
      ) : (
        <>
          <button type="button" aria-pressed={state === "on"} onClick={state === "on" ? turnOff : turnOn} disabled={busy}
            className="min-h-[44px] px-4 text-sm rounded disabled:opacity-60"
            style={{ border: `1px solid ${state === "on" ? COLORS.verdigris : COLORS.ink}`, background: state === "on" ? COLORS.verdigris : "transparent", color: state === "on" ? COLORS.paper : COLORS.ink }}>
            {state === "on" ? t("journal.page.push.on") : t("journal.page.push.enable")}
          </button>
          <p className="text-xs" style={{ color: COLORS.inkSoft }}>{t("journal.page.push.note")}</p>
        </>
      )}
      <p role="status" className="text-sm empty:hidden" style={{ color: COLORS.danger }}>{error}</p>
    </div>
  );
}

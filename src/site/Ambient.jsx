import React, { useEffect, useRef, useState } from "react";
import { flagOn } from "../lib/flags";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { IconPause, IconPlay } from "../components/icons";

/** The flag, read like useImagery: build flag on the first render (same HTML as the prerender), device flag after. */
export function useAmbient() {
  const [on, setOn] = useState(() => flagOn("ambient", { storage: null }));
  useEffect(() => { if (!on && flagOn("ambient")) setOn(true); }, [on]);
  return on;
}

// Listen / Stop for the kyphi band's music (src/site/templeSound.js, its own chunk,
// and the track, fetched on the first press). Never starts by itself (WCAG 1.4.2), never
// remembered: every visit starts silent. Not offered under Motion Off.
export default function Ambient() {
  const { t } = useI18n();
  const [shown, setShown] = useState(false); // not in the prerender: Motion Off is read on the device
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const stop = useRef(null);
  const loading = useRef(false);
  const gone = useRef(false);

  useEffect(() => {
    gone.current = false; // StrictMode mounts twice in dev: reset on every mount
    setShown(document.documentElement.getAttribute("data-mo-level") !== "off");
    return () => { gone.current = true; stop.current?.(); stop.current = null; };
  }, []);

  const toggle = async () => {
    // A failed load is nearly always a page left open across a deploy (its code chunks are gone): load the live release.
    if (failed) { window.location.reload(); return; }
    if (stop.current) { stop.current(); stop.current = null; setPlaying(false); return; }
    if (loading.current) return; // still loading: a second press must not start a second copy
    // Make the context inside the press itself (iOS allows audio only there), then build on it once loaded.
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const session = navigator.audioSession; // iPhone: "playback" is not muted by the ringer switch
    try { if (session) session.type = "playback"; } catch { /* older Safari */ }
    let ac;
    try { ac = new AC({ latencyHint: "playback" }); } catch { ac = new AC(); }
    ac.resume().catch(() => {});
    setPlaying(true);
    loading.current = true;
    try {
      const halt = await (await import("./templeSound.js")).startAmbient(ac, session);
      if (gone.current) halt(); else stop.current = halt; // the page was left while it loaded
    }
    catch { ac.close().catch(() => {}); setPlaying(false); setFailed(true); }
    finally { loading.current = false; }
  };

  if (!shown) return null;
  return (
    <div className="mt-6">
      <button type="button" onClick={toggle} aria-pressed={playing} data-ambient
        className="inline-flex items-center gap-2 px-4 min-h-[44px] text-sm font-medium mo-press"
        style={{ border: `1px solid ${COLORS.ink}` }}>
        {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
        {t(failed ? "site.ambient.reload" : playing ? "site.ambient.stop" : "site.ambient.listen")}
      </button>
      {failed && <p role="status" data-ambient-failed className="text-sm mt-2" style={{ color: COLORS.ink }}>{t("site.ambient.failed")}</p>}
      <p className="text-sm mt-2" style={{ color: COLORS.dim }}>{t("site.ambient.hint")}</p>
    </div>
  );
}

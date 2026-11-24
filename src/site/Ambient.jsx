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

// Listen / Stop for the kyphi band's music (src/site/templeSound.js, its own chunk, and the track).
// Plays by default (owner, 2026-11-25): it starts when the home page opens; where the browser
// holds sound until the first tap or key press (nearly all of them), that first press anywhere
// on the page lets it in. Stop is remembered on the device (STOPPED), and Listen clears it.
// Not offered under Motion Off; silent with the tab hidden (templeSound.js).
const STOPPED = "kyphira.ambientStopped";
// Browsers count a press as a gesture on different events: a mouse on pointerdown, a finger only on pointerup/touchend/click.
const GESTURES = ["pointerdown", "pointerup", "touchend", "click", "keydown"];

export default function Ambient() {
  const { t } = useI18n();
  const [shown, setShown] = useState(false); // not in the prerender: Motion Off is read on the device
  const [playing, setPlaying] = useState(false); // started, and audible (not waiting for a first press)
  const [failed, setFailed] = useState(false);
  const stop = useRef(null);
  const ctx = useRef(null);
  const loading = useRef(false);
  const gone = useRef(false);

  const start = async () => {
    if (loading.current || stop.current) return; // never a second copy
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const session = navigator.audioSession; // iPhone: "playback" is not muted by the ringer switch
    try { if (session) session.type = "playback"; } catch { /* older Safari */ }
    let ac;
    try { ac = new AC({ latencyHint: "playback" }); } catch { ac = new AC(); }
    ctx.current = ac;
    const sync = () => setPlaying(ac.state === "running");
    ac.onstatechange = sync;
    // Until the browser lets sound in, the first press anywhere wakes the context.
    // The button's own press is left to toggle(), or it would wake the music and then stop it.
    const unlock = (e) => e?.target?.closest?.("[data-ambient]") ? undefined : ac.resume().then(() => {
      if (ac.state === "running") GESTURES.forEach((e) => document.removeEventListener(e, unlock, true));
    }).catch(() => {});
    GESTURES.forEach((e) => document.addEventListener(e, unlock, true));
    unlock();
    loading.current = true;
    try {
      const halt = await (await import("./templeSound.js")).startAmbient(ac, session);
      const end = () => { GESTURES.forEach((e) => document.removeEventListener(e, unlock, true)); ac.onstatechange = null; halt(); };
      if (gone.current) end(); else { stop.current = end; sync(); }
    }
    catch { GESTURES.forEach((e) => document.removeEventListener(e, unlock, true)); ac.close().catch(() => {}); setPlaying(false); setFailed(true); }
    finally { loading.current = false; }
  };

  useEffect(() => {
    gone.current = false; // StrictMode mounts twice in dev: reset on every mount
    const off = document.documentElement.getAttribute("data-mo-level") === "off";
    setShown(!off);
    let stopped = false;
    try { stopped = localStorage.getItem(STOPPED) === "1"; } catch { /* private mode */ }
    if (!off && !stopped) start();
    return () => { gone.current = true; stop.current?.(); stop.current = null; };
  }, []);

  const toggle = () => {
    // A failed load is nearly always a page left open across a deploy (its code chunks are gone): load the live release.
    if (failed) { window.location.reload(); return; }
    if (stop.current && playing) {
      stop.current(); stop.current = null; setPlaying(false);
      try { localStorage.setItem(STOPPED, "1"); } catch { /* private mode */ }
      return;
    }
    try { localStorage.removeItem(STOPPED); } catch { /* private mode */ }
    if (stop.current || loading.current) { ctx.current?.resume().catch(() => {}); return; } // waiting for a press: this is it
    start();
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

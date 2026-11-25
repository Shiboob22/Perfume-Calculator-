// The kyphi band's music: "Ancient Egyptian Ritual Chant" (owner's file,
// 2026-11-25; the owner holds the rights), two minutes cut from
// 1:30 of the 17-minute original with ffmpeg (loudnorm -16 LUFS, 96 kbps AAC)
// → public/media/kyphi-chant.m4a (~1.5 MB). Looped with a 4 s crossfade.
// While it plays, its loudness drives the home scroll scene (src/site/pulse.js).
// Plays by default from src/site/Ambient.jsx; the service worker never precaches /media.
import { pulse, followPulse } from "./pulse.js";

export const SRC = "/media/kyphi-chant.m4a";
export const LEVEL = 0.7;
export const FADE_IN = 2;
export const FADE_OUT = 1.5;
export const LOOP_END = 120; // the whole file...
export const XFADE = 4; // ...whose last seconds cross-fade into the next copy (a chant has no beat to land on)

/** When copy n starts, in seconds after the first. Pure. */
export const loopStart = (n) => n * (LOOP_END - XFADE);

/**
 * Plays on `ac` (made and resumed in the press: iOS allows audio only there).
 * Resolves to stop() once the track has loaded; rejects if it can't load.
 */
export async function startAmbient(ac, session) {
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`ambient ${res.status}`);
  const track = await ac.decodeAudioData(await res.arrayBuffer());

  const master = ac.createGain();
  const t0 = ac.currentTime + 0.05;
  master.gain.setValueAtTime(0, t0);
  master.gain.linearRampToValueAtTime(LEVEL, t0 + FADE_IN);
  const meter = ac.createAnalyser();
  meter.fftSize = 1024;
  master.connect(meter).connect(ac.destination);

  let n = 0, timer = 0;
  const copy = () => {
    const at = t0 + loopStart(n), end = at + LOOP_END;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = track;
    g.gain.setValueAtTime(n ? 0 : 1, at); // the first copy enters whole (master fades it in); later ones cross-fade in
    if (n) g.gain.linearRampToValueAtTime(1, at + XFADE);
    g.gain.setValueAtTime(1, end - XFADE);
    g.gain.linearRampToValueAtTime(0, end);
    src.connect(g).connect(master);
    src.start(at); src.stop(end + 0.05);
    n++;
    // Queue the next copy a few seconds ahead, on the audio clock.
    timer = setTimeout(copy, Math.max(0, (t0 + loopStart(n) - ac.currentTime - 4) * 1000));
  };
  copy();

  // Silent in a hidden tab (the audio clock stops too, so the loop stays in step).
  const sync = () => (document.hidden ? ac.suspend() : ac.resume()).catch(() => {});
  document.addEventListener("visibilitychange", sync);

  // The scene follows the music, not under Calm or reduced motion (it is ambient motion).
  const root = document.documentElement;
  const still = root.hasAttribute("data-mo-level") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const block = new Float32Array(meter.fftSize);
  let raf = 0;
  const listen = () => {
    meter.getFloatTimeDomainData(block);
    let sum = 0;
    for (let i = 0; i < block.length; i++) sum += block[i] * block[i];
    Object.assign(pulse, followPulse(pulse, Math.sqrt(sum / block.length)));
    root.style.setProperty("--kx-pulse", pulse.v.toFixed(3));
    raf = requestAnimationFrame(listen); // rAF stops in a hidden tab by itself
  };
  if (!still) raf = requestAnimationFrame(listen);

  return function stop() {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    pulse.v = 0; pulse.base = 0;
    root.style.removeProperty("--kx-pulse");
    document.removeEventListener("visibilitychange", sync);
    const g = master.gain, now = ac.currentTime;
    // Hold wherever the fade-in has got to, then fade out from there.
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
    else { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); }
    g.linearRampToValueAtTime(0, now + FADE_OUT);
    setTimeout(() => {
      ac.close().catch(() => {});
      try { if (session) session.type = "auto"; } catch { /* older Safari */ }
    }, FADE_OUT * 1000 + 100);
  };
}

// The kyphi band's music: an original piece composed for Kyphira (owner,
// 2026-11-24; no licence needed), in the style of a modern Egyptian desert
// groove: 107 bpm, D harmonic minor, oud, qanun, ney, darbuka, bass, strings.
// Made by `node scripts/make-kyphi-music.mjs` (scripts/kyphi-music/compose.js)
// → public/media/kyphi-music.m4a (96 kbps AAC, -16 LUFS, ~0.75 MB): 26 bars of
// music and 2 bars where the last notes ring out. Loaded only when the reader
// presses Listen (src/site/Ambient.jsx); the service worker never precaches /media.

export const SRC = "/media/kyphi-music.m4a";
export const LEVEL = 0.7;
export const FADE_IN = 2;
export const FADE_OUT = 1.5;
export const BAR = 240 / 107;
export const LOOP_END = 28 * BAR; // the whole file...
export const XFADE = 2 * BAR; // ...whose ringing tail overlaps the next copy's first bars, on the beat

/** When copy n starts, in seconds after the first: every 26 bars. Pure. */
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
  master.connect(ac.destination);

  let n = 0, timer = 0;
  const copy = () => {
    const at = t0 + loopStart(n), end = at + LOOP_END;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = track;
    g.gain.setValueAtTime(1, at); // each copy enters whole, on the beat; only the ringing tail fades
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

  return function stop() {
    clearTimeout(timer);
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

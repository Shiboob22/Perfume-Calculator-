// The pour's sound, generated with Web Audio (no files). Nothing plays until
// the visitor has touched the page (browsers keep the AudioContext suspended
// until a gesture) and only while the sound toggle is on. A recorded spray
// can replace spray() later.
import { B, stream } from "./timeline.js";

export function createSound() {
  let ac = null, noise = null, pourGain = null, pourFilter = null, pourTimer = 0, prevP = null;
  let on = false;

  function ctx() {
    if (!on) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = ac || new AC();
    if (ac.state === "suspended") ac.resume().catch(() => {});
    if (!noise) {
      noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ac;
  }

  // A noise burst through a filter, with an attack to `peak`; the caller shapes the tail.
  function burst(out, at, dur, type, freq, q, peak, atk) {
    const s = ac.createBufferSource();
    s.buffer = noise;
    s.playbackRate.value = 0.9 + Math.random() * 0.2;
    const fl = ac.createBiquadFilter();
    fl.type = type; fl.frequency.setValueAtTime(freq, at); fl.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + atk);
    s.connect(fl).connect(g).connect(out);
    s.start(at, Math.random()); s.stop(at + dur + 0.05);
    return { fl, g };
  }

  /** A mechanical tick: the atomiser crimp or the cap click. */
  function click(kind) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime;
    const n = burst(a.destination, t, 0.06, "bandpass", kind === "cap" ? 1600 : 2600, 3, 0.3, 0.004);
    n.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    const o = a.createOscillator(), og = a.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(kind === "cap" ? 900 : 1500, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.05);
    og.gain.setValueAtTime(0.06, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(og).connect(a.destination); o.start(t); o.stop(t + 0.08);
  }

  /** One spray: valve click, a falling hiss with an air layer and a body, the return click. */
  function spray() {
    const a = ctx(); if (!a) return;
    const t = a.currentTime, out = a.createGain();
    out.connect(a.destination);
    const valve = (at, f, pk) => {
      const c = burst(out, at, 0.03, "bandpass", f, 4, pk, 0.002);
      c.g.gain.exponentialRampToValueAtTime(0.0001, at + 0.025);
      const o = a.createOscillator(), og = a.createGain(), lp = a.createBiquadFilter();
      o.type = "square"; o.frequency.setValueAtTime(f * 0.5, at); o.frequency.exponentialRampToValueAtTime(f * 0.2, at + 0.02);
      og.gain.setValueAtTime(pk * 0.15, at); og.gain.exponentialRampToValueAtTime(0.0001, at + 0.025);
      lp.type = "lowpass"; lp.frequency.value = 3000;
      o.connect(lp).connect(og).connect(out); o.start(at); o.stop(at + 0.04);
    };
    valve(t, 3200, 0.22);
    const t0 = t + 0.018, dur = 0.42;
    const hiss = burst(out, t0, dur, "bandpass", 7800, 0.9, 0.22, 0.012);
    hiss.fl.frequency.setValueAtTime(8600, t0); hiss.fl.frequency.exponentialRampToValueAtTime(5200, t0 + dur);
    hiss.g.gain.setValueAtTime(0.22, t0 + 0.012); hiss.g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.16); hiss.g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const air = burst(out, t0, dur, "highpass", 10500, 0.5, 0.1, 0.006);
    air.g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.12); air.g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.8);
    const body = burst(out, t0, 0.2, "bandpass", 2400, 1.4, 0.05, 0.01);
    body.g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    valve(t0 + dur + 0.04, 2400, 0.12);
  }

  /** The looping pour: low for oil, brighter for alcohol, gone 180 ms after scrolling stops. */
  function pour(amount, alc) {
    if (!on || amount < 0.02) { if (pourGain && ac) pourGain.gain.setTargetAtTime(0, ac.currentTime, 0.06); return; }
    const a = ctx(); if (!a) return;
    if (!pourGain) {
      const src = a.createBufferSource();
      src.buffer = noise; src.loop = true;
      pourFilter = a.createBiquadFilter(); pourFilter.type = "lowpass";
      pourGain = a.createGain(); pourGain.gain.value = 0;
      src.connect(pourFilter).connect(pourGain).connect(a.destination);
      src.start();
    }
    const t = a.currentTime;
    pourFilter.frequency.setTargetAtTime(alc ? 2200 : 900, t, 0.05);
    pourGain.gain.setTargetAtTime(0.07 * amount, t, 0.05);
    clearTimeout(pourTimer);
    pourTimer = setTimeout(() => { if (pourGain) pourGain.gain.setTargetAtTime(0, ac.currentTime, 0.08); }, 180);
  }

  return {
    /** Switches sound on or off (call from the toggle: that click is the gesture that unlocks audio). */
    setOn(next) {
      on = next;
      if (on) ctx();
      else if (pourGain && ac) pourGain.gain.setTargetAtTime(0, ac.currentTime, 0.04);
    },
    /** Called with each new p: one-shot sounds fire when p crosses their moment going forward. */
    step(p) {
      const pp = prevP;
      prevP = p;
      if (pp == null || !on) return;
      const up = (x) => pp < x && p >= x;
      if (up(B.ato[1])) click("crimp");
      if (up(B.spray[0] + 0.004)) spray();
      if (up(B.cap[1] - 0.004)) click("cap");
      const st = stream(p);
      pour(st.on, st.alc);
    },
    dispose() {
      clearTimeout(pourTimer);
      if (ac) ac.close().catch(() => {});
      ac = null; pourGain = null;
    },
  };
}

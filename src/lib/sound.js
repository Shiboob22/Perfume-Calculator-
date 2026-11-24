// Sound (owner approved 2026-11-24, docs/superpowers/specs/2026-11-24-sound-design.md):
// a few quiet cues for outcomes, never for the interface. Off unless chosen
// (Off / Soft / On, kept on the device like Motion). Every cue is made with
// Web Audio, no files, and every cue has its words on screen already.
// Silent while the tab is hidden and under Motion Off.

export const SOUND_LEVELS = Object.freeze(["off", "soft", "on"]);
export const SOUND_KEY = "kyphira.sound";
export const SOUND_GAIN = Object.freeze({ soft: 0.035, on: 0.1 });
export const CUES = Object.freeze(["tare", "band", "over", "log", "note", "ready", "fail"]);

const store = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

/** The stored choice, off when none or unknown. */
export function soundLevel(storage = store()) {
  try {
    const v = storage?.getItem(SOUND_KEY) ?? null;
    return SOUND_LEVELS.includes(v) ? v : "off";
  } catch { return "off"; }
}

export function setSoundLevel(level, storage = store()) {
  if (!SOUND_LEVELS.includes(level)) return;
  try { storage?.setItem(SOUND_KEY, level); } catch { /* private mode: this page only */ }
  memo = level;
}

/** Whether a cue may play now. Pure. */
export function audible({ level, hidden = false, motion = "full", cue }) {
  return level !== "off" && !hidden && motion !== "off" && CUES.includes(cue);
}

let memo = null, ac = null, noise = null, last = null;

function context() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  ac = ac || new AC();
  if (ac.state === "suspended") ac.resume().catch(() => {});
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ac;
}

// One sound at a time: a new cue fades the last out over ~10 ms.
function bus(gain) {
  if (last) last.gain.setTargetAtTime(0, ac.currentTime, 0.01);
  const g = ac.createGain();
  g.gain.value = gain;
  g.connect(ac.destination);
  last = g;
  return g;
}

function env(g, t, peak, attack, end) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
}

// Glass: inharmonic partials (1, 2.76, 5.4), the higher ones fading faster.
function glass(out, t, f, dur = 0.9, amp = 1) {
  for (const [m, a] of [[1, 1], [2.76, 0.45], [5.4, 0.2]]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f * m;
    env(g, t, amp * a, 0.004, t + dur / m);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur);
  }
}

function hiss(out, t, dur, type, f, q, amp, sweepTo) {
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  env(g, t, amp, Math.min(0.01, dur / 3), t + dur);
  s.connect(fl).connect(g).connect(out); s.start(t); s.stop(t + dur + 0.05);
}

function tone(out, t, f, to, dur, type = "sine", amp = 0.9) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
  env(g, t, amp, 0.003, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.03);
}

const SYNTH = {
  tare: (o, t) => hiss(o, t, 0.025, "bandpass", 1800, 4, 1.4),
  band: (o, t) => glass(o, t, 2093, 0.8),
  over: (o, t) => { tone(o, t, 180, 108, 0.12); tone(o, t + 0.13, 150, 90, 0.12); },
  log: (o, t) => { glass(o, t, 1568, 0.7, 0.8); glass(o, t + 0.12, 2349, 0.9); hiss(o, t + 0.45, 0.4, "bandpass", 3000, 0.8, 0.25, 1200); },
  note: (o, t) => hiss(o, t, 0.18, "highpass", 4200, 0.7, 0.35, 2600),
  ready: (o, t) => { glass(o, t, 1319, 1.2, 0.7); glass(o, t + 0.18, 1760, 1.2, 0.7); glass(o, t + 0.36, 2637, 1.6); },
  fail: (o, t) => tone(o, t, 196, null, 0.4, "triangle", 0.6),
};

// Browsers start audio only from a gesture, and some cues follow a server
// answer (no gesture left): wake the context on the first press instead.
if (typeof window !== "undefined") {
  const wake = () => { try { if ((memo ?? (memo = soundLevel())) !== "off") context(); } catch { /* no audio */ } };
  window.addEventListener("pointerdown", wake, { capture: true, passive: true });
  window.addEventListener("keydown", wake, { capture: true, passive: true });
}

/** Plays a cue when the reader has sound on. Never throws. */
export function play(cue) {
  try {
    const level = memo ?? (memo = soundLevel());
    const hidden = typeof document !== "undefined" && document.hidden;
    const motion = typeof document !== "undefined" ? document.documentElement.getAttribute("data-mo-level") : null;
    if (!audible({ level, hidden, motion: motion ?? "full", cue })) return;
    if (!context()) return;
    SYNTH[cue](bus(SOUND_GAIN[level]), ac.currentTime + 0.01);
  } catch { /* audio is decoration: never break the action it follows */ }
}

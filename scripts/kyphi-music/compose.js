/* global window, OfflineAudioContext */
// The kyphi band's music, composed for Kyphira (owner, 2026-11-24): original,
// in the style of a modern "Egyptian desert" groove (no other track's melody,
// recording or samples). Rendered once by scripts/make-kyphi-music.mjs in a
// headless browser (OfflineAudioContext), never in the reader's browser.
// A plain script: defines window.renderKyphiMusic(seed) → base64 WAV.
//
// 107 bpm, D harmonic minor (Hijaz on A): D E F G A B♭ C♯. Chords per bar:
// Dm, B♭, A, Dm. Bars 1–4 oud and pad; 5–8 + bass and darbuka; 9–16 the full
// groove (maqsum, low drum, a qanun run); 17–24 + the ney's melody; 25–26
// breakdown; 27–28 nothing new, only the ring of the last notes, which the
// player overlaps with the next copy's start, so the loop has no seam.
(() => {
  const BPM = 107, BEAT = 60 / BPM, BAR = BEAT * 4, E8 = BEAT / 2, E16 = BEAT / 4;
  const BARS = 26, TAIL = 2, SR = 44100;
  const NOTE = { A1: 33, D2: 38, E2: 40, F2: 41, G2: 43, A2: 45, Bb2: 46, B2: 47, C3: 48, Cs3: 49, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, Bb3: 58, Cs4: 61, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, Bb4: 70, Cs5: 73, D5: 74 };
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const n = (name) => NOTE[name];

  // The four-bar cycle: chord, bass root and fifth, pad voicing, oud riff (eighths; null = rest).
  const CYCLE = [
    { root: "D2", fifth: "A1", pad: ["D3", "F3", "A3"], riff: ["D3", null, "F3", "E3", "D3", "A2", "Bb2", "A2"] },
    { root: "Bb2", fifth: "F2", pad: ["D3", "F3", "Bb3"], riff: ["D3", null, "F3", "E3", "D3", "Bb2", "A2", "Bb2"] },
    { root: "A2", fifth: "E2", pad: ["Cs3", "E3", "A3"], riff: ["Cs3", null, "E3", "D3", "Cs3", "A2", "Bb2", "A2"] },
    { root: "D2", fifth: "A1", pad: ["D3", "F3", "A3"], riff: ["D3", "E3", "F3", "E3", "D3", "Cs3", "D3", null] },
  ];
  // The ney's melody: two four-bar phrases of [beat, note, beats].
  const NEY = [
    [[0, "A4", 2], [2, "Bb4", 1], [3, "A4", 1], [4, "F4", 2], [6, "E4", 1], [7, "D4", 1], [8, "E4", 1.5], [9.5, "F4", 0.5], [10, "E4", 1], [11, "Cs4", 1], [12, "D4", 3.5]],
    [[0, "D5", 1.5], [1.5, "Cs5", 0.5], [2, "Bb4", 1], [3, "A4", 1], [4, "Bb4", 1], [5, "A4", 1], [6, "G4", 1], [7, "F4", 1], [8, "E4", 2], [10, "F4", 1], [11, "E4", 0.5], [11.5, "Cs4", 0.5], [12, "D4", 3.5]],
  ];
  // Darbuka maqsum, eighths: Doum, Tek, rest.
  const MAQSUM = "DT.TD.T.";

  function mulberry32(a) {
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  window.renderKyphiMusic = async (seed = 7) => {
    const rand = mulberry32(seed);
    const len = (BARS + TAIL) * BAR;
    const ac = new OfflineAudioContext(2, Math.ceil(len * SR), SR);

    // Bus: warm lowpass (the style has little above 2 kHz), glue compressor, a modest hall.
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    const warm = ac.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 3000; warm.Q.value = 0.5;
    const bus = ac.createGain(); bus.connect(warm).connect(comp).connect(ac.destination);
    const hall = ac.createConvolver();
    const irLen = Math.floor(SR * 2.2), ir = ac.createBuffer(2, irLen, SR);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irLen; i++) d[i] = (rand() * 2 - 1) * (1 - i / irLen) ** 4; }
    hall.buffer = ir;
    const hallOut = ac.createGain(); hallOut.gain.value = 0.35; hall.connect(hallOut).connect(bus);
    const channel = (pan, gain, send) => {
      const g = ac.createGain(), p = ac.createStereoPanner(); g.gain.value = gain; p.pan.value = pan;
      g.connect(p).connect(bus);
      if (send) { const s = ac.createGain(); s.gain.value = send; p.connect(s).connect(hall); }
      return g;
    };
    const ch = {
      oud: channel(-0.2, 0.9, 0.25), qanun: channel(0.3, 0.55, 0.4), ney: channel(0.2, 0.5, 0.45),
      pad: channel(0, 0.34, 0.5), bass: channel(0, 0.75, 0.05), drum: channel(0.08, 0.8, 0.15), low: channel(0, 0.9, 0.05),
    };
    const noise = ac.createBuffer(1, SR, SR); { const d = noise.getChannelData(0); for (let i = 0; i < SR; i++) d[i] = rand() * 2 - 1; }
    const env = (g, t, peak, attack, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };

    // Plucked strings: Karplus–Strong, tuned with a first-order allpass for the fractional part of the period.
    const ksCache = new Map();
    const ks = (f, dur, damp) => {
      const key = `${f.toFixed(2)}:${dur}:${damp}`;
      if (ksCache.has(key)) return ksCache.get(key);
      const len = Math.ceil(SR * dur), out = ac.createBuffer(1, len, SR), y = out.getChannelData(0);
      const period = SR / f - 0.5, p = Math.floor(period), frac = period - p, C = (1 - frac) / (1 + frac);
      const line = new Float32Array(p);
      let lp = 0;
      for (let i = 0; i < p; i++) { lp += 0.3 * ((rand() * 2 - 1) - lp); line[i] = lp; } // a soft pick: lowpassed noise
      let idx = 0, apX = 0, apY = 0, prev = 0;
      for (let i = 0; i < len; i++) {
        const x = line[idx];
        const avg = damp * 0.5 * (x + prev); prev = x;
        const ap = C * avg + apX - C * apY; apX = avg; apY = ap; // fine tuning
        line[idx] = ap; y[i] = x; idx = (idx + 1) % p;
      }
      ksCache.set(key, out);
      return out;
    };
    const pluck = (out, t, note, amp, dur = 1.6, damp = 0.996) => {
      const s = ac.createBufferSource(), g = ac.createGain(), body = ac.createBiquadFilter();
      s.buffer = ks(hz(n(note)), dur, damp); body.type = "peaking"; body.frequency.value = 250; body.gain.value = 7; body.Q.value = 1;
      const soft = ac.createBiquadFilter(); soft.type = "lowpass"; soft.frequency.value = 1600;
      g.gain.value = amp; s.connect(body).connect(soft).connect(g).connect(out); s.start(t);
    };

    // Darbuka: doum (low, round), tek (rim crack), ka (soft rim).
    const doum = (t, a) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      env(g, t, 0.8 * a, 0.002, 0.35); o.connect(g).connect(ch.drum); o.start(t); o.stop(t + 0.4);
    };
    const rim = (t, a, f) => {
      const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noise; bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 3;
      env(g, t, a, 0.001, 0.07); s.connect(bp).connect(g).connect(ch.drum); s.start(t, rand() * 0.5); s.stop(t + 0.1);
      const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = f / 4;
      env(og, t, a * 0.5, 0.001, 0.05); o.connect(og).connect(ch.drum); o.start(t); o.stop(t + 0.06);
    };
    const tek = (t, a) => rim(t, 0.5 * a, 1300);
    const ka = (t, a) => rim(t, 0.2 * a, 1000);
    // The low drum under the groove (the style's weight is in the sub-bass).
    const low = (t, a) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(75, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
      env(g, t, a, 0.003, 0.6); o.connect(g).connect(ch.low); o.start(t); o.stop(t + 0.65);
    };
    const bass = (t, note, dur) => {
      const f = hz(n(note)), g = ac.createGain(), lp = ac.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + 0.25); lp.Q.value = 2;
      for (const [type, a] of [["sawtooth", 0.5], ["sine", 0.8]]) {
        const o = ac.createOscillator(), og = ac.createGain(); o.type = type; o.frequency.value = f; og.gain.value = a;
        o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 0.1);
      }
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.01); g.gain.setTargetAtTime(0.3, t + 0.05, 0.1); g.gain.setTargetAtTime(0.0001, t + dur, 0.04);
      lp.connect(g).connect(ch.bass);
    };
    const pad = (t, notes, dur) => {
      const lp = ac.createBiquadFilter(), g = ac.createGain();
      lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(g).connect(ch.pad);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.8); g.gain.setValueAtTime(0.25, t + dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
      for (const note of notes) for (const cents of [-9, -3, 4, 10]) {
        const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(n(note)); o.detune.value = cents;
        o.connect(lp); o.start(t); o.stop(t + dur + 0.7);
      }
    };
    // Ney: breathy, a little vibrato that opens on long notes, notes sliding into each other.
    const ney = (t0, phrase) => {
      const o = ac.createOscillator(), g = ac.createGain(), vib = ac.createGain(), lfo = ac.createOscillator(), lp = ac.createBiquadFilter();
      o.type = "triangle"; lfo.frequency.value = 5.3; lfo.connect(vib).connect(o.detune); vib.gain.value = 0;
      lp.type = "lowpass"; lp.frequency.value = 3000; o.connect(lp).connect(g).connect(ch.ney);
      const breath = ac.createBufferSource(), bp = ac.createBiquadFilter(), bg = ac.createGain();
      breath.buffer = noise; breath.loop = true; bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 1.2;
      breath.connect(bp).connect(bg).connect(ch.ney);
      g.gain.setValueAtTime(0, t0); bg.gain.setValueAtTime(0, t0);
      o.frequency.setValueAtTime(hz(n(phrase[0][1])), t0);
      let end = t0;
      for (const [beat, note, beats] of phrase) {
        const t = t0 + beat * BEAT, d = beats * BEAT;
        o.frequency.setTargetAtTime(hz(n(note)), t, 0.025);
        g.gain.setTargetAtTime(0.32, t, 0.03); g.gain.setTargetAtTime(0.22, t + d * 0.6, 0.08);
        bg.gain.setTargetAtTime(0.025, t, 0.03); bg.gain.setTargetAtTime(0.012, t + d * 0.5, 0.1);
        vib.gain.setValueAtTime(0, t); vib.gain.linearRampToValueAtTime(d > BEAT * 1.2 ? 18 : 6, t + d);
        end = t + d;
      }
      g.gain.setTargetAtTime(0, end - 0.05, 0.12); bg.gain.setTargetAtTime(0, end - 0.05, 0.1);
      for (const s of [o, lfo, breath]) { s.start(t0); s.stop(end + 1); }
    };
    const qanunRun = (t) => {
      const run = ["A2", "Bb2", "Cs3", "D3", "E3", "F3", "G3", "A3", "Bb3", "Cs4", "D4", "E4", "F4", "A4", "D5"];
      run.forEach((note, i) => { pluck(ch.qanun, t + i * E16 * 0.5, note, 0.5, 1.2, 0.997); pluck(ch.qanun, t + i * E16 * 0.5 + 0.012, note, 0.2, 1, 0.997); });
    };

    for (let b = 0; b < BARS; b++) {
      const t = b * BAR, c = CYCLE[b % 4], bar1 = b + 1;
      const intro = bar1 <= 4, full = bar1 >= 9 && bar1 <= 24, breakdown = bar1 >= 25;
      pad(t, c.pad, BAR);
      // Oud: the riff every bar, a touch softer under the ney, sometimes doubled an octave up for lift.
      c.riff.forEach((note, i) => {
        if (!note || (intro && i % 2)) return; // the intro keeps to the beats
        const accent = i === 0 ? 1 : i % 2 ? 0.7 : 0.85, under = bar1 >= 17 && bar1 <= 24 ? 0.75 : 1;
        pluck(ch.oud, t + i * E8 + rand() * 0.006, note, 0.9 * accent * under, 1.4);
        if (full && bar1 >= 13 && bar1 <= 16 && i % 2 === 0) pluck(ch.oud, t + i * E8 + 0.01, note.replace(/\d/, (d) => +d + 1), 0.25, 1);
      });
      // Bass: root, the fifth, a pickup back to the root.
      if (!intro) {
        bass(t, c.root, E8 * 2.5); bass(t + 3 * E8, c.root, E8 * 0.8); bass(t + 4 * E8, c.fifth, E8 * 1.8); bass(t + 6 * E8, c.root, E8 * 1.6);
      }
      // Drums.
      if (intro || breakdown) {
        doum(t, intro ? 0.5 : 0.8);
        if (breakdown) doum(t + 4 * E8, 0.6);
      } else {
        [...MAQSUM].forEach((s, i) => { const at = t + i * E8; if (s === "D") doum(at, i === 0 ? 1 : 0.8); else if (s === "T") tek(at, 0.9); });
        if (full) {
          for (let i = 0; i < 16; i += 2) if (rand() < 0.55) ka(t + (i + 1) * E16, 0.8); // ghost notes between
          low(t, 0.9); low(t + 2 * BEAT, 0.75);
        }
        // A roll into each eighth bar.
        if (bar1 % 8 === 0) for (let i = 8; i < 16; i++) (i % 2 ? ka : tek)(t + i * E16, 0.6 + i * 0.03);
      }
      if (bar1 === 9 || bar1 === 17) qanunRun(t - BEAT);
      if (bar1 === 17 || bar1 === 21) ney(t, NEY[bar1 === 17 ? 0 : 1]);
      if (breakdown && bar1 === BARS) pluck(ch.oud, t + 3 * BEAT, "D3", 0.8, 3, 0.998);
    }

    const out = await ac.startRendering();
    // 16-bit stereo WAV, as base64 for the Node side.
    const L = out.getChannelData(0), R = out.getChannelData(1), frames = out.length;
    const dv = new DataView(new ArrayBuffer(44 + frames * 4));
    const w = (o, s) => [...s].forEach((ch2, i) => dv.setUint8(o + i, ch2.charCodeAt(0)));
    w(0, "RIFF"); dv.setUint32(4, 36 + frames * 4, true); w(8, "WAVEfmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, frames * 4, true);
    let peak = 0; for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const k = peak > 0.98 ? 0.98 / peak : 1;
    for (let i = 0; i < frames; i++) { dv.setInt16(44 + i * 4, L[i] * k * 32767, true); dv.setInt16(46 + i * 4, R[i] * k * 32767, true); }
    const bytes = new Uint8Array(dv.buffer); let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { wav: btoa(s), seconds: len, loop: BARS * BAR, peak };
  };
})();

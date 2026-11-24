/* global window, OfflineAudioContext */
// The kyphi band's music, composed for Kyphira: "The rite" (owner's brief,
// 2026-11-25: a sound that conveys the ancient Egyptian kyphi rituals).
// Original; no other recording or samples. Rendered once by
// scripts/make-kyphi-music.mjs in a headless browser (OfflineAudioContext),
// never in the reader's browser. A plain script: defines
// window.renderKyphiMusic(seed) → base64 WAV.
//
// 66 bpm, a temple at dusk, in maqam Hijaz on D: D E♭ F♯ G A B♭ C, the E♭ a
// little high and the F♯ a little low, as Arab tuning places them (the
// ancient scales are not known; Hijaz is how Egypt sounds to the ear now).
// Under everything: the incense fire crackling, smoke-like air and the
// priests' humming on D and A. Bars 1–4 an oud taqsim over the hum, the
// sistrum and one drum stroke a bar; 5–8 + baladi on darbuka and riq, and the
// angled harp, and one priest hums an answer to the oud; 9–12 + the whole
// choir hums the chant, sliding through its runs, a lower octave under it; 13–16 + the arghul
// (the double reed pipe: melody over its own drone); 17–18 nothing new, only
// the ring, which the player overlaps with the next copy's start (no seam).
(() => {
  const BPM = 66, BEAT = 60 / BPM, BAR = BEAT * 4, E8 = BEAT / 2;
  const BARS = 16, TAIL = 2, SR = 44100;
  // Fractional MIDI: Hijaz's E♭ 15 cents high, its F♯ 15 cents low.
  const NOTE = { A1: 33, D2: 38, A2: 45, C3: 48, D3: 50, Eb3: 51.15, Fs3: 53.85, G3: 55, A3: 57, Bb3: 58, C4: 60, D4: 62, Eb4: 63.15, Fs4: 65.85, G4: 67, A4: 69, Bb4: 70, C5: 72, D5: 74 };
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const n = (x) => (typeof x === "number" ? x : NOTE[x]); // a name, or a MIDI number

  // Harp arpeggios, eighths, a four-bar cycle on D, E♭, Cm, D (Hijaz's own chords).
  const HARP = [
    ["D3", "A3", "D4", "Fs4", "A4", "Fs4", "D4", "A3"],
    ["Eb3", "Bb3", "Eb4", "G4", "Bb4", "G4", "Eb4", "Bb3"],
    ["C3", "G3", "C4", "Eb4", "G4", "Eb4", "C4", "G3"],
    ["D3", "A3", "D4", "Fs4", "G4", "A4", "D5", "A4"],
  ];
  // The oud's taqsim, bars 1–4: [beat, note, beats]; notes of two beats or more are tremolo.
  const TAQSIM = [[0, "D3", 1], [1, "Eb3", 0.5], [1.5, "Fs3", 0.5], [2, "G3", 2], [4, "A3", 1], [5, "G3", 0.5], [5.5, "Fs3", 0.5],
    [6, "Eb3", 1], [7, "D3", 1], [8, "A3", 0.5], [8.5, "Bb3", 0.5], [9, "A3", 0.5], [9.5, "G3", 0.5], [10, "Fs3", 1],
    [11, "G3", 0.5], [11.5, "Fs3", 0.5], [12, "Eb3", 0.5], [12.5, "D3", 3.5]];
  // The chant, bars 9–16, sliding through its runs: [beat, note, beats] from the phrase's start.
  const CHANT = [[0, "D3", 3], [3, "Eb3", 0.5], [3.5, "Fs3", 0.5], [4, "G3", 2], [6, "Fs3", 1], [7, "Eb3", 1], [8, "D3", 2],
    [10, "Fs3", 1], [11, "G3", 1], [12, "A3", 3], [15, "G3", 0.5], [15.5, "Fs3", 0.5],
    [16, "A3", 2], [18, "Bb3", 1], [19, "A3", 1], [20, "G3", 1], [21, "Fs3", 0.5], [21.5, "G3", 0.5], [22, "A3", 2],
    [24, "G3", 1], [25, "Fs3", 1], [26, "Eb3", 1.5], [27.5, "Fs3", 0.5], [28, "D3", 4]];
  // The arghul's melody, bars 13–16, with its turns and grace notes written out.
  const ARGHUL = [[0, "A4", 2], [2, "Bb4", 0.5], [2.5, "A4", 0.5], [3, "G4", 0.5], [3.5, "Fs4", 0.5], [4, "G4", 1], [5, "Fs4", 0.5],
    [5.5, "Eb4", 0.5], [6, "Fs4", 2], [8, "D4", 0.5], [8.5, "Eb4", 0.5], [9, "Fs4", 0.5], [9.5, "G4", 0.5], [10, "A4", 1.5],
    [11.5, "Bb4", 0.25], [11.75, "A4", 0.25], [12, "G4", 1], [13, "Fs4", 0.5], [13.5, "Eb4", 0.5], [14, "D4", 2]];
  // Baladi, eighths: D doum (deep), T tek (rim), . rest; the riq's jingles shake on every tek.
  const DRUM = "DD.TD.T.";
  // Vowels (male formants, Hz): the closed-mouth hum "mm" (almost all its energy low, the nose's
  // resonance near 1 kHz faint) and a half-open "oo" the chant leans toward on each new note.
  const MM = { f: [260, 1050, 2300], g: [1, 0.16, 0.04], top: 1500 }, OO = { f: [340, 750, 2400], g: [1, 0.4, 0.1], top: 2800 };
  // The lead hummer's answer to the oud, bars 5–8.
  const HUM = [[0, "A3", 3], [3, "G3", 1], [4, "Fs3", 2], [6, "Eb3", 1], [7, "Fs3", 1], [8, "G3", 2], [10, "Fs3", 1], [11, "Eb3", 1], [12, "D3", 4]];

  function mulberry32(a) {
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  window.renderKyphiMusic = async (seed = 7) => {
    const rand = mulberry32(seed);
    const len = (BARS + TAIL) * BAR, END = BARS * BAR;
    const ac = new OfflineAudioContext(2, Math.ceil(len * SR), SR);

    // Bus: gentle top (the sistrum lives up there), glue compressor, a long stone hall.
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.02; comp.release.value = 0.3;
    const top = ac.createBiquadFilter(); top.type = "lowpass"; top.frequency.value = 9000; top.Q.value = 0.5;
    const bus = ac.createGain(); bus.connect(top).connect(comp).connect(ac.destination);
    const hall = ac.createConvolver();
    const irLen = Math.floor(SR * 3.6), ir = ac.createBuffer(2, irLen, SR);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irLen; i++) d[i] = (rand() * 2 - 1) * (1 - i / irLen) ** 3; }
    hall.buffer = ir;
    const hallOut = ac.createGain(); hallOut.gain.value = 0.4; hall.connect(hallOut).connect(bus);
    const channel = (pan, gain, send) => {
      const g = ac.createGain(), p = ac.createStereoPanner(); g.gain.value = gain; p.pan.value = pan;
      g.connect(p).connect(bus);
      if (send) { const s = ac.createGain(); s.gain.value = send; p.connect(s).connect(hall); }
      return g;
    };
    const ch = {
      hum: channel(0, 1.1, 0.5), chant: channel(-0.1, 0.55, 0.6), harp: channel(-0.3, 0.45, 0.45), arghul: channel(0.25, 0.35, 0.55), oud: channel(-0.15, 0.4, 0.35), riq: channel(0.4, 0.4, 0.3),
      drum: channel(0.05, 0.7, 0.25), sistrum: channel(0.35, 0.7, 0.4), bell: channel(-0.2, 0.25, 0.7), fire: channel(0, 0.5, 0.1),
    };
    const noise = ac.createBuffer(1, SR * 2, SR); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; }
    const env = (g, t, peak, attack, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
    const burst = (out, t, dur, type, f, q, amp, attack = 0.002) => {
      const s = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noise; flt.type = type; flt.frequency.value = f; flt.Q.value = q;
      env(g, t, amp, attack, dur); s.connect(flt).connect(g).connect(out); s.start(t, rand() * 1.5); s.stop(t + dur + 0.02);
    };

    // Voices: a choir of sawtooths through three formant filters. Each singer drifts on their own: own
    // tuning, vibrato, glide and breaths taken at their own moments, so the hum never stops all at once.
    const voices = (out, t0, t1, steps, { count = 4, spread = 14, vowel = MM, open = null, level = 0.2, fadeIn = 1.5, fadeOut = 2 } = {}) => {
      const g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = vowel.top; lp.connect(g).connect(out);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(level, t0 + fadeIn);
      g.gain.setValueAtTime(level, t1 - fadeOut); g.gain.linearRampToValueAtTime(0.0001, t1);
      const forms = vowel.f.map((f, i) => {
        const bp = ac.createBiquadFilter(), fg = ac.createGain(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 5 + i * 2;
        fg.gain.value = vowel.g[i]; bp.connect(fg).connect(lp); return bp;
      });
      const src = ac.createGain(); src.gain.value = 1 / count; forms.forEach((bp) => src.connect(bp));
      for (let v = 0; v < count; v++) {
        const o = ac.createOscillator(), vg = ac.createGain(), lfo = ac.createOscillator(), vib = ac.createGain();
        o.type = "sawtooth"; o.detune.value = (v / Math.max(1, count - 1) - 0.5) * 2 * spread + (rand() - 0.5) * 6;
        lfo.frequency.value = 4.2 + rand() * 1.2; vib.gain.value = 5 + rand() * 5; lfo.connect(vib).connect(o.detune);
        const glide = 0.06 + rand() * 0.09;
        o.frequency.setValueAtTime(hz(n(steps[0][1])), t0);
        for (const [at, note] of steps) o.frequency.setTargetAtTime(hz(n(note)), at + rand() * 0.04, glide);
        vg.gain.setValueAtTime(1, t0);
        for (let at = t0 + 4 + rand() * 5; at < t1 - 2; at += 6 + rand() * 5) { // a breath
          vg.gain.setTargetAtTime(0.05, at, 0.08); vg.gain.setTargetAtTime(1, at + 0.45, 0.25);
        }
        o.connect(vg).connect(src);
        for (const x of [o, lfo]) { x.start(t0); x.stop(t1 + 0.05); }
      }
      // A chant line opens a little on each note's start and closes back to the hum while it holds.
      if (open) for (const at of open) forms.forEach((bp, i) => { bp.frequency.setTargetAtTime(open.f[i], at, 0.12); bp.frequency.setTargetAtTime(vowel.f[i], at + BEAT * 0.8, 0.4); });
    };

    // Plucked strings: Karplus–Strong, tuned with a first-order allpass for the fractional part of the period.
    const ksCache = new Map();
    const ks = (f, dur, damp) => {
      const key = `${f.toFixed(2)}:${dur}:${damp}`;
      if (ksCache.has(key)) return ksCache.get(key);
      const len = Math.ceil(SR * dur), out = ac.createBuffer(1, len, SR), y = out.getChannelData(0);
      const period = SR / f - 0.5, p = Math.floor(period), frac = period - p, C = (1 - frac) / (1 + frac);
      const line = new Float32Array(p);
      let lp = 0;
      for (let i = 0; i < p; i++) { lp += 0.5 * ((rand() * 2 - 1) - lp); line[i] = lp; } // a fingertip pluck: softened noise
      let idx = 0, apX = 0, apY = 0, prev = 0;
      for (let i = 0; i < len; i++) {
        const x = line[idx];
        const avg = damp * 0.5 * (x + prev); prev = x;
        const ap = C * avg + apX - C * apY; apX = avg; apY = ap;
        line[idx] = ap; y[i] = x; idx = (idx + 1) % p;
      }
      ksCache.set(key, out);
      return out;
    };
    // The angled harp: gut strings, a light wooden body, long ring.
    const harp = (t, note, amp) => {
      const s = ac.createBufferSource(), g = ac.createGain(), body = ac.createBiquadFilter(), soft = ac.createBiquadFilter();
      s.buffer = ks(hz(n(note)), 3, 0.998); body.type = "peaking"; body.frequency.value = 420; body.gain.value = 5; body.Q.value = 1;
      soft.type = "lowpass"; soft.frequency.value = 3200;
      g.gain.value = amp; s.connect(body).connect(soft).connect(g).connect(ch.harp); s.start(t);
    };

    // Oud: a fretless short-necked lute, a deep round body; long notes played as tremolo with the plectrum.
    const oud = (t, note, amp, beats = 1) => {
      const strike = (at, a) => {
        const s = ac.createBufferSource(), g = ac.createGain(), body = ac.createBiquadFilter(), soft = ac.createBiquadFilter();
        s.buffer = ks(hz(n(note)), 1.6, 0.996); body.type = "peaking"; body.frequency.value = 250; body.gain.value = 7; body.Q.value = 1;
        soft.type = "lowpass"; soft.frequency.value = 1800;
        g.gain.value = a; s.connect(body).connect(soft).connect(g).connect(ch.oud); s.start(at);
      };
      if (beats < 2) { strike(t, amp); return; }
      const step = BEAT / 6; // the risha's tremolo
      for (let k = 0; k * step < beats * BEAT - step; k++) strike(t + k * step + rand() * 0.006, amp * (k ? 0.5 + 0.15 * Math.sin(k) : 1) * (1 - 0.4 * k * step / (beats * BEAT)));
    };
    // Riq: the tambourine's small cymbals, a bright short shake.
    const riq = (t, a) => { burst(ch.riq, t, 0.06, "bandpass", 6500, 3, a, 0.001); burst(ch.riq, t + 0.012, 0.05, "bandpass", 8800, 4, 0.6 * a, 0.001); };

    // Frame drum: a deep skin, a softer stroke, a dry rim.
    const skin = (t, a) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.3);
      env(g, t, a, 0.004, 0.9); o.connect(g).connect(ch.drum); o.start(t); o.stop(t + 1);
      burst(ch.drum, t, 0.12, "lowpass", 500, 0.7, 0.35 * a);
    };
    const rim = (t, a) => burst(ch.drum, t, 0.08, "bandpass", 900, 2.5, 0.45 * a, 0.001);

    // Sistrum: metal discs rattling on their rods: a run of tiny hits, each ringing a little.
    const PARTIALS = [3100, 4370, 5830, 7210];
    const sistrum = (t, a, hits = 7) => {
      let at = t;
      for (let k = 0; k < hits; k++) {
        const amp = a * (1 - k / hits) ** 1.3;
        burst(ch.sistrum, at, 0.04, "bandpass", PARTIALS[Math.floor(rand() * PARTIALS.length)], 4, amp);
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = PARTIALS[k % PARTIALS.length] * (0.98 + rand() * 0.04);
        env(g, at, amp * 0.08, 0.001, 0.35); o.connect(g).connect(ch.sistrum); o.start(at); o.stop(at + 0.4);
        at += 0.016 + rand() * 0.012;
      }
    };
    // Finger cymbals: a few inharmonic partials, long ring into the hall.
    const cymbal = (t, a) => {
      for (const [f, d, amp] of [[2380, 2.4, 1], [3710, 1.8, 0.6], [5120, 1.2, 0.35], [6890, 0.8, 0.2]]) {
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f;
        env(g, t, a * amp * 0.12, 0.002, d); o.connect(g).connect(ch.bell); o.start(t); o.stop(t + d + 0.05);
      }
    };
    // Arghul: two cane pipes with single reeds, nasal and buzzing: the melody pipe over a drone pipe on D.
    const arghul = (t0, phrase) => {
      const reed = (f0, level) => {
        const o = ac.createOscillator(), g = ac.createGain(), nasal = ac.createBiquadFilter(), lp = ac.createBiquadFilter();
        o.type = "square"; o.frequency.setValueAtTime(f0, t0);
        nasal.type = "bandpass"; nasal.frequency.value = 1250; nasal.Q.value = 1.4; lp.type = "lowpass"; lp.frequency.value = 3500;
        o.connect(nasal).connect(lp).connect(g).connect(ch.arghul); g.gain.setValueAtTime(0, t0); g.gain.setTargetAtTime(level, t0, 0.08);
        return { o, g };
      };
      const lead = reed(hz(n(phrase[0][1])), 0.55), drone = reed(hz(n("D3")), 0.22);
      const lfo = ac.createOscillator(), vib = ac.createGain(); lfo.frequency.value = 5.5; vib.gain.value = 0; lfo.connect(vib).connect(lead.o.detune);
      let end = t0;
      for (const [beat, note, beats] of phrase) {
        const t = t0 + beat * BEAT, d = beats * BEAT;
        lead.o.frequency.setTargetAtTime(hz(n(note)), t, 0.018); // quick slides: the ornaments stay crisp
        lead.g.gain.setTargetAtTime(0.55, t, 0.02); lead.g.gain.setTargetAtTime(0.42, t + d * 0.7, 0.1);
        vib.gain.setValueAtTime(0, t); vib.gain.linearRampToValueAtTime(d > BEAT * 1.5 ? 14 : 0, t + d);
        end = t + d;
      }
      for (const v of [lead, drone]) { v.g.gain.setTargetAtTime(0, end - 0.1, 0.25); v.o.start(t0); v.o.stop(end + 1.5); }
      lfo.start(t0); lfo.stop(end + 1.5);
    };

    // The incense fire: a soft roar, crackles at random, and air moving like smoke.
    {
      const roar = ac.createBufferSource(), lp = ac.createBiquadFilter(), rg = ac.createGain();
      roar.buffer = noise; roar.loop = true; lp.type = "lowpass"; lp.frequency.value = 260; rg.gain.value = 0.35;
      roar.connect(lp).connect(rg).connect(ch.fire); roar.start(0); roar.stop(len);
      const air = ac.createBufferSource(), bp = ac.createBiquadFilter(), ag = ac.createGain(), sway = ac.createOscillator(), sg = ac.createGain();
      air.buffer = noise; air.loop = true; bp.type = "bandpass"; bp.frequency.value = 650; bp.Q.value = 0.8; ag.gain.value = 0.05;
      sway.frequency.value = 0.07; sg.gain.value = 0.035; sway.connect(sg).connect(ag.gain);
      air.connect(bp).connect(ag).connect(ch.fire); air.start(0); air.stop(len); sway.start(0); sway.stop(len);
      for (let t = rand() * 0.2; t < len; t += -Math.log(1 - rand()) / 5) {
        burst(ch.fire, t, 0.004 + rand() * 0.01, "highpass", 1800 + rand() * 2500, 0.7, 0.08 + rand() * 0.25, 0.0005);
      }
    }
    // The priests' hum, the whole piece: D and A, "oo", fading over the tail into the next copy's start.
    voices(ch.hum, 0, len, [[0, "D2"]], { count: 8, spread: 12, level: 0.5, fadeIn: BAR * 1.5, fadeOut: BAR * 2 });
    voices(ch.hum, 0, len, [[0, "A2"]], { count: 6, spread: 10, level: 0.28, fadeIn: BAR * 2, fadeOut: BAR * 2 });
    // One priest hums an answer to the oud, bars 5–8.
    const h0 = 4 * BAR;
    voices(ch.chant, h0, 8 * BAR + BEAT, HUM.map(([b, note]) => [h0 + b * BEAT, note]), { count: 2, spread: 6, level: 0.55, fadeIn: 0.8, fadeOut: BEAT * 2 });

    for (let b = 0; b < BARS; b++) {
      const t = b * BAR, bar1 = b + 1;
      // Sistrum: on 1 and 3 while the rite gathers, then on 2 and 4, with a double shake every other bar.
      if (bar1 <= 4) { sistrum(t, 0.7); sistrum(t + 2 * BEAT, 0.45, 5); skin(t, 0.55); } // a heartbeat while it gathers
      else { sistrum(t + BEAT, 0.55, 5); sistrum(t + 3 * BEAT, 0.7); if (bar1 % 2 === 0) sistrum(t + 3.5 * BEAT, 0.4, 4); }
      if (bar1 >= 5) {
        [...DRUM].forEach((s, i) => {
          const at = t + i * E8 + rand() * 0.008;
          if (s === "D") skin(at, i === 0 ? 0.95 : 0.75);
          else if (s === "T") { rim(at, 0.75); riq(at, 0.5); }
          else if (rand() < 0.5) riq(at, 0.18); // the riq's ghost shakes between
        });
        // Harp: quarters while it enters, then every eighth, softer on the off-beats.
        HARP[b % 4].forEach((note, i) => {
          if (bar1 <= 8 && i % 2) return;
          harp(t + i * E8 + rand() * 0.01, note, (i === 0 ? 0.8 : i % 2 ? 0.45 : 0.6) * (bar1 >= 13 ? 0.8 : 1));
        });
      }
      if (bar1 === 9 || bar1 === 13) cymbal(t, 1);
    }
    // The chant, bars 9–16: the whole choir hums it, leaning open on each note, with a lower octave under it.
    const c0 = 8 * BAR, cSteps = CHANT.map(([b, note]) => [c0 + b * BEAT, note]);
    const opens = Object.assign(CHANT.map(([b]) => c0 + b * BEAT), { f: OO.f });
    voices(ch.chant, c0, END + BEAT * 2, cSteps, { count: 8, spread: 16, level: 0.6, fadeIn: 0.6, fadeOut: BEAT * 2.5, open: opens });
    voices(ch.chant, c0, END + BEAT * 2, cSteps.map(([at, note]) => [at, n(note) - 12]), { count: 5, spread: 12, level: 0.35, fadeIn: 0.8, fadeOut: BEAT * 2.5 });
    TAQSIM.forEach(([b, note, beats]) => oud(b * BEAT + rand() * 0.01, note, 0.75, beats));
    arghul(12 * BAR, ARGHUL);
    // The end of the rite: one last shake, the cymbal and the harp's low D ringing into the tail.
    sistrum(END, 0.6); cymbal(END, 0.8); harp(END, "D3", 0.7);

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

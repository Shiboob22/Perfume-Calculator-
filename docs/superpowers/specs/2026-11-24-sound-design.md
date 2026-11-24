# Sound (approved 2026-11-24)

Why: blenders watch the bottle, not the phone; a quiet cue tells them the scale reached its target. Elsewhere sound marks a few outcomes.

- Setting: Off (default) / Soft / On, on the device (`kyphira.sound`), next to Motion in More and Account → Preferences.
- Cues, all synthesised with Web Audio (no files), in `src/lib/sound.js`: tare (tick), band (glass note, pour within 1 %), over (two low knocks), log (two-note chime + paper slide), note (pencil stroke), ready (three rising notes, Ready day), fail (one low tone).
- Rules: outcomes only, never taps, hovers, navigation, scroll or page load; none on the public site; every cue already has its words on screen; one sound at a time; nothing over ~1.6 s; silent when the tab is hidden and under Motion Off.
- Approaches considered: recorded files (weight, licensing), ambient site sound (WCAG 1.4.2, annoys at a shared bench). Picked synthesis, opt-in.
- Not built: haptics (D5 still open), the 3D pour keeps its own toggle.

## The kyphi band's music (owner, 2026-11-24, later the same day)

The owner asked for Egyptian ambient sound on the home page, so the "none on the public site" rule now has one exception, behind the `ambient` flag:

- A Listen / Stop button (`src/site/Ambient.jsx`, `data-ambient`) under the "Named for kyphi" band (which needs `imagery`). It never starts by itself (browsers forbid it; WCAG 1.4.2), is never remembered (every visit starts silent), is not offered under Motion Off, and pauses with the tab hidden.
- The music is a recording the owner chose: "Egyptian Desert" by hitslab, Pixabay ID 502005 (Pixabay Content License; the owner confirmed the source). Cut at 59.5 s before its own fade-out, 96 kbps AAC, `public/media/kyphi-desert.m4a`, 0.73 MB, fetched only on the first press (`src/site/templeSound.js`, own chunk); the service worker never precaches `/media`. It loops by crossfading two copies over 3 s, timed on the audio clock. Credit line under the button (not required by the licence).
- The press creates and resumes the AudioContext before anything loads (iOS allows audio only inside the gesture) and sets `navigator.audioSession.type = "playback"` (iOS 16.4+: the ringer switch does not mute it).
- Tried first and dropped on the owner's listening: a synthesised temple scene (drones, chant made from vowel formants, kyphi sounds: mortar, resin on coals, oil pouring). The dark first version read as horror; the warm one still sounded artificial next to a produced track.
- e2e `e2e/ambient.spec.js`: flag off, one press plays real sound (measured at the output) and a second stops, double press makes one context, Arabic label, Motion Off.

### Replaced by an original piece (owner, same day)

The owner asked for music like the Pixabay track that Kyphira can use without any licence. `scripts/kyphi-music/compose.js` is an original composition in that style (no melody, recording or sample taken from the track), rendered once in headless Chrome by `node scripts/make-kyphi-music.mjs [seed]` (Web Audio OfflineAudioContext, seeded random, then ffmpeg to 96 kbps AAC at -16 LUFS) into `public/media/kyphi-music.m4a` (0.76 MB). The reference was measured, not copied: 107 bpm, D minor with the B♭→A pull, weight in the sub-bass and low-mids, a sparse intro, a build, the full groove and a breakdown; the piece follows that shape. Instruments: oud riff and qanun runs (Karplus–Strong strings with allpass tuning), ney melody (breath, vibrato, glides), darbuka maqsum with ghost notes and rolls, a low drum on beats 1 and 3, bass, a detuned string pad; Dm–B♭–A–Dm. 26 bars of music and 2 bars of ring; the player overlaps the ring with the next copy's start every 26 bars, so the groove stays on the beat with no seam. The credit line now says the music was composed for Kyphira; the Pixabay file is no longer used (it stays in git history, under its own licence).

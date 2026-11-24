# Sound (approved 2026-11-24)

Why: blenders watch the bottle, not the phone; a quiet cue tells them the scale reached its target. Elsewhere sound marks a few outcomes.

- Setting: Off (default) / Soft / On, on the device (`kyphira.sound`), next to Motion in More and Account → Preferences.
- Cues, all synthesised with Web Audio (no files), in `src/lib/sound.js`: tare (tick), band (glass note, pour within 1 %), over (two low knocks), log (two-note chime + paper slide), note (pencil stroke), ready (three rising notes, Ready day), fail (one low tone).
- Rules: outcomes only, never taps, hovers, navigation, scroll or page load; none on the public site; every cue already has its words on screen; one sound at a time; nothing over ~1.6 s; silent when the tab is hidden and under Motion Off.
- Approaches considered: recorded files (weight, licensing), ambient site sound (WCAG 1.4.2, annoys at a shared bench). Picked synthesis, opt-in.
- Not built: haptics (D5 still open), the 3D pour keeps its own toggle.

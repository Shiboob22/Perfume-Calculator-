// Paper and surfaces (Bench SaaS Phase 6, the prototype's surfaces()): a fine
// SVG-noise grain on cards (--kx-grain), a soft bench-top texture behind the
// app (--kx-benchtop) and an ink-printed rule under the main headings
// (--kx-rule). Faint on purpose; dark mode uses a lighter, sparser grain so it
// doesn't go muddy. Never on the scale display (an instrument, not paper).
// Pure: returns CSS text, which the app shell puts in one <style>.

const uri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Fractal noise in one grey (rgb 0 = black, 1 = white) at alpha `a`. */
export function grain(rgb, a, freq, size) {
  return uri(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${rgb} 0 0 0 0 ${rgb} 0 0 0 0 ${rgb} 0 0 0 ${a} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`);
}

/** A hand-inked rule, two strokes slightly off true. */
export function inkRule(ink) {
  return uri(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='4' viewBox='0 0 240 4'><path d='M0 2.1C20 1.6 40 2.5 60 2S100 1.5 120 2.2 160 2.6 180 1.9 220 1.6 240 2.1' fill='none' stroke='${ink}' stroke-width='1.1'/><path d='M0 2.6C30 2.2 50 3 80 2.5S140 2.1 170 2.8 220 2.3 240 2.6' fill='none' stroke='${ink}' stroke-opacity='.35' stroke-width='.5'/></svg>`);
}

/** The three custom properties for a theme. */
export function surfaces(theme) {
  const dark = theme === "dark";
  return {
    "--kx-grain": dark ? grain(1, 0.035, 0.85, 180) : grain(0, 0.07, 0.85, 180),
    "--kx-rule": inkRule(dark ? "#EADFCE" : "#1B1814"),
    "--kx-benchtop": dark
      ? `radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,.04), transparent 70%), ${grain(1, 0.03, 0.55, 260)}`
      : `radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,.45), transparent 70%), ${grain(0, 0.05, 0.55, 260)}`,
  };
}

const block = (sel, vars) => `${sel}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;

/** The stylesheet: light by default, dark by the system or the toggle (same selectors as the palette). */
export function surfaceCss() {
  const d = surfaces("dark");
  return [
    block(":root", surfaces("light")),
    `@media (prefers-color-scheme: dark){${block(':root:not([data-theme="light"])', d)}}`,
    block(':root[data-theme="dark"]', d),
  ].join("\n");
}

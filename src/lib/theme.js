// Shared visual identity — Kyphira (Scent Ledger v3 base): paper, ink and one warm oil
// accent, with a dark edition (the former "Atelier Noir" ground) behind a
// toggle. Colours live in two palettes; the page reads them as CSS custom
// properties (generated from PALETTES by tailwind.config.js), so COLORS below
// holds var() references and every component re-colours with the theme.
// Canvas code can't read CSS variables: use PALETTES.light / .dark directly.
//
// Roles: `amber` is the primary action (forest on paper, amber on the dark
// ground) and `onAmber` the text on it; `oil` is the one decorative accent
// (fills only — `brass` is its text-safe shade). The legacy keys (forest /
// forestDeep / brass) stay as aliases so older references still resolve.
const light = {
  paper: "#F6F2EA",      // page
  ink1: "#EEE8DC",       // alternate band (sand)
  card: "#FBF8F2",       // card surface
  cardHi: "#FFFDF8",     // inputs, raised surface
  sand: "#EEE8DC",       // secondary surfaces, hover

  ink: "#100E0A",        // text, frames
  inkSoft: "#3A352D",    // body
  dim: "#5A544A",        // labels (≥4.5:1 on paper, card and sand)

  amber: "#1F4A36",      // primary action (forest)
  amberDeep: "#7A581B",  // oil, text-safe (≥4.5:1 on paper)
  ember: "#7A581B",
  onAmber: "#F6F2EA",    // text on the action fill
  actionHover: "#163828",

  oil: "#C99A45",        // the single accent (fills: liquid, bars)
  mist: "#E4EBE5",       // ethanol
  inkBand: "#100E0A",    // ink surfaces (footer, Pro panel)
  onInk: "#F6F2EA",

  line: "#D9D1C2",       // hairlines (decorative)
  field: "#8C8475",      // form-control borders (≥3:1, WCAG 1.4.11)
  focus: "#1F4A36",
  hair: "rgba(16,14,10,0.10)",

  danger: "#9B2C1F",
  dangerBg: "#FBF1EE",
  dangerLine: "#E5C9C1",

  forest: "#1F4A36",
  forestDeep: "#100E0A",
  brass: "#7A581B",
};

const dark = {
  paper: "#100E0A",
  ink1: "#15120C",
  card: "#1A150D",
  cardHi: "#221B10",
  sand: "#221B10",

  ink: "#F0E8D7",
  inkSoft: "#A79C82",
  dim: "#918568",

  amber: "#E9C88A",
  amberDeep: "#C9A15A",
  ember: "#A5673A",
  onAmber: "#201400",
  actionHover: "#F5DDAE",

  oil: "#C9A15A",
  mist: "#3A4A42",
  inkBand: "#070605",
  onInk: "#F0E8D7",

  line: "#2A2113",
  field: "#7A7058",
  focus: "#E9C88A",
  hair: "rgba(233,200,138,0.14)",

  danger: "#D98A6A",
  dangerBg: "#2A140E",
  dangerLine: "#5A2A1C",

  forest: "#E9C88A",
  forestDeep: "#F5EEDD",
  brass: "#C9A15A",
};

export const PALETTES = { light, dark };

/** CSS custom-property name for a colour key: inkSoft → --c-ink-soft. */
export const cssVar = (key) => `--c-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;

/** { "--c-paper": "#F6F2EA", … } for one palette (used by tailwind.config.js). */
export const paletteVars = (palette) =>
  Object.fromEntries(Object.entries(palette).map(([k, v]) => [cssVar(k), v]));

export const COLORS = Object.fromEntries(Object.keys(light).map((k) => [k, `var(${cssVar(k)})`]));

// Corner radius by role. v3 is square: frames and buttons have no radius.
export const SHAPE = {
  control: "rounded-none",
  panel: "rounded-none",
  row: "",
  danger: "rounded-none",
};

// The editorial system: class strings, so prerendered HTML carries them.
export const TYPE = {
  display: "font-sans font-medium tracking-[-0.04em] leading-[0.98] rtl:leading-[1.3] text-[clamp(2.75rem,7.5vw,6.5rem)]",
  title: "font-sans font-medium tracking-[-0.03em] leading-tight rtl:leading-[1.3] text-[clamp(2rem,4.5vw,3.25rem)]",
  lead: "font-serif text-lg sm:text-xl leading-relaxed",
  runningHead: "running-head text-[11px] font-sans uppercase",
  label: "text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal",
  numeral: "font-serif italic leading-none",
  voice: "font-serif italic",
};

// Motion, in ms. 180 for hover/colour, 480 for fills and bars. Every
// animation also stops under prefers-reduced-motion (src/index.css).
export const MOTION = { fast: 180, base: 320, slow: 480, ease: "cubic-bezier(.2,0,0,1)" };

// Frames: 1px ink for primary objects; the offset paper shadow only on the
// hero bench and the recipe card.
export const FRAME = { border: `1px solid ${COLORS.ink}` };
export const OFFSET_SHADOW = `8px 8px 0 ${COLORS.sand}`;

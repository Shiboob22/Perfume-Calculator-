// Shared visual identity — Kyphira (Scent Ledger v3 base): paper, ink and one warm oil
// accent, with a dark edition (the former "Atelier Noir" ground) behind a
// toggle. Colours live in two palettes; the page reads them as CSS custom
// properties (generated from PALETTES by tailwind.config.js), so COLORS below
// holds var() references and every component re-colours with the theme.
// Canvas code can't read CSS variables: use PALETTES.light / .dark directly.
//
// Roles: one accent, resin amber (design brief 2026-10-16). `amber` is the
// primary action's fill and `onAmber` the text on it; `actionText` is the
// accent wherever it is type, a border or a focus ring (the fill itself is too
// light for text on paper). `oil` is the liquid in drawings; verdigris marks
// "rested / ready", ember warnings. The legacy keys (forest / forestDeep /
// brass) stay as aliases so older references still resolve.
const light = {
  paper: "#F4F1EA",      // page (bone)
  ink1: "#EBE6DA",       // alternate band (sand)
  card: "#FBF9F4",       // card surface
  cardHi: "#FFFDF9",     // inputs, raised surface
  sand: "#EBE6DA",       // secondary surfaces, hover

  ink: "#1B1814",        // text, frames (graphite)
  inkSoft: "#3A352D",    // body
  dim: "#5A544A",        // labels (≥4.5:1 on paper, card and sand)

  amber: "#B8893A",      // primary action fill (brass pan)
  actionText: "#7A581B", // the accent as type, borders, focus (≥4.5:1 on paper)
  amberDeep: "#7A581B",  // oil, text-safe (≥4.5:1 on paper)
  ember: "#B3361A",        // warnings, incl. the ethanol notice
  onAmber: "#1B1814",    // text on the action fill (graphite on brass)
  actionHover: "#A57A2E",

  oil: "#B8893A",        // the single accent (fills: liquid, bars)
  mist: "#E4EBE5",       // ethanol
  inkBand: "#1B1814",    // ink surfaces (footer, Pro panel)
  onInk: "#F4F1EA",

  line: "#D9D3C5",       // hairlines (decorative)
  field: "#827A6B",      // form-control borders (≥3:1, WCAG 1.4.11)
  focus: "#7A581B",
  hair: "rgba(27,24,20,0.10)",

  danger: "#9B2C1F",
  dangerBg: "#FBF1EE",
  dangerLine: "#E5C9C1",

  // Kyphira accents. Plain names are fills and marks; the *Text names are the
  // shades safe for type (≥4.5:1 on paper, card and sand).
  resin: "#B8893A",        // brass: the brand accent
  resinText: "#7A581B",
  myrrh: "#8C3B2A",        // secondary accent, used sparingly
  myrrhText: "#8C3B2A",
  verdigris: "#2F6F62",    // a stable reading, rested / ready (copper patina)
  verdigrisText: "#2F6F62",

  forest: "#7A581B",     // legacy alias: the accent as type
  forestDeep: "#1B1814",
  brass: "#7A581B",
};

const dark = {
  paper: "#14110E",      // ground (soot)
  ink1: "#1C1713",       // surface 1: raised
  card: "#1C1713",
  cardHi: "#26201A",     // surface 2: cards, inputs
  sand: "#26201A",

  ink: "#EADFCE",        // text (haze)
  inkSoft: "#A89B8B",    // muted (ash)
  dim: "#A89B8B",

  amber: "#D4924A",      // ember: primary action
  actionText: "#D4924A",
  amberDeep: "#C9A15A",
  ember: "#E26A4F",      // warnings, incl. the ethanol notice
  onAmber: "#100E0A",
  actionHover: "#E3A866",

  oil: "#D4924A",
  mist: "#3A4A42",
  inkBand: "#0D0B09",
  onInk: "#EADFCE",

  line: "#3B332B",
  field: "#857A60",
  focus: "#D4924A",
  hair: "rgba(234,223,206,0.12)",

  danger: "#E07A62",
  dangerBg: "#2A140E",
  dangerLine: "#5A2A1C",

  resin: "#D4924A",
  resinText: "#D4924A",
  myrrh: "#5A3A22",
  myrrhText: "#D98A6A",
  verdigris: "#5E8C7A",
  verdigrisText: "#9DB38A",

  forest: "#D4924A",
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

// Corner radius by role. Kyphira board: 2 px everywhere (Tailwind `rounded`).
export const SHAPE = {
  control: "rounded",
  panel: "rounded",
  row: "",
  danger: "rounded",
};

// The editorial system: class strings, so prerendered HTML carries them.
export const TYPE = {
  display: "ar-display font-serif font-normal tracking-[-0.03em] leading-[1.02] rtl:leading-[1.5] text-[clamp(2.75rem,7.5vw,6.5rem)]",
  title: "ar-display font-serif font-normal tracking-[-0.02em] leading-tight rtl:leading-[1.3] text-[clamp(2rem,4.5vw,3.25rem)]",
  lead: "font-serif text-lg sm:text-xl leading-relaxed",
  runningHead: "running-head text-[11px] font-sans uppercase",
  label: "text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal",
  numeral: "ar-display font-serif italic leading-none",
  voice: "font-serif italic",
};

// Motion tokens from the Kyphira board, in ms: fast (hover, focus, chip, press),
// base (tabs, menus, stepper value, scale fills), slow (modals, room changes,
// headline reveals); ambient is 2 s and up (light, smoke, ember breath).
// Two eases: out for anything arriving, in-out for a state changing in place.
// The same numbers are CSS variables in src/index.css. Every animation also
// stops under prefers-reduced-motion.
export const MOTION = { fast: 150, base: 250, slow: 600, ambient: 2000, easeOut: "cubic-bezier(.22,1,.36,1)", easeInOut: "cubic-bezier(.65,0,.35,1)" };

// Frames: 1px ink for primary objects; the offset paper shadow only on the
// hero bench and the recipe card.
export const FRAME = { border: `1px solid ${COLORS.ink}` };
// Light edition only: the board's dark edition has no shadows on UI.
export const OFFSET_SHADOW = "var(--offset-shadow)";

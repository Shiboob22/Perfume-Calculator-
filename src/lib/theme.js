// Shared visual identity across the whole app — "Atelier Noir": a dark,
// gallery/luxe skin. One amber accent glows on a warm near-black ground.
// The legacy keys (forest / forestDeep / brass) are kept as aliases so
// components that still reference them re-colour automatically instead of
// breaking — forest now IS the amber action colour, etc.
export const COLORS = {
  // grounds
  paper: "#100E0A",      // page background
  ink1: "#15120C",       // alternate section band
  card: "#1A150D",       // card surface
  cardHi: "#221B10",     // raised surface / inputs

  // text
  ink: "#F0E8D7",        // primary text (ivory)
  inkSoft: "#A79C82",    // muted text
  dim: "#6E654F",        // faint captions

  // accent (amber)
  amber: "#E9C88A",
  amberDeep: "#C9A15A",
  ember: "#A5673A",
  onAmber: "#201400",    // text on an amber fill

  // structure
  line: "#2A2113",       // borders
  hair: "rgba(233,200,138,0.14)",

  danger: "#D98A6A",
  dangerBg: "#2A140E",

  // legacy aliases — keep so untouched refs still resolve to the new palette
  forest: "#E9C88A",     // primary action → amber
  forestDeep: "#F5EEDD", // headings → bright ivory
  brass: "#C9A15A",      // → amberDeep
};

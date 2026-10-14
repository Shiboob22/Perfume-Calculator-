// Notes as light: a fragrance's notes as three bands, top bright and thin,
// heart warm, base deep and wide. Pure geometry and data; the SVG is drawn
// by components/atlas/Pyramid.jsx. The notes are always also real text.

// Relative height and width (percent of the figure) and opacity per layer.
export const BAND_GEOMETRY = {
  top: { height: 22, width: 46, opacity: 0.95 },
  heart: { height: 32, width: 70, opacity: 0.8 },
  base: { height: 46, width: 100, opacity: 0.65 },
};

// A null in a list must not become a note called "null".
const clean = (list) => [...new Set((Array.isArray(list) ? list : []).filter((n) => n != null).map((n) => String(n).trim()).filter(Boolean))];

/** The non-empty layers of a fragrance, top first: [{ layer, notes }]. */
export function pyramidBands(f) {
  const layers = [["top", f?.top_notes], ["heart", f?.middle_notes], ["base", f?.base_notes]];
  return layers.map(([layer, notes]) => ({ layer, notes: clean(notes) })).filter((b) => b.notes.length > 0);
}

/** Bands with their geometry, stacked from the top (y and height in percent of 100). */
export function layout(bands) {
  const total = bands.reduce((s, b) => s + BAND_GEOMETRY[b.layer].height, 0) || 1;
  let y = 0;
  return bands.map((b) => {
    const g = BAND_GEOMETRY[b.layer];
    const height = (g.height / total) * 100;
    const out = { ...b, y, height, width: g.width, opacity: g.opacity };
    y += height;
    return out;
  });
}

/** A fragrance with notes but no pyramid (only an undivided list) is shown as a plain list. */
export const hasPyramid = (f) => pyramidBands(f).length > 0;

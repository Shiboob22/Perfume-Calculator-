import { describe, expect, it } from "vitest";
import { COLORS, PALETTES, cssVar } from "./theme.js";

// WCAG relative luminance and contrast ratio, for hex colours.
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

describe("theme", () => {
  it("both palettes define the same colour keys", () => {
    expect(Object.keys(PALETTES.dark).sort()).toEqual(Object.keys(PALETTES.light).sort());
  });

  it("COLORS point at CSS variables", () => {
    expect(cssVar("inkSoft")).toBe("--c-ink-soft");
    expect(COLORS.paper).toBe("var(--c-paper)");
  });

  for (const [name, p] of Object.entries(PALETTES)) {
    it(`${name}: text ≥4.5:1, form borders ≥3:1 on every ground`, () => {
      for (const ground of [p.paper, p.card, p.sand]) {
        for (const text of [p.ink, p.inkSoft, p.dim, p.amber, p.brass, p.danger]) expect(ratio(text, ground)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(p.field, ground)).toBeGreaterThanOrEqual(3);
      }
      expect(ratio(p.onAmber, p.amber)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.onInk, p.inkBand)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.danger, p.dangerBg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

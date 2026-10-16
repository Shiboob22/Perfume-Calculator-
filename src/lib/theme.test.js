import { describe, expect, it } from "vitest";
import { COLORS, PALETTES, cssVar } from "./theme.js";
import { contrastRatio } from "./contrast.js";

const ratio = contrastRatio;

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
        for (const text of [p.ink, p.inkSoft, p.dim, p.actionText, p.forest, p.brass, p.danger, p.ember, p.resinText, p.myrrhText, p.verdigrisText]) expect(ratio(text, ground)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(p.field, ground)).toBeGreaterThanOrEqual(3);
      }
      expect(ratio(p.onAmber, p.amber)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.onAmber, p.actionHover)).toBeGreaterThanOrEqual(4.5);
      // Focus rings are non-text: ≥3:1 against every ground (WCAG 1.4.11).
      for (const ground of [p.paper, p.card, p.sand]) expect(ratio(p.focus, ground)).toBeGreaterThanOrEqual(3);
      expect(ratio(p.onInk, p.inkBand)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.danger, p.dangerBg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

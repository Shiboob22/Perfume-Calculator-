import { describe, expect, it } from "vitest";
import { contrastRatio } from "../contrast.js";
import { STAGES, STAGE_LIGHT, stageAt } from "./config.js";
import { SCALE_FULL_G, STAGE_SHOWN_GRAMS, gramsAt } from "./scale.js";
import { KYPHI_INGREDIENTS, roman } from "../../content/kyphi.js";
import en from "../../i18n/messages/en.js";
import { FLAGS } from "../flags.js";

describe("stages", () => {
  it("are six, contiguous, and cover 0 to 1", () => {
    expect(STAGES).toHaveLength(6);
    expect(STAGES[0].from).toBe(0);
    expect(STAGES.at(-1).to).toBe(1);
    STAGES.slice(1).forEach((s, i) => expect(s.from).toBe(STAGES[i].to));
  });
  it("find the stage for a progress value, clamped", () => {
    expect(stageAt(-1).id).toBe("afternoon");
    expect(stageAt(0.5).id).toBe("pour");
    expect(stageAt(0.99).id).toBe("handoff");
    expect(stageAt(2).id).toBe("handoff");
  });
});

describe("light", () => {
  it("keeps WCAG AA for text and accent on every stage ground", () => {
    for (const [id, l] of Object.entries(STAGE_LIGHT)) {
      expect(contrastRatio(l.ink, l.bg), `${id} ink`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(l.dim, l.bg), `${id} dim`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(l.accent, l.bg), `${id} accent`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("scale", () => {
  it("is full at the worked example: 100 mL at 25% weighs 84.50 g", () => {
    expect(SCALE_FULL_G).toBeCloseTo(84.5, 2);
    expect(gramsAt(1)).toBeCloseTo(84.5, 2);
    expect(gramsAt(0)).toBe(0);
    expect(gramsAt(9)).toBeCloseTo(84.5, 2);
    expect(STAGE_SHOWN_GRAMS.handoff).toBeCloseTo(84.5, 2);
    expect(STAGE_SHOWN_GRAMS.afternoon).toBe(0);
  });
});

describe("the sixteen", () => {
  it("are sixteen, unique, each with an English and an Arabic name", () => {
    expect(KYPHI_INGREDIENTS).toHaveLength(16);
    expect(new Set(KYPHI_INGREDIENTS.map((i) => i.id)).size).toBe(16);
    for (const i of KYPHI_INGREDIENTS) { expect(i.en).toBeTruthy(); expect(i.ar).toMatch(/[؀-ۿ]/); }
  });
  it("number I to XVI", () => {
    expect(roman(1)).toBe("I");
    expect(roman(9)).toBe("IX");
    expect(roman(14)).toBe("XIV");
    expect(roman(16)).toBe("XVI");
  });
});

describe("copy and flag", () => {
  it("has the compounding flag and avoids the banned words", () => {
    expect(FLAGS).toContain("compounding");
    const text = JSON.stringify(en.site.compounding).toLowerCase();
    for (const w of ["revolutionary", "ultimate", "unlock", "elevate"]) expect(text).not.toContain(w);
  });
});

import { describe, expect, it } from "vitest";
import { contrastRatio } from "../contrast.js";
import { readFileSync } from "node:fs";
import { MOTION_SCENE, STAGES, STAGE_LIGHT, stageAt } from "./config.js";
import { rangeStyle, sceneVars } from "../../site/compounding/motion.jsx";
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

describe("motion", () => {
  const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");
  const { ranges, stagger, distance } = MOTION_SCENE;

  it("keeps every range inside its own timeline, staggers included", () => {
    for (const [name, [a, b]] of Object.entries(ranges)) {
      expect(a, name).toBeGreaterThanOrEqual(0);
      expect(b, name).toBeGreaterThan(a);
      const last = { plate: 3, grain: 15, merge: 15, smoke: 3, wisp: 5 }[name] ?? 0; // index of the last mark in its group
      const s = (stagger[name] || 0) * last;
      expect(b + s, `${name} with stagger`).toBeLessThanOrEqual(1.0001);
    }
  });
  it("gives every range a keyframe set the stylesheet defines, and every distance a use", () => {
    for (const name of Object.keys(ranges)) {
      expect(css, `.m-${name}`).toContain(`.m-${name} {`);
      expect(css, `@keyframes cmp-${name}`).toMatch(new RegExp(`@keyframes cmp-${name}\\b`));
    }
    for (const name of Object.keys(distance)) expect(css, `--m-${name}`).toContain(`var(--m-${name})`);
  });
  it("animates only transform and opacity (the scale's counter is the one number)", () => {
    const frames = [...css.matchAll(/@keyframes cmp-([a-z]+) \{([^@]*?)\}\s*(?=@keyframes|\n\n|\/\*)/g)];
    expect(frames.length).toBeGreaterThan(10);
    for (const [, name, body] of frames) {
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]).filter((p) => !p.startsWith("-"));
      for (const p of props) expect(["opacity", "transform", "--cg"], `${name}: ${p}`).toContain(p);
    }
  });
  it("sets the range and the constants the CSS reads", () => {
    expect(rangeStyle("plate", 2)).toEqual({ "--a": 0.07, "--b": 0.37 });
    expect(sceneVars()["--m-plate"]).toBe("28px");
    expect(sceneVars()["--m-ease"]).toBe(MOTION_SCENE.ease);
  });
  it("leaves the first stage's words alone, so the largest paint never fades or moves", () => {
    const src = readFileSync(new URL("../../site/compounding/Compounding.jsx", import.meta.url), "utf8");
    const afternoon = src.slice(src.indexOf('<Stage id="afternoon"'), src.indexOf("{/* II"));
    expect(afternoon).not.toMatch(/kf="(drift|plate|wisp)"/);
  });
});

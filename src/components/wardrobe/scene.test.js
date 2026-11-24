import { describe, it, expect } from "vitest";
import { makeCtx } from "../../motion/gsap/scene.js";
import { stubGsap, assertSceneRules } from "../../motion/gsap/testing.js";
import { answerWords } from "./scene.js";

const els = (n) => Array.from({ length: n }, (_, i) => ({ i }));

describe("answerWords", () => {
  it("tweens the first 14 and shows the other 6 at once", () => {
    const s = stubGsap();
    const w = els(20);
    answerWords(makeCtx(s, {}, 1), w);
    expect(s.calls).toHaveLength(2);
    const [tween, set] = s.calls;
    expect(tween.targets).toEqual(w.slice(0, 14));
    expect(tween.from).toEqual({ y: 8, opacity: 0 });
    expect(tween.vars.duration).toBe(0.6);
    expect(tween.vars.stagger).toBe(0.04);
    expect(set.fn).toBe("set");
    expect(set.targets).toEqual(w.slice(14));
    expect(set.vars).toEqual({ y: 0, opacity: 1 });
    assertSceneRules(s.calls);
  });
  it("moves y only, in rtl too", () => {
    const s = stubGsap();
    answerWords(makeCtx(s, {}, -1), els(3));
    expect(s.calls).toHaveLength(1);
    expect(Object.keys(s.calls[0].from).sort()).toEqual(["opacity", "y"]);
    expect(s.calls[0].vars).not.toHaveProperty("x");
    assertSceneRules(s.calls);
  });
  it("does nothing without words", () => {
    const s = stubGsap();
    answerWords(makeCtx(s, {}, 1), []);
    expect(s.calls).toHaveLength(0);
  });
});

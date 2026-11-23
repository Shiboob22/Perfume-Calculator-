import { describe, it, expect } from "vitest";
import { makeCtx } from "../../motion/gsap/scene.js";
import { stubGsap, assertSceneRules } from "../../motion/gsap/testing.js";
import { noteSaved } from "./scene.js";

describe("noteSaved", () => {
  it("scales the dot 0 to 1 over slow, kx.out, and nothing else", () => {
    const s = stubGsap();
    noteSaved(makeCtx(s, {}, 1), {});
    expect(s.calls).toHaveLength(1);
    const c = s.calls[0];
    expect(c.from).toEqual({ scale: 0 });
    expect(Object.keys(c.vars).sort()).toEqual(["duration", "ease", "scale"]);
    expect(c.vars.duration).toBe(0.6);
    assertSceneRules(s.calls);
  });
  it("does nothing without a dot", () => {
    const s = stubGsap();
    noteSaved(makeCtx(s, {}, 1), null);
    expect(s.calls).toHaveLength(0);
  });
});

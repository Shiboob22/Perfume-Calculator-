import { describe, it, expect } from "vitest";
import { makeCtx } from "../../motion/gsap/scene.js";
import { stubGsap, assertSceneRules } from "../../motion/gsap/testing.js";
import { resultsIn } from "./scene.js";

const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));
const run = (list) => {
  const s = stubGsap();
  const pos = [];
  const timeline = s.gsap.timeline;
  s.gsap.timeline = (...a) => { const t = timeline(...a); const f = t.fromTo; t.fromTo = (x, y, z, p) => { pos.push(p); (s.from ??= []).push(y); (s.to ??= []).push(z); return f(x, y, z); }; return t; };
  resultsIn(makeCtx(s, {}, 1), list);
  s.pos = pos;
  return s;
};

describe("resultsIn", () => {
  it("rises y 8 to 0 and fades in, slow, in rank order, within the scene rules", () => {
    const list = rows(3);
    const s = run(list);
    const tos = s.calls.filter((c) => c.fn === "tl.fromTo");
    expect(tos.map((c) => c.targets)).toEqual(list);
    expect(s.from[0]).toEqual({ y: 8, opacity: 0 });
    expect(s.pos).toEqual([0, 0.06, 0.12]);
    expect(s.to[0]).toMatchObject({ y: 0, opacity: 1, duration: 0.6, ease: "kx.out" });
    assertSceneRules(s.calls);
  });
  it("12 rows use at most 8 stagger steps", () => {
    const s = run(rows(12));
    expect(s.calls.filter((c) => c.fn === "tl.fromTo")).toHaveLength(12);
    expect(new Set(s.pos.map((p) => Math.round(p * 1000))).size).toBe(8);
    expect(s.pos.slice(7).every((p) => Math.round(p * 1000) === 420)).toBe(true);
  });
  it("does nothing with no ctx or no rows", () => {
    expect(() => resultsIn(null, rows(2))).not.toThrow();
    expect(run([]).calls).toHaveLength(0);
  });
});

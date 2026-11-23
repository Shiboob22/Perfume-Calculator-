import { describe, it, expect, afterEach } from "vitest";
import { makeCtx } from "../../motion/gsap/scene.js";
import { stubGsap, assertSceneRules } from "../../motion/gsap/testing.js";
import { pagesIn } from "./scene.js";

const page = (top, classes = ["mo-item"]) => {
  const set = new Set(classes);
  return { dataset: {}, getBoundingClientRect: () => ({ top }), classList: { contains: (c) => set.has(c), remove: (c) => set.delete(c), add: (c) => set.add(c) }, set };
};
const root = (pages) => ({ querySelectorAll: () => pages });
const run = (pages, dir = 1) => {
  const s = stubGsap();
  const ctx = makeCtx(s, root(pages), dir);
  const cleanup = pagesIn(ctx);
  return { s, cleanup };
};
afterEach(() => { delete globalThis.innerHeight; });

describe("pagesIn", () => {
  it("rotates 0.6 degrees (mirrored in RTL), batches once, obeys the scene rules", () => {
    globalThis.innerHeight = 700;
    const a = page(900), b = page(1000);
    let { s } = run([a, b], 1);
    expect(s.calls[0].vars).toMatchObject({ y: 16, rotation: 0.6, opacity: 0 });
    expect(run([a, b], -1).s.calls[0].vars.rotation).toBe(-0.6);
    const batch = s.calls.find((c) => c.fn === "ScrollTrigger.batch");
    expect(batch.vars.once).toBe(true);
    batch.vars.onEnter([a, b]);
    const to = s.calls.find((c) => c.fn === "to");
    expect(to.vars).toMatchObject({ y: 0, rotation: 0, opacity: 1, duration: 0.6, stagger: 0.06 });
    assertSceneRules(s.calls);
  });
  it("leaves pages on the first screen alone", () => {
    globalThis.innerHeight = 700;
    const first = page(100), later = page(900);
    const { s } = run([first, later]);
    expect(s.calls[0].targets).toEqual([later]);
    expect(run([page(100)]).s.calls).toHaveLength(0);
  });
  it("drops the CSS entrance class on pages it animates and restores it on revert", () => {
    globalThis.innerHeight = 700;
    const first = page(100), later = page(900);
    const { cleanup } = run([first, later]);
    expect(later.set.has("mo-item")).toBe(false);
    expect(first.set.has("mo-item")).toBe(true);
    cleanup();
    expect(later.set.has("mo-item")).toBe(true);
  });
  it("does not re-add the class to a page that already entered, and skips it on a second run", () => {
    globalThis.innerHeight = 700;
    const entered = page(900), waiting = page(1000);
    const { s, cleanup } = run([entered, waiting]);
    s.calls.find((c) => c.fn === "ScrollTrigger.batch").vars.onEnter([entered]);
    cleanup();
    expect(entered.set.has("mo-item")).toBe(false);
    expect(waiting.set.has("mo-item")).toBe(true);
    expect(run([entered]).s.calls).toHaveLength(0);
  });
});

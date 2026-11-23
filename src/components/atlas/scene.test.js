import { describe, it, expect, afterEach } from "vitest";
import { makeCtx } from "../../motion/gsap/scene.js";
import { stubGsap, assertSceneRules } from "../../motion/gsap/testing.js";
import { pyramidDraw } from "./scene.js";

const band = (top) => ({ getBoundingClientRect: () => ({ top }) });
const run = (bands, dir = 1) => { const s = stubGsap(); pyramidDraw(makeCtx(s, {}, dir), bands); return s; };
afterEach(() => { delete globalThis.innerHeight; });

describe("pyramidDraw", () => {
  it("scales x 0 to 1 once, never tweens width, obeys the scene rules", () => {
    globalThis.innerHeight = 700;
    const s = run([band(900), band(1000), band(1100)]);
    expect(s.calls).toHaveLength(1);
    const c = s.calls[0];
    expect(c.from.scaleX).toBe(0);
    expect(c.vars.scaleX).toBe(1);
    expect(JSON.stringify(c)).not.toMatch(/width/);
    expect(c.vars.scrollTrigger).toMatchObject({ once: true, start: "top 88%" });
    expect(c.vars.stagger).toBe(0.06);
    expect(c.vars.duration).toBe(0.6);
    assertSceneRules(s.calls);
  });
  it("grows from the right in RTL, the left otherwise", () => {
    globalThis.innerHeight = 700;
    expect(run([band(900)], -1).calls[0].vars.transformOrigin.endsWith("right")).toBe(true);
    expect(run([band(900)], 1).calls[0].vars.transformOrigin.endsWith("left")).toBe(true);
  });
  it("skips bands already on the first screen", () => {
    globalThis.innerHeight = 700;
    const first = band(100), later = band(900);
    const s = run([first, later]);
    expect(s.calls[0].targets).toEqual([later]);
    expect(run([band(100), band(200)]).calls).toHaveLength(0);
  });
});

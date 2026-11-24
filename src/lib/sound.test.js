import { describe, it, expect } from "vitest";
import { SOUND_KEY, SOUND_LEVELS, audible, soundLevel, setSoundLevel, play } from "./sound.js";

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};

describe("sound", () => {
  it("is off unless chosen", () => {
    expect(SOUND_LEVELS).toEqual(["off", "soft", "on"]);
    expect(soundLevel(memory())).toBe("off");
    expect(soundLevel(memory({ [SOUND_KEY]: "loud" }))).toBe("off");
    expect(soundLevel({ getItem: () => { throw new Error("blocked"); } })).toBe("off");
    expect(soundLevel(memory({ [SOUND_KEY]: "soft" }))).toBe("soft");
  });

  it("keeps a valid choice only", () => {
    const s = memory();
    setSoundLevel("on", s); expect(s.m.get(SOUND_KEY)).toBe("on");
    setSoundLevel("blast", s); expect(s.m.get(SOUND_KEY)).toBe("on");
  });

  it("plays only when on, visible, motion not off, and a known cue", () => {
    expect(audible({ level: "soft", cue: "band" })).toBe(true);
    expect(audible({ level: "off", cue: "band" })).toBe(false);
    expect(audible({ level: "on", hidden: true, cue: "band" })).toBe(false);
    expect(audible({ level: "on", motion: "off", cue: "band" })).toBe(false);
    expect(audible({ level: "on", motion: "calm", cue: "log" })).toBe(true);
    expect(audible({ level: "on", cue: "click" })).toBe(false);
  });

  it("never throws without Web Audio", () => expect(() => play("band")).not.toThrow());
});

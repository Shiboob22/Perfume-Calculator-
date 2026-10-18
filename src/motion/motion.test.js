import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TOKENS, countValue, motionVars, splitWords, staggerIndex } from "./config.js";
import { isPlainClick } from "./nav.js";
import { FLAGS } from "../lib/flags.js";
import { MOTION } from "../lib/theme.js";
import { MOTION_SCENE } from "../lib/compounding/config.js";

const css = readFileSync(new URL("./motion.css", import.meta.url), "utf8");

describe("tokens", () => {
  it("holds the brief's durations: 150 / 250 / 600 ms and an ambient loop of 2 s or more", () => {
    expect(TOKENS.duration).toMatchObject({ fast: 150, base: 250, slow: 600 });
    expect(TOKENS.duration.ambient).toBeGreaterThanOrEqual(2000);
  });
  it("keeps every duration in motion.css on a token (no literal ms)", () => {
    const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code.match(/\b\d+(\.\d+)?ms\b/g) ?? []).toEqual([]);
  });
  it("has one standard ease-out and one ease-in-out", () => {
    expect(Object.keys(TOKENS.ease).sort()).toEqual(["inOut", "out"]);
  });
  it("matches the board tokens in theme.js and the Compounding scene", () => {
    expect(TOKENS.ease.out).toBe(MOTION.easeOut);
    expect(TOKENS.ease.inOut).toBe(MOTION.easeInOut);
    expect(TOKENS.duration).toMatchObject({ fast: MOTION.fast, base: MOTION.base, slow: MOTION.slow, ambient: MOTION.ambient });
    expect(MOTION_SCENE.ease).toBe(MOTION.easeOut);
  });
  it("writes every token out as a custom property", () => {
    const v = motionVars();
    expect(v["--mo-fast"]).toBe("150ms");
    expect(v["--mo-slow"]).toBe("600ms");
    expect(v["--mo-step"]).toBe(`${TOKENS.stagger.step}ms`);
    expect(v["--mo-d-m"]).toBe("16px");
    expect(v["--mo-dir"]).toBe("1");
  });
  it("defines every --mo-* variable the stylesheet reads (the rest are set per element)", () => {
    const defined = new Set(Object.keys(motionVars()));
    // Set on elements by the primitives or by a rule in the sheet itself.
    const local = new Set(["--mo-from", "--mo-pin-h", "--i"]);
    const used = new Set([...css.matchAll(/var\((--mo-[a-z-]+|--i)/g)].map((m) => m[1]));
    for (const name of used) expect(defined.has(name) || local.has(name), name).toBe(true);
  });
});

describe("stylesheet", () => {
  it("scopes every rule to the flag (html[data-motion]) except the inert building blocks", () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.trim()).filter((l) => l.includes("{") && !l.startsWith("@") && !l.startsWith("}"));
    const bare = rules.filter((l) => !/^(html|:root)/.test(l)).map((l) => l.split("{")[0].trim());
    // Plain building blocks of new elements, with no effect on anything that exists.
    expect(bare.sort()).toEqual([".mo-grain", ".mo-grain::after", ".mo-light", ".mo-line", ".mo-pin__stage", ".mo-progress", ".mo-raised", ".mo-skel", ".mo-skel::after"].sort());
  });
  it("keeps @media at the top level so /dev/motion can switch reduced motion by rewriting it", () => {
    let depth = 0;
    for (const line of css.replace(/\/\*[\s\S]*?\*\//g, "").split("\n")) {
      if (/^\s*@media/.test(line) && depth > 0) throw new Error(`nested @media: ${line.trim()}`);
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    }
    expect(depth).toBe(0);
  });
  it("animates nothing but transform and opacity (translate, scale, opacity)", () => {
    const keyframes = [...css.matchAll(/@keyframes [\w-]+ \{([^@]*?\})\s*(?=\n@|\n\n|\n\.|$)/g)].map((m) => m[1]).join("\n");
    expect(keyframes).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding)\s*:/);
  });
});

describe("staggerIndex", () => {
  it("counts from zero and holds at the cap, so a long list still finishes in time", () => {
    expect([0, 3, 8, 9, 40].map((i) => staggerIndex(i))).toEqual([0, 3, 8, 8, 8]);
    expect(staggerIndex(-2)).toBe(0);
    expect(staggerIndex(2.9)).toBe(2);
  });
});

describe("splitWords", () => {
  it("splits on spaces into whole words", () => {
    expect(splitWords("  Weigh  the oil  first ")).toEqual(["Weigh", "the", "oil", "first"]);
  });
  it("keeps Arabic words whole, never single letters (letters must keep their joins)", () => {
    const words = splitWords("وزن الزيت أولاً");
    expect(words).toEqual(["وزن", "الزيت", "أولاً"]);
    expect(words.join(" ")).toBe("وزن الزيت أولاً");
  });
  it("is empty for nothing", () => {
    expect(splitWords("")).toEqual([]);
    expect(splitWords(null)).toEqual([]);
  });
});

describe("countValue", () => {
  it("starts at from, lands exactly on to, and eases out in between", () => {
    expect(countValue(10, 20, 0)).toBe(10);
    expect(countValue(10, 20, 1)).toBe(20);
    expect(countValue(10, 20, 0.5)).toBeGreaterThan(15);
    expect(countValue(10, 20, 2)).toBe(20);
    expect(countValue(20, 10, 0.5)).toBeLessThan(15);
  });
});

describe("isPlainClick", () => {
  const ev = (o = {}) => ({ button: 0, metaKey: false, altKey: false, ctrlKey: false, shiftKey: false, ...o });
  it("takes a plain left click", () => expect(isPlainClick(ev())).toBe(true));
  it("leaves new-tab clicks, middle clicks and other targets to the browser", () => {
    expect(isPlainClick(ev({ metaKey: true }))).toBe(false);
    expect(isPlainClick(ev({ ctrlKey: true }))).toBe(false);
    expect(isPlainClick(ev({ shiftKey: true }))).toBe(false);
    expect(isPlainClick(ev({ button: 1 }))).toBe(false);
    expect(isPlainClick(ev(), "_blank")).toBe(false);
    expect(isPlainClick(ev(), "_self")).toBe(true);
  });
});

describe("flag", () => {
  it("is a room flag like the others", () => expect(FLAGS).toContain("motion"));
});

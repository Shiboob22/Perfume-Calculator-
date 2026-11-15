import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TOKENS } from "./config.js";

// The motion grammar (docs/redesign/motion/GRAMMAR.md), as tests. M0 of the motion brief.
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The stylesheets that carry motion (the Arabic font sheets carry none). */
const SHEETS = {
  "index.css": read("../index.css"),
  "motion.css": read("./motion.css"),
  "rooms.css": read("../site/compounding/rooms.css"),
  "weigh.css": read("../site/compounding/weigh.css"),
  "hero3d.css": read("../site/compounding/hero3d/hero3d.css"),
};

/** Split a stylesheet into its top-level blocks, with the at-rule header of each ("" for plain rules). */
function blocks(css) {
  const out = [];
  let depth = 0, start = 0, head = "";
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") { if (depth === 0) { head = css.slice(start, i).trim(); start = i + 1; } depth++; }
    else if (css[i] === "}") { depth--; if (depth === 0) { out.push({ head, body: css.slice(start, i) }); start = i + 1; } }
  }
  return out;
}

describe("one set of numbers", () => {
  it("makes the app's --dur-* and --ease-* names aliases of the --mo-* tokens", () => {
    const root = SHEETS["index.css"].match(/:root \{[^}]*--dur-fast[^}]*\}/)[0];
    for (const [k, v] of [["--dur-fast", "--mo-fast"], ["--dur-base", "--mo-base"], ["--dur-slow", "--mo-slow"], ["--dur-ambient", "--mo-ambient"], ["--ease-out", "--mo-ease"], ["--ease-in-out", "--mo-ease-io"]]) {
      expect(root, k).toContain(`${k}: var(${v})`);
    }
  });

  it("spells no duration in any motion stylesheet: only tokens, or the 1 s / 1 ms scrub unit", () => {
    for (const [name, css] of Object.entries(SHEETS)) {
      // The scrub unit: a paused animation read by negative delay (progress x 1 s), and a 1 ms placeholder.
      const spelled = (css.match(/(?<![\w.-])-?\d*\.?\d+m?s\b(?!\s*\))/g) ?? []).filter((x) => !/^-?1(ms|s)$/.test(x));
      expect(spelled, name).toEqual([]);
    }
  });

  it("spells no curve outside the token line", () => {
    for (const [name, css] of Object.entries(SHEETS)) {
      const spelled = css.split("\n").filter((l) => /cubic-bezier/.test(l) && !/--ease-out:/.test(l) && !/--m-ease:/.test(l));
      expect(spelled, name).toEqual([]);
    }
  });

  it("keeps the arbitrary animation classes in components on tokens", () => {
    const src = readFileSync(new URL("../components/AppNav.jsx", import.meta.url), "utf8");
    const arbitrary = src.match(/animate-\[[^\]]+\]/g) ?? [];
    expect(arbitrary.length).toBeGreaterThan(0);
    for (const a of arbitrary) expect(a, a).toMatch(/var\(--dur-(fast|base|slow)\)_var\(--ease-(out|in-out)\)/);
  });

  it("holds the moments of the grammar: fast < base < slow, ambient 2 s or more", () => {
    const d = TOKENS.duration;
    expect(d.fast).toBeLessThan(d.base);
    expect(d.base).toBeLessThan(d.slow);
    expect(d.ambient).toBeGreaterThanOrEqual(2000);
    // Anything a user triggers in the app stays at or under 250 ms (base); only entrances and draws take slow.
    expect(d.base).toBeLessThanOrEqual(250);
  });
});

describe("keyframes", () => {
  const frames = Object.entries(SHEETS).flatMap(([file, css]) =>
    [...css.matchAll(/@keyframes ([\w-]+)\s*\{/g)].map((m) => {
      let depth = 0, i = m.index + m[0].length - 1, j = i;
      for (; j < css.length; j++) { if (css[j] === "{") depth++; else if (css[j] === "}" && --depth === 0) break; }
      return { file, name: m[1], body: css.slice(i + 1, j) };
    }));

  it("moves nothing that makes the page reflow: no size, offset, margin or padding", () => {
    expect(frames.length).toBeGreaterThan(30);
    const bad = frames.filter((f) => /(^|[\s;{])(width|height|top|left|right|bottom|margin[\w-]*|padding[\w-]*)\s*:/.test(f.body));
    expect(bad.map((f) => `${f.file}: ${f.name}`)).toEqual([]);
  });

  it("has no keyframes that nothing refers to", () => {
    const everything = [
      ...Object.values(SHEETS),
      ...["../components/AppNav.jsx", "../components/kx/Sheet.jsx", "./components.jsx"].map((p) => { try { return readFileSync(new URL(p, import.meta.url), "utf8"); } catch { return ""; } }),
    ].join("\n");
    const unused = frames.filter((f) => (everything.match(new RegExp(`(?<![A-Za-z0-9-])${f.name}(?![A-Za-z0-9-])`, "g")) ?? []).length < 2);
    expect(unused.map((f) => `${f.file}: ${f.name}`)).toEqual([]);
  });
});

describe("reduced motion", () => {
  it("starts every animation in the app sheets inside a no-preference query, an @supports for scroll timelines, or the scrub fallback", () => {
    const loose = [];
    for (const file of ["index.css", "motion.css"]) {
      for (const { head, body } of blocks(SHEETS[file])) {
        if (head.startsWith("@keyframes")) continue;
        const guarded = /prefers-reduced-motion:\s*no-preference/.test(head) || /^@supports/.test(head);
        const lines = body.split("\n").filter((l) => /(^|[\s;{])animation(-name)?\s*:/.test(l) && !/animation(-name)?:\s*none/.test(l));
        // A plain rule (no at-rule) that animates is loose, unless it is one of the listed exceptions.
        if (!guarded && !head.startsWith("@media")) for (const l of lines) loose.push(`${file}: ${l.trim().slice(0, 90)}`);
        if (head.startsWith("@media") && !guarded && !/reduce/.test(head)) for (const l of lines) loose.push(`${file}: ${l.trim().slice(0, 90)}`);
      }
    }
    // The scrub fallbacks of the Compounding are paused animations that move only with scroll (and are static
    // under reduced motion in their own sheet). Listed so a new loose one has to be argued.
    const allowed = loose.filter((l) => /\[data-compounding\]/.test(l) || /--kf/.test(l));
    expect(loose.filter((l) => !allowed.includes(l))).toEqual([]);
  });
});

describe("right to left", () => {
  it("gives every rule that grows from the left edge a mirrored rule", () => {
    const missing = [];
    for (const [file, css] of Object.entries(SHEETS)) {
      for (const m of css.matchAll(/(^|\n|\{)\s*([^{}@]+?)\s*\{[^{}]*transform-origin:\s*left\b[^{}]*\}/g)) {
        const sel = m[2].trim().split(",").pop().trim().replace(/^html\[data-motion\]\s*/, "");
        const mirrored = new RegExp(`(\\[dir=["']rtl["']\\][^{]*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^{]*\\[dir=["']rtl["']\\])[^{]*\\{[^}]*transform-origin:\\s*(right|100%)`).test(css);
        if (!mirrored) missing.push(`${file}: ${sel}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("Tailwind timing", () => {
  const files = ["../components/Selector.jsx", "../components/AppNav.jsx", "../components/PerfumerChat.jsx", "../components/PerfumeSearch.jsx"];
  it("has no numeric duration classes and no pulse that ignores reduced motion", () => {
    for (const f of files) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      expect(src.match(/\b(duration|delay)-\d+\b/g) ?? [], f).toEqual([]);
      expect(src.match(/(?<!motion-safe:)animate-pulse/g) ?? [], f).toEqual([]);
    }
  });
  it("points Tailwind's transition and pulse defaults at the tokens", () => {
    const cfg = readFileSync(new URL("../../tailwind.config.js", import.meta.url), "utf8");
    expect(cfg).toContain('DEFAULT: "var(--mo-fast)"');
    expect(cfg).toContain('DEFAULT: "var(--mo-ease)"');
    expect(cfg).toContain("pulse var(--mo-ambient) var(--mo-ease-io) infinite");
  });
});

describe("M1: answer", () => {
  const app = read("../index.css");
  const site = SHEETS["motion.css"];
  it("makes every exit faster than its entrance (sheets in the app and the More sheet)", () => {
    expect(app).toMatch(/\.kx-sheet\[open\] \{ animation: kx-sheet-in var\(--dur-base\)/);
    expect(app).toMatch(/\.kx-sheet\[data-leaving\] \{ animation: kx-sheet-out var\(--dur-fast\)/);
    expect(site).toMatch(/\.mo-sheet-panel \{ animation: mo-sheet-in var\(--mo-base\)/);
    for (const l of site.split("\n").filter((x) => /\[data-leaving\]/.test(x) && /animation:/.test(x))) expect(l, l).toContain("var(--mo-fast)");
  });
  it("gives the phone bar one room indicator, moved by transform", () => {
    const nav = readFileSync(new URL("../components/AppNav.jsx", import.meta.url), "utf8");
    expect(nav.match(/data-mo-ind="bar"/g)).toHaveLength(1);
    expect(app).toMatch(/\.kx-bar-ind \{ transform: translateX\(calc\(var\(--mo-dir, 1\)/);
  });
  it("lets text settle in without waiting at partial opacity (whole by 60 % of the base step, so within the fast one)", () => {
    for (const name of ["kx-settle", "kx-pop-in"]) {
      const body = app.match(new RegExp(`@keyframes ${name} \\{(.*)\\}`))[1];
      expect(body, name).toMatch(/60% \{ opacity: 1; \}/);
    }
    expect(TOKENS.duration.base * 0.6).toBeLessThanOrEqual(TOKENS.duration.fast);
  });
});


describe("M2: carry", () => {
  const site = SHEETS["motion.css"];
  it("moves forward from the end edge and back from the start edge, mirrored by --mo-dir", () => {
    const rule = (dir, side) => site.match(new RegExp(`\\[data-mo-nav="${dir}"\\]::view-transition-${side}\\(root\\) \\{([^}]*)\\}`))?.[1];
    expect(rule("forward", "new")).toContain("--mo-vt-x: calc(var(--mo-dir) * var(--mo-d-m));");
    expect(rule("forward", "old")).toContain("--mo-vt-x: calc(var(--mo-dir) * var(--mo-d-m) * -1);");
    expect(rule("back", "new")).toContain("--mo-vt-x: calc(var(--mo-dir) * var(--mo-d-m) * -1);");
    expect(rule("back", "old")).toContain("--mo-vt-x: calc(var(--mo-dir) * var(--mo-d-m));");
    // The view being left goes on the fast step, the new one arrives on the base step.
    for (const dir of ["forward", "back"]) {
      expect(rule(dir, "old")).toContain("var(--mo-fast)");
      expect(rule(dir, "new")).toContain("var(--mo-base)");
    }
  });
  it("gives the shared element one name, travelling on the in-out curve", () => {
    expect(site).toMatch(/::view-transition-group\(mo-share\) \{ animation-duration: var\(--mo-base\); animation-timing-function: var\(--mo-ease-io\); \}/);
    const nav = readFileSync(new URL("./nav.js", import.meta.url), "utf8");
    expect(nav).toContain('const SHARE = "mo-share"');
  });
});

describe("M3: hold", () => {
  const src = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  it("slides re-sorted rows on the base step and the in-out curve, by transform, with no literal timing", () => {
    const flip = src("./flip.js");
    expect(flip).toContain("duration: TOKENS.duration.base, easing: TOKENS.ease.inOut");
    expect(flip).toMatch(/transform: `translate\(\$\{dx\}px, \$\{dy\}px\)`/);
    expect(flip).not.toMatch(/\b\d+\s*ms\b|duration: \d/);
    // A new row arrives as text does everywhere: whole by 60 % of the base step.
    expect(flip).toContain("{ opacity: 1, offset: 0.6 }");
  });
  it("keeps loading in the shape of the list, still under reduced motion (the sweep is the only motion)", () => {
    const sk = src("../components/kx/ListSkeleton.jsx");
    expect(sk).toContain('role="status"');
    expect(sk).toContain('aria-hidden="true"');
    expect(sk).not.toMatch(/animate-|animation/);
    for (const f of ["../components/journal/JournalRoom.jsx", "../components/Batches.jsx", "../components/Inventory.jsx", "../components/orders/OrderQueue.jsx"]) {
      expect(src(f), f).toContain("<ListSkeleton");
    }
  });
  it("lets a count settle in, out of the flow, instead of swapping or pushing its neighbours", () => {
    const nav = src("../components/AppNav.jsx");
    expect(nav).toMatch(/<span key=\{count\} data-badge=\{count\} className="kx-settle/);
    expect(nav).not.toMatch(/badgeFor\(id\) && <span className="relative">/);
  });
});

describe("M4: mark", () => {
  const app = read("../index.css");
  const src = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  it("finishes the Ready day under a second: the verdigris line by 750 ms, the word by 850 ms", () => {
    expect(app).toMatch(/\.kx-ready-fill \{ transform-origin: left center; animation: kx-track-fill var\(--dur-slow\) var\(--ease-out\) var\(--dur-fast\) both; \}/);
    expect(app).toMatch(/\.kx-ready-word \{ animation: kx-settle var\(--dur-base\) var\(--ease-out\) var\(--dur-slow\) both; \}/);
    const d = TOKENS.duration;
    expect(d.fast + d.slow).toBeLessThan(1000);
    expect(d.slow + d.base).toBeLessThan(1000);
  });
  it("plays the signature out of the way: aria-hidden, no pointer events, skipped by any tap or key", () => {
    const sig = src("./signature.js");
    expect(sig).toContain('ghost.setAttribute("aria-hidden", "true")');
    expect(sig).toContain('pointerEvents: "none"');
    expect(sig).toMatch(/addEventListener\("pointerdown", skip/);
    expect(sig).toMatch(/addEventListener\("keydown", skip/);
    expect(sig).toContain("canSign() ||");
    expect(sig).not.toMatch(/duration: \d/);
  });
  it("sets the Wardrobe's answer down from above", () => {
    expect(SHEETS["motion.css"]).toMatch(/\.mo-reveal\[data-mo-from="down"\] \{ --mo-from: 0 calc\(var\(--mo-d-m\) \* -1\); \}/);
    expect(src("../components/wardrobe/Today.jsx")).toContain('<Reveal as="article" eager from="down"');
  });
});

describe("M5: the public site", () => {
  const src = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  it("gives the guides tabs one rule that slides by transform, as the phone bar's", () => {
    const g = src("../site/GuidesIndex.jsx");
    expect(g.match(/data-mo-ind="guides"/g)).toHaveLength(1);
    expect(g).toContain('className="kx-bar-ind');
    expect(g).not.toContain("border-b-2"); // no rule per button
  });
  it("slides the guide lists that a search or filter changes", () => {
    for (const f of ["../site/GuidesIndex.jsx", "../site/MethodSequence.jsx"]) {
      expect(src(f), f).toMatch(/useFlip\(list, guides\.map\(\(g\) => g\.slug\)\.join\(","\)\)/);
      expect(src(f), f).toContain("data-flip={g.slug}");
    }
  });
  it("lets the plan links answer a press, and the shop load in its own shape", () => {
    expect(src("../site/PlanCards.jsx").match(/className="mo-press /g)).toHaveLength(2);
    for (const f of ["../site/shop/ShopPage.jsx", "../site/shop/Checkout.jsx"]) expect(src(f), f).toContain("<ListSkeleton");
  });
});

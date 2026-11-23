import React, { useEffect, useRef } from "react";
import { useSceneCtx } from "../../motion/gsap/index.js";
import { tierRing } from "./scene.js";
import { COLORS } from "../../lib/theme";
import { STRENGTH_TIERS, tierFor } from "../../lib/calc";

// The strength presets as one segmented row (Bench SaaS, prototype's layout):
// the handbook's four named strengths, each holding every % above the one
// before it up to and including its own (owner, option A; no five-tier
// ladder). The tier the current % falls in is lit; a tap sets its strength.
// The −/+ stepper under it fine-tunes.
export default function StrengthTiers({ pct, onPick, label, t }) {
  const current = tierFor(pct);
  const root = useRef(null);
  const ring = useRef(null);
  const placed = useRef(false);
  const scene = useSceneCtx(root);
  const at = STRENGTH_TIERS.indexOf(current);
  // A decorative ring follows the lit tier (present only while GSAP runs; the buttons carry the state).
  useEffect(() => {
    const target = root.current?.querySelectorAll("button")[at];
    if (!scene || !ring.current || !target) return undefined;
    scene.add(() => tierRing(scene, ring.current, target, !placed.current));
    placed.current = true;
    const refit = () => { scene.gsap.set(ring.current, { clearProps: "transform" }); tierRing(scene, ring.current, target, true); };
    window.addEventListener("resize", refit);
    return () => window.removeEventListener("resize", refit);
  }, [scene, at]);
  return (
    <div ref={root} role="group" aria-label={label} dir="ltr" className="grid grid-cols-4 rounded relative" style={{ border: `1px solid ${COLORS.ink}` }}>
      {scene && <span ref={ring} aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-1/4 pointer-events-none" style={{ outline: `2px solid ${COLORS.ink}`, outlineOffset: -3 }} />}
      {STRENGTH_TIERS.map((tier, i) => {
        const on = tier === current;
        const range = t(i === 0 ? "calc.tiers.rangeFirst" : "calc.tiers.range", { min: tier.min, max: tier.max });
        return (
          <button key={tier.name} type="button" aria-pressed={on} onClick={() => onPick(tier.pct)}
            aria-label={t("calc.tiers.pick", { name: tier.name, range })}
            className="min-h-[60px] px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-center"
            style={{ borderInlineStart: i ? `1px solid ${COLORS.line}` : 0, background: on ? COLORS.amber : "transparent", color: on ? COLORS.onAmber : COLORS.ink }}>
            <span className="text-[13px] sm:text-sm leading-tight" style={{ fontWeight: on ? 600 : 500 }}>{tier.name}</span>
            <span className="text-[11px] tabular-nums" style={{ opacity: 0.85 }}>{range}</span>
          </button>
        );
      })}
    </div>
  );
}

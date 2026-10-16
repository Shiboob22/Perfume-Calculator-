// Development only. The motion layer's primitives on one long page, with the
// token table: scroll to watch each enter once, use the panel for reduced
// motion, right-to-left and low power. See DevMotion.
import React, { useState } from "react";
import { TOKENS } from "../motion/config";
import { CountUp, DrawLine, Parallax, Pin, Reveal, Skeleton, Stagger, TextReveal } from "../motion";
import { useI18n } from "../i18n/I18nProvider";
import { COLORS } from "../lib/theme";

const Spacer = ({ label }) => (
  <div className="h-[70vh] grid place-items-center text-xs font-mono" style={{ color: COLORS.dim }}>{label}</div>
);
const Sheet = ({ title, children }) => (
  <section className="max-w-3xl mx-auto px-6 py-10">
    <p className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal mb-3" style={{ color: COLORS.dim }}>{title}</p>
    {children}
  </section>
);

export default function DevPrimitives() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [n, setN] = useState(23.75);
  const words = ar ? "وزن الزيت أولاً ثم الكحول ببطء" : "Weigh the oil first, then the alcohol, slowly";
  const item = (i) => ar ? `البند ${i}` : `Item ${i}`;
  return (
    <div style={{ color: COLORS.ink }}>
      <Sheet title="tokens">
        <table className="text-sm font-mono tabular-nums" dir="ltr">
          <tbody>
            {Object.entries(TOKENS.duration).map(([k, v]) => <tr key={k}><td className="pe-6">duration.{k}</td><td>{v} ms</td></tr>)}
            {Object.entries(TOKENS.distance).map(([k, v]) => <tr key={k}><td className="pe-6">distance.{k}</td><td>{v} px</td></tr>)}
            {Object.entries(TOKENS.stagger).map(([k, v]) => <tr key={k}><td className="pe-6">stagger.{k}</td><td>{v}</td></tr>)}
            {Object.entries(TOKENS.ease).map(([k, v]) => <tr key={k}><td className="pe-6">ease.{k}</td><td>{v}</td></tr>)}
          </tbody>
        </table>
        <p className="mt-4 text-sm" style={{ color: COLORS.inkSoft }}>Below the fold: each block waits, then plays once. Scroll back up: nothing replays.</p>
      </Sheet>

      <Spacer label="scroll" />
      <Sheet title="Reveal (up, start, end)">
        <Reveal className="p-6 mb-4" style={{ border: `1px solid ${COLORS.line}` }}>Up: fade and rise, 600 ms.</Reveal>
        <Reveal from="start" className="p-6 mb-4" style={{ border: `1px solid ${COLORS.line}` }}>From the start edge (mirrors in Arabic).</Reveal>
        <Reveal from="end" className="p-6" style={{ border: `1px solid ${COLORS.line}` }}>From the end edge.</Reveal>
      </Sheet>

      <Spacer label="scroll" />
      <Sheet title="Stagger">
        <Stagger as="ul" className="grid gap-2 list-none p-0">
          {Array.from({ length: 10 }, (_, i) => <li key={i} className="p-3" style={{ border: `1px solid ${COLORS.line}` }}>{item(i + 1)}</li>)}
        </Stagger>
        <p className="text-xs mt-2" style={{ color: COLORS.dim }}>Ten items, steps held at {TOKENS.stagger.max}.</p>
      </Sheet>

      <Spacer label="scroll" />
      <Sheet title="TextReveal and DrawLine">
        <TextReveal as="h2" text={words} className="font-serif text-4xl leading-tight rtl:leading-[1.5]" />
        <DrawLine className="mt-6" style={{ color: COLORS.ink }} />
      </Sheet>

      <Spacer label="scroll" />
      <Sheet title="CountUp (final value is in the page from the first frame)">
        <p className="font-serif text-5xl"><CountUp value={n} format={(x) => x.toFixed(2)} /> <span className="text-xl">g</span></p>
        <div className="flex gap-3 mt-4">
          <button type="button" className="min-h-[44px] px-4" style={{ border: `1px solid ${COLORS.ink}` }} onClick={() => setN(84.5)}>84.50</button>
          <button type="button" className="min-h-[44px] px-4" style={{ border: `1px solid ${COLORS.ink}` }} onClick={() => setN(23.75)}>23.75</button>
          <button type="button" className="min-h-[44px] px-4" style={{ border: `1px solid ${COLORS.ink}` }} onClick={() => setN(60.75)}>60.75</button>
        </div>
        <p className="mt-6 font-serif text-3xl"><CountUp onView value={1247} format={(x) => Math.round(x).toLocaleString("en")} /> <span className="text-base">counted on first view</span></p>
      </Sheet>

      <Spacer label="scroll" />
      <Sheet title="Skeleton">
        <div className="grid gap-3" role="status"><span className="sr-only">Loading</span><Skeleton w="40%" h={28} /><Skeleton w="100%" /><Skeleton w="82%" /><Skeleton w="60%" /></div>
      </Sheet>

      <Spacer label="scroll" />
      <Sheet title="Parallax (transform only; still on low power and reduced motion)">
        <Parallax speed={1.5} className="p-10 text-center" style={{ background: COLORS.sand }}>Drifts against the scroll</Parallax>
      </Sheet>

      <Spacer label="scroll" />
      <Pin height="220vh" style={{ background: COLORS.sand }}>
        <div className="h-full grid place-items-center text-center px-6">
          <p className="font-serif text-3xl">Pinned for 220vh. A plain block under reduced motion.</p>
        </div>
      </Pin>
      <Spacer label="end" />
    </div>
  );
}

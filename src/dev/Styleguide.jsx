// Development only (never in a production build; see Root.jsx): the Kyphira
// design system on one page: brand, colour, type, components, both themes,
// English and Arabic (/styleguide and /ar/styleguide).
//
// v7 direction A, "Weighed": weight is the unit of the interface. Every
// number is a reading on a balance; every screen settles to a value before
// you read it. Light is bone, graphite and brass with verdigris for a stable
// reading; dark is soot with ember.
import React, { useState } from "react";
import "../i18n/arabic-readex.css";
import "../i18n/arabic-reem.css";
import { BRAND } from "../brand.js";
import { COLORS, PALETTES } from "../lib/theme";
import { contrastRatio, wcagGrade } from "../lib/contrast.js";
import { useI18n } from "../i18n/I18nProvider";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import LanguageToggle from "../components/LanguageToggle";
import { Button, Card, Chip, Field, FragranceCard, KyphiraLogo, Notice, RoomHeader, ScaleReadout, SmokeLine, Stepper, WeightScale } from "../components/kx";
import { TOKENS } from "../motion/config";
import { Reveal, Stagger } from "../motion";

const DISPLAY = { fontFamily: "'Instrument Serif', 'Instrument Serif Fallback', Georgia, serif", fontWeight: 400 };
const UI = { fontFamily: "'Instrument Sans Variable', 'Instrument Sans Fallback', 'Readex Pro Variable', system-ui, sans-serif" };
const UI_AR = { fontFamily: "'Readex Pro Variable', system-ui, sans-serif" };

const TAGLINES = [
  { en: BRAND.tagline.en, ar: BRAND.tagline.ar, chosen: true, why: "Names the three things the six rooms do. Three short imperatives; the Arabic is three imperatives too." },
  { en: "The first perfume formula was carved in stone. Yours goes here.", ar: "نُقشت أول وصفة عطر على حجر. وصفتك مكانها هنا.", why: "The strongest story, but 11 words: too long for a header, better as the origin essay's opening." },
  { en: BRAND.benchMotto.en, ar: BRAND.benchMotto.ar, why: "Kept as the bench's own motto: true today, but it covers one room of six." },
];

const SWATCHES = [
  ["paper", "Ground"], ["card", "Raised"], ["cardHi", "Cards, inputs"], ["line", "Hairline"],
  ["ink", "Text"], ["inkSoft", "Text, soft"], ["resin", "Resin: accent"], ["resinText", "Resin, as text"],
  ["myrrh", "Myrrh"], ["verdigris", "Verdigris: ready"], ["verdigrisText", "Verdigris, as text"], ["ember", "Ember: warning"],
];

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="mt-16">
      <h2 id={id} className="text-3xl mb-6" style={DISPLAY}>{title}</h2>
      {children}
    </section>
  );
}

function Swatches({ palette, name }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {SWATCHES.map(([key, label]) => {
        const hex = palette[key];
        const onPaper = contrastRatio(hex, palette.paper);
        // Only the text shades are held to a text ratio; the rest are fills and marks.
        const isText = /^(ink|inkSoft|ember)$|Text$/.test(key);
        return (
          <div key={key} className="p-3" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
            <div className="h-12 mb-2" style={{ background: hex, border: `1px solid ${COLORS.line}` }} />
            <p className="text-sm" style={{ color: COLORS.ink }}>{label}</p>
            <p className="font-mono tabular-nums text-xs" style={{ color: COLORS.dim }}>{hex}</p>
            <p className="font-mono tabular-nums text-xs" style={{ color: COLORS.dim }}>
              {isText ? `${onPaper.toFixed(2)}:1 on ${name} paper, ${wcagGrade(onPaper)}` : "fill or mark"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// One specimen set in both languages, side by side; each pane sets its own direction.
const PAIRS = [
  { dir: "ltr", lang: "en", title: "Weigh it. Pour it.", body: "Oil first, then alcohol, slowly. A measured density always wins.", num: "23.75 g", ui: UI },
  { dir: "rtl", lang: "ar", title: "زِن. اسكب.", body: "الزيت أولاً ثم الكحول ببطء. الكثافة المقاسة هي الأصل.", num: "23.75 g", ui: UI_AR },
];

function Pair() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PAIRS.map((p) => (
        <div key={p.lang} dir={p.dir} lang={p.lang} className="p-5" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card, ...p.ui }}>
          <p className="text-4xl leading-tight rtl:leading-[1.5]" style={DISPLAY}>{p.title}</p>
          <p className="mt-3 max-w-[40ch]" style={{ color: COLORS.inkSoft }}>{p.body}</p>
          <p className="mt-3 font-mono tabular-nums text-xl" dir="ltr">{p.num}</p>
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <Button>{p.lang === "ar" ? "ابدأ" : "Start"}</Button>
            <Chip>{p.lang === "ar" ? "عنبر" : "Amber"}</Chip>
            <Chip onToggle={() => {}} pressed>{p.lang === "ar" ? "خشبي" : "Woody"}</Chip>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Styleguide() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [grams, setGrams] = useState(23.75);
  const [name, setName] = useState("");
  const [vol, setVol] = useState(50);
  const [on, setOn] = useState(["Woody"]);
  const [replay, setReplay] = useState(0);
  const body = ar ? UI_AR : UI;

  return (
    <div className="min-h-screen" style={{ background: COLORS.paper, color: COLORS.ink, ...body }}>
      <SiteHeader zone="site" language={<LanguageToggle />} />
      <main className="max-w-[1100px] mx-auto px-4 sm:px-8 pb-16">
        <p className="mt-10 text-xs uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>Style guide · development only</p>
        <h1 className="mt-2 text-[clamp(3rem,9vw,6rem)] leading-none" style={DISPLAY}>{ar ? BRAND.nameAr : BRAND.name}</h1>
        <p className="mt-4 text-lg" style={{ color: COLORS.inkSoft }}>
          {BRAND.pronunciation} · {ar ? BRAND.tagline.ar : BRAND.tagline.en}
        </p>
        <SmokeLine className="mt-8" />

        <Section id="sg-idea" title="The idea: weighed">
          <p className="max-w-[60ch] text-lg" style={{ color: COLORS.inkSoft }}>
            Weight is the unit of the interface. Every number is a reading on a balance, and every screen settles to a value before you read it.
          </p>
          <ul className="mt-4 grid gap-2 max-w-[70ch] list-disc ps-5" style={{ color: COLORS.inkSoft }}>
            <li>Numbers settle once (a short count-in, {TOKENS.duration.slow} ms), then stay still. Calculator figures never animate while you type.</li>
            <li>Progress is grams on a beam: the brass pan fills; a verdigris light means a stable, on-target reading.</li>
            <li>Silence around big numerals. Rooms are pans you load, one weight each.</li>
          </ul>
        </Section>

        <Section id="sg-name" title="Name and line">
          <p className="max-w-[60ch]" style={{ color: COLORS.inkSoft }}>
            Kyphi was the compound incense of ancient Egypt, its recipes cut into the walls of the laboratory at the Temple of Edfu. Kyphira is a coined name on that root.
          </p>
          <ol className="mt-6 grid gap-3">
            {TAGLINES.map((t, i) => (
              <li key={i} className="p-4" style={{ border: `1px solid ${t.chosen ? COLORS.resin : COLORS.line}`, background: COLORS.card }}>
                <p className="text-2xl" style={DISPLAY}>{ar ? t.ar : t.en}</p>
                <p className="mt-1 text-sm" style={{ color: COLORS.dim }}>{t.chosen ? "Chosen. " : ""}{t.why}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="sg-mark" title="The logo">
          <p className="mb-6 max-w-[60ch]" style={{ color: COLORS.inkSoft }}>The owner's three forms (design/logo/): symbol, horizontal, stacked. The ink follows the theme; the flame is brass. Files in public/brand/.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {["symbol", "horizontal", "stacked"].map((form) => (
              <div key={form} className="p-4" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card, color: COLORS.ink }}>
                <p className="mb-3 text-sm" style={{ color: COLORS.dim }}>{form}</p>
                <div className="flex items-end gap-4">
                  <KyphiraLogo form={form} height={form === "horizontal" ? 72 : 120} title={`Kyphira logo, ${form}`} />
                  <div className="p-2" style={{ background: COLORS.inkBand, color: COLORS.onInk }}><KyphiraLogo form={form} height={form === "horizontal" ? 40 : 64} /></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-end gap-6" style={{ color: COLORS.ink }}>
            <KyphiraLogo form="symbol" height={16} />
            <KyphiraLogo form="symbol" height={32} />
            <KyphiraLogo form="symbol" height={48} />
          </div>
        </Section>

        <Section id="sg-colour" title="Colour">
          <h3 className="mb-3 text-sm uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>Light (default)</h3>
          <Swatches palette={PALETTES.light} name="light" />
          <h3 className="mt-8 mb-3 text-sm uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>Dark</h3>
          <Swatches palette={PALETTES.dark} name="dark" />
          <p className="mt-4 text-sm" style={{ color: COLORS.dim }}>Fills and marks use the plain names; text uses the *Text shades. Every text pair is checked at 4.5:1 in src/lib/theme.test.js.</p>
        </Section>

        <Section id="sg-type" title="Type">
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Display: Instrument Serif" no={1}>
              <p className="text-5xl leading-tight ar-display" style={DISPLAY}>{ar ? "الفرن والميزان" : "84.50 g."}</p>
              <p className="mt-2 text-sm" style={{ color: COLORS.dim }}>Condensed editorial serif, regular and italic. Large and sparing: a numeral, a headline, a voice line. Arabic: Reem Kufi, only for short large lines.</p>
            </Card>
            <Card title="Interface: Instrument Sans" no={2}>
              <p className="text-base">{ar ? "الواجهة والنص: Readex Pro" : "The quick brown flask pours twelve even grams."}</p>
              <p className="mt-2 text-sm" style={{ color: COLORS.dim }}>Quiet grotesque for controls, labels and prose. Arabic: Readex Pro (also all Arabic body text), system Arabic as fallback.</p>
            </Card>
            <Card title="Figures: Instrument Sans, tabular" no={3}>
              <p className="font-mono tabular-nums text-2xl" dir="ltr">23.75 g · 60.75 g · 84.50 g</p>
              <p className="mt-2 text-sm" style={{ color: COLORS.dim }}>No monospace. Tabular figures keep columns of grams aligned. Western digits in both languages.</p>
            </Card>
            <Card title="Scale" no={4}>
              <ul className="grid gap-1" style={{ color: COLORS.inkSoft }}>
                <li><span className="text-[clamp(2.75rem,7.5vw,6.5rem)] leading-none" style={DISPLAY}>Display</span></li>
                <li><span className="text-[clamp(2rem,4.5vw,3.25rem)]" style={DISPLAY}>Title</span></li>
                <li><span className="text-xl" style={DISPLAY}>Lead, 20 px</span></li>
                <li><span className="text-base">Body, 16 px</span></li>
                <li><span className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal">Label, 11 px</span></li>
              </ul>
            </Card>
          </div>
        </Section>

        <Section id="sg-components" title="Components">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="grid gap-4 content-start">
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Delete batch</Button>
                <Button disabled>Disabled</Button>
                <Button loading>Saving</Button>
                <Button size="lg">Large</Button>
              </div>
              <Field label="Batch name" hint="Shown on the label." value={name} onChange={(e) => setName(e.target.value)} placeholder="Oud Nights" />
              <Field label="Oil, g" mono defaultValue="23.75" error="Enter a weight between 0 and 500 g." />
              <Card title="A recipe card" no={15}>
                <p style={{ color: COLORS.inkSoft }}>Catalogue numbers are three digits, zero-padded, on every recipe, batch, guide and fragrance.</p>
              </Card>
            </div>
            <div className="grid gap-4 content-start">
              <ScaleReadout label="Oil" grams={grams} target={23.75} tareLabel="Tare" onTare={() => setGrams(0)} labels={{ under: "below target", ok: "on target", over: "over target" }} />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setGrams((g) => Math.max(0, +(g - 0.25).toFixed(2)))}>−0.25 g</Button>
                <Button variant="secondary" onClick={() => setGrams((g) => +(g + 0.25).toFixed(2))}>+0.25 g</Button>
              </div>
              <Notice tone="warning" title="Ethanol is highly flammable">Keep away from flame, heat and sparks. Work in a ventilated room.</Notice>
              <Notice tone="info" title="Densities are starting points">A measured density always wins.</Notice>
              <Notice tone="success" title="Rested">Day 28. Ready to wear.</Notice>
              <WeightScale label="Oil poured" value={grams} max={30} target={23.75} ticks={5} labels={{ under: "below target", ok: "on target", over: "over target" }} />
              <WeightScale label="Reading progress" value={9} max={30} unit="min" digits={0} ticks={3} />
              <SmokeLine />
              <SmokeLine loading label="Loading" />
            </div>
          </div>
        </Section>

        <Section id="sg-pair" title="English and Arabic, side by side">
          <Pair />
        </Section>

        <Section id="sg-motion" title="Motion tokens">
          <div className="grid gap-6 lg:grid-cols-2">
            <table className="text-sm font-mono tabular-nums" dir="ltr"><tbody>
              {Object.entries(TOKENS.duration).map(([k, v]) => <tr key={k}><td className="pe-6" style={{ color: COLORS.dim }}>duration.{k}</td><td>{v} ms</td></tr>)}
              {Object.entries(TOKENS.ease).map(([k, v]) => <tr key={k}><td className="pe-6" style={{ color: COLORS.dim }}>ease.{k}</td><td>{v}</td></tr>)}
              {Object.entries(TOKENS.stagger).map(([k, v]) => <tr key={k}><td className="pe-6" style={{ color: COLORS.dim }}>stagger.{k}</td><td>{v}</td></tr>)}
              {Object.entries(TOKENS.distance).map(([k, v]) => <tr key={k}><td className="pe-6" style={{ color: COLORS.dim }}>distance.{k}</td><td>{v} px</td></tr>)}
            </tbody></table>
            <div>
              <Button variant="secondary" onClick={() => setReplay((n) => n + 1)}>Replay</Button>
              <Stagger as="ul" eager key={replay} className="mt-4 grid gap-2 list-none p-0">
                {["Reveal", "Stagger", "TextReveal"].map((x) => <li key={x} className="p-3" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>{x}</li>)}
              </Stagger>
              <Reveal eager key={`r${replay}`} className="mt-4 text-sm" style={{ color: COLORS.dim }}>Calculator figures never animate; UI fills take {TOKENS.duration.base} ms.</Reveal>
            </div>
          </div>
        </Section>

        <Section id="sg-states" title="Component states">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="grid gap-5 content-start">
              <Stepper label="Batch size" value={vol} unit="mL" decLabel="Less" incLabel="More" onStep={(d) => setVol((v) => Math.max(10, v + d * 10))} decDisabled={vol <= 10} />
              <Stepper label="At the minimum" value={10} unit="mL" decLabel="Less" incLabel="More" onStep={() => {}} decDisabled />
              <div className="flex flex-wrap gap-2 items-center">
                <Chip>Label</Chip>
                <Chip to="#sg-states">Link</Chip>
                {["Woody", "Amber", "Fresh"].map((c) => (
                  <Chip key={c} pressed={on.includes(c)} count={3} onToggle={() => setOn((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]))}>{c}</Chip>
                ))}
              </div>
              <Field label="Default" value="" onChange={() => {}} />
              <Field label="Disabled" value="Locked" onChange={() => {}} disabled />
              <Field label="Error" value="900" onChange={() => {}} error="Enter a weight between 0 and 500 g." />
            </div>
            <div className="grid gap-5 content-start">
              <RoomHeader numeral="I" name="The Bench" headline="12 bottles." />
              <RoomHeader numeral="II" name="The Library" title="Essays" />
              <ul className="grid gap-3 list-none p-0">
                <FragranceCard name="Oud Nights" facts={["House", "2019", "Woody"]} accords={["oud", "amber", "rose"]} matched={["oud"]} no={7} />
                <FragranceCard name="Citrus Bench" href="#sg-states" facts={["House", "2021"]} accords={["citrus"]} />
              </ul>
              <Notice tone="warning" title="Warning">Ethanol is flammable.</Notice>
              <Notice tone="info" title="Info">Densities are starting points.</Notice>
              <Notice tone="success" title="Success">Rested. Ready to wear.</Notice>
            </div>
          </div>
        </Section>
      </main>
      <SiteFooter links={null} />
    </div>
  );
}

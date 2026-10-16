// Development only (never in a production build; see Root.jsx): the Kyphira
// design system on one page: brand, colour, type, components, both themes,
// English and Arabic (/styleguide and /ar/styleguide).
//
// The new type faces load here, not site-wide: switching the live site to
// them is the Phase 2 re-skin, together with the font preloads (CLS).
import React, { useState } from "react";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/hanken-grotesk/wght.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "../i18n/arabic-naskh.css";
import { BRAND } from "../brand.js";
import { COLORS, PALETTES } from "../lib/theme";
import { contrastRatio, wcagGrade } from "../lib/contrast.js";
import { useI18n } from "../i18n/I18nProvider";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import LanguageToggle from "../components/LanguageToggle";
import { Button, Card, Field, KyphiraLogo, Notice, ScaleReadout, SmokeLine } from "../components/kx";

const DISPLAY = { fontFamily: "'Newsreader Variable', 'Noto Naskh Arabic Variable', Georgia, serif", fontVariationSettings: '"opsz" 144', fontWeight: 400 };
const UI = { fontFamily: "'Hanken Grotesk Variable', 'IBM Plex Sans Arabic', system-ui, sans-serif" };

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

export default function Styleguide() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [grams, setGrams] = useState(23.75);
  const [name, setName] = useState("");
  const body = ar ? { fontFamily: "'IBM Plex Sans Arabic', 'Tajawal', system-ui, sans-serif" } : UI;

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
            <Card title="Display: Newsreader" no={1}>
              <p className="text-5xl leading-tight" style={DISPLAY}>{ar ? "الفرن والميزان" : "Weigh it. Pour it."}</p>
              <p className="mt-2 text-sm" style={{ color: COLORS.dim }}>Variable serif with an optical-size axis. Large and sparing.</p>
            </Card>
            <Card title="Interface: Hanken Grotesk" no={2}>
              <p className="text-base">{ar ? "الواجهة والنص: IBM Plex Sans Arabic" : "The quick brown flask pours twelve even grams."}</p>
              <p className="mt-2 text-sm" style={{ color: COLORS.dim }}>Arabic: IBM Plex Sans Arabic, display Noto Naskh Arabic, fallback Tajawal.</p>
            </Card>
            <Card title="Measurements: IBM Plex Mono" no={3}>
              <p className="font-mono tabular-nums text-2xl" dir="ltr">23.75 g · 60.75 g · 84.50 g</p>
              <p className="mt-2 text-sm" style={{ color: COLORS.dim }}>Tabular figures. Every gram value uses this.</p>
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
              <SmokeLine />
              <SmokeLine loading label="Loading" />
            </div>
          </div>
        </Section>
      </main>
      <SiteFooter links={null} />
    </div>
  );
}

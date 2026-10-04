import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { BENCH_STRENGTHS, LEDGER_DEFAULT, LEDGER_SIZES, ledgerFigures, scaleDigits } from "./benchFigures";

// The bench in the Scent Ledger hero: pick a bottle and a strength, the
// flacon fills and the scale rolls to the handbook's weights (solveBottle at
// 0.95 / 0.81 g/mL, via benchFigures.js). The only interactive part of the
// home page; prerendered at 50 mL and 25%. Motion is transform-only and
// stops under prefers-reduced-motion (index.css).

const COL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SIG = "var(--dur-signature) var(--ease)";
const mono = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };

function Segments({ legend, options, value, onPick, tall }) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, padding: 0 }}>{legend}</legend>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},1fr)`, border: "1px solid var(--ink)" }}>
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => onPick(o.value)} className="ledger-seg"
              style={{ minHeight: tall ? 52 : 44, borderInlineStart: i ? "1px solid var(--ink)" : 0, background: on ? "var(--ink)" : "transparent", color: on ? "var(--paper)" : "var(--ink)" }}>
              <span dir="ltr" style={{ ...mono, fontSize: tall ? 14 : 13 }}>{o.label}</span>
              {o.sub && <span style={{ fontSize: 10, letterSpacing: "0.06em", opacity: 0.75 }}>{o.sub}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Each place is a 1ch × 1em window onto a column of 0–9, moved to its digit.
function Scale({ text, label }) {
  return (
    <div aria-live="polite" aria-label={label} dir="ltr" style={{ ...mono, fontWeight: 500, fontSize: "clamp(40px,4.6vw,64px)", letterSpacing: "-0.03em", lineHeight: 1, marginTop: 14, display: "flex", alignItems: "baseline" }}>
      {scaleDigits(text).map((d, i) => d.dot ? (
        <span key={i} aria-hidden="true" style={{ display: "inline-block", width: "1ch", height: "1em" }}>.</span>
      ) : (
        <span key={i} aria-hidden="true" style={{ display: "inline-block", width: "1ch", height: "1em", overflow: "hidden", opacity: d.blank ? 0 : 1 }}>
          <span className="ledger-roll" style={{ display: "block", transform: `translateY(${-d.n}em)`, transitionDuration: `${460 + i * 40}ms` }}>
            {COL.map((n) => <span key={n} style={{ display: "block", height: "1em", lineHeight: "1em" }}>{n}</span>)}
          </span>
        </span>
      ))}
      <span aria-hidden="true" style={{ fontSize: "0.38em", marginInlineStart: 6, color: "var(--muted)" }}>g</span>
    </div>
  );
}

export default function LedgerBench() {
  const { t } = useI18n();
  const L = (k, v) => t(`site.ledger.bench.${k}`, v);
  const [size, setSize] = useState(LEDGER_DEFAULT.size);
  const [pct, setPct] = useState(LEDGER_DEFAULT.pct);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const f = ledgerFigures(size, pct);
  const s = pct / 100;

  function copy() {
    navigator.clipboard?.writeText(L("recipe", { size, pct, oil: f.oilText, ethanol: f.alcoholText })).catch(() => {});
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  const rule = "1px solid var(--rule)";
  return (
    <div style={{ border: "1px solid var(--ink)", background: "var(--paper-3)", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 22px", borderBottom: rule }}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 400, letterSpacing: "0.14em", textTransform: "uppercase" }}>{L("title")}</h2>
        <span style={{ ...mono, fontSize: 12, color: "var(--muted)" }}>{L("no")}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) clamp(84px,22vw,120px)", gap: 20, padding: 22 }}>
        <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
          <Segments legend={L("bottle")} value={size} onPick={setSize} options={LEDGER_SIZES.map((v) => ({ value: v, label: `${v} mL` }))} />
          <Segments legend={L("strength")} value={pct} onPick={setPct} tall
            options={BENCH_STRENGTHS.map(({ pct: v }) => ({ value: v, label: `${v}%`, sub: L(`names.${v}`) }))} />
        </div>
        <div aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <svg viewBox="0 0 120 200" width="100%" style={{ maxWidth: 120, overflow: "visible", transform: `scale(${f.bottleScale})`, transformOrigin: "50% 100%", transition: `transform ${SIG}` }}>
            <defs><clipPath id="ledger-flacon"><rect x="14" y="66" width="92" height="132" rx="8" /></clipPath></defs>
            <g clipPath="url(#ledger-flacon)">
              <rect x="14" y="66" width="92" height="132" fill="var(--ethanol)" style={{ transformBox: "fill-box", transformOrigin: "50% 100%", transform: "scaleY(0.9)" }} />
              <rect x="14" y="66" width="92" height="132" fill="var(--oil)" style={{ transformBox: "fill-box", transformOrigin: "50% 100%", transform: `scaleY(${0.9 * s})`, transition: `transform ${SIG}` }} />
            </g>
            <rect x="14" y="66" width="92" height="132" rx="8" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
            <rect x="48" y="46" width="24" height="20" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
            <rect x="38" y="8" width="44" height="38" fill="var(--ink)" />
          </svg>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--ink)" }}>
        <div style={{ padding: "20px 22px", borderInlineEnd: rule, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--ink-2)" }}>
            <span style={{ width: 8, height: 8, background: "var(--oil)", display: "inline-block" }} />{L("oil")}
          </div>
          <Scale text={f.oilText} label={L("oilLabel", { g: f.oilText })} />
        </div>
        <div style={{ padding: "20px 22px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--ink-2)" }}>
            <span style={{ width: 8, height: 8, background: "var(--ethanol)", border: "1px solid #9AA89E", display: "inline-block" }} />{L("ethanol")}
          </div>
          <Scale text={f.alcoholText} label={L("ethanolLabel", { g: f.alcoholText })} />
        </div>
      </div>

      <div style={{ padding: "0 22px 18px" }}>
        <div aria-hidden="true" style={{ height: 6, background: "var(--ethanol)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "100%", background: "var(--oil)", transformOrigin: "var(--ratio-origin, 0 50%)", transform: `scaleX(${f.share})`, transition: `transform ${SIG}` }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginTop: 8, ...mono, fontSize: 11, color: "var(--muted)" }}>
          <span>{L("ratio", { oil: f.oilPct, ethanol: f.alcoholPct })}</span>
          <span dir="ltr">ρ 0.95 / 0.81 g·mL⁻¹</span>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 22px", borderTop: rule }}>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)", maxWidth: "26em" }}>{L("safety")}</p>
        <button type="button" onClick={copy} className="ledger-copy">
          <span aria-live="polite">{copied ? L("copied") : L("copy")}</span>
        </button>
      </div>
    </div>
  );
}

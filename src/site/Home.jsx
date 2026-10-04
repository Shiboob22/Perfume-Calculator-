import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import { localePath } from "./meta";
import { GUIDES } from "../content/guides";
import { readingMinutes } from "../content/search";
import LiveBench from "./LiveBench";

// The Scent Ledger landing page (redesign/scent-ledger). Paper, ink and one
// forest green; 1px rules instead of boxes or shadows (tokens in index.css,
// scoped to .ledger). It brings its own header and footer: PublicLayout
// steps aside on "/". Everything here is static, prerendered HTML except the
// bench in the hero.

const ROMAN = ["I", "II", "III"];
const METHOD = GUIDES.filter((g) => g.section === "blending");
const wrap = { maxWidth: 1200, margin: "0 auto", padding: "0 clamp(20px,5vw,72px)" };
const label = { margin: 0, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" };
const h2 = { margin: 0, fontWeight: 500, fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.05, letterSpacing: "-0.03em" };
const body = { fontSize: 17, lineHeight: 1.6, color: "var(--ink-2)" };
const navLink = { color: "var(--ink)", textDecoration: "none", padding: "12px 0", display: "inline-block" };
const split = (min) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${min}px),1fr))` });

export function FlaconMark() {
  return (
    <svg width="18" height="28" viewBox="0 0 18 28" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <rect x="5" y="1" width="8" height="6" /><rect x="7" y="7" width="4" height="3" /><rect x="1" y="10" width="16" height="17" rx="2" /><line x1="1" y1="20" x2="17" y2="20" />
    </svg>
  );
}

function Fleuron() {
  return (
    <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 20, color: "var(--muted)" }}>
      <span style={{ flex: 1, height: 1, background: "var(--rule)" }} />
      <span className="serif" style={{ fontSize: 20 }}>❦</span>
      <span style={{ flex: 1, height: 1, background: "var(--rule)" }} />
    </div>
  );
}

export default function Home() {
  const { t, locale } = useI18n();
  const to = (p) => localePath(locale, p);
  const L = (k, v) => t(`site.ledger.${k}`, v);
  const raw = (k) => t.raw(`site.ledger.${k}`) || [];
  const other = locale === "ar" ? "en" : "ar";

  return (
    <div className="ledger">
      <header style={{ ...wrap, paddingTop: 22, paddingBottom: 22, display: "flex", flexWrap: "wrap", gap: "16px 40px", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--rule)" }}>
        <Link to={to("/")} aria-label={t("site.nav.home")} style={{ display: "flex", gap: 12, alignItems: "center", color: "var(--ink)", textDecoration: "none", minHeight: 44 }}>
          <FlaconMark />
          <span dir="ltr" style={{ fontWeight: 500, fontSize: 17, letterSpacing: "-0.01em" }}>{t("brand")}</span>
        </Link>
        <nav aria-label={L("nav.label")} style={{ display: "flex", flexWrap: "wrap", gap: "4px 28px", fontSize: 14 }}>
          <Link to={to("/guides")} style={navLink}>{L("nav.guides")}</Link>
          <a href="#bench" style={navLink}>{L("nav.calculator")}</a>
          <a href="/app/batches" style={navLink}>{L("nav.journal")}</a>
          <a href="#pricing" style={navLink}>{L("nav.pricing")}</a>
          <Link to={localePath(other, "/")} lang={other} hrefLang={other} title={t("site.nav.languageLabel")} style={{ ...navLink, fontFamily: other === "ar" ? "Tajawal, var(--font-sans)" : "var(--font-sans)" }}>
            {t("site.nav.language")}
          </Link>
        </nav>
      </header>

      <main style={wrap}>
        <section id="bench" style={{ ...split(440), gap: "clamp(40px,6vw,96px)", padding: "clamp(48px,8vw,112px) 0 clamp(64px,8vw,120px)", alignItems: "center" }}>
          <div>
            <p style={{ ...label, marginBottom: 28 }}>{L("kicker")}</p>
            <h1 style={{ margin: 0, fontWeight: 500, fontSize: "clamp(46px,6.6vw,96px)", lineHeight: 0.98, letterSpacing: "-0.035em", textWrap: "balance" }}>
              {L("title1")}<br />{L("title2")}<br />
              <span className="serif" style={{ fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.02em" }}>{L("title3")}</span>
            </h1>
            <p className="serif" style={{ ...body, margin: "32px 0 0", maxWidth: "30em", fontSize: "clamp(17px,1.4vw,19px)", textWrap: "pretty" }}>{L("lead")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 28px", marginTop: 40, alignItems: "center" }}>
              <a href="/app/calculator?ref=home" className="ledger-cta">{L("cta")}</a>
              <Link to={to(`/guides/${METHOD[0].slug}`)} style={{ fontSize: 14, color: "var(--ink)", padding: "12px 0" }}>
                {L("readGuide")} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
              </Link>
            </div>
          </div>
          <LiveBench />
        </section>

        <Fleuron />

        <section style={{ ...split(300), padding: "clamp(64px,8vw,120px) 0", gap: "48px clamp(32px,4vw,64px)" }}>
          {raw("principles").map((p, i) => (
            <article key={p.title} style={{ borderTop: "1px solid var(--ink)", paddingTop: 24 }}>
              <p className="serif" aria-hidden="true" style={{ margin: 0, fontStyle: "italic", fontSize: 28 }}>{ROMAN[i]}</p>
              <h2 style={{ margin: "28px 0 12px", fontWeight: 500, fontSize: 24, letterSpacing: "-0.02em" }}>{p.title}</h2>
              <p className="serif" style={{ ...body, margin: 0, textWrap: "pretty" }}>{p.text}</p>
            </article>
          ))}
        </section>

        <section id="guides" aria-labelledby="ledger-guides" style={{ ...split(320), padding: "0 0 clamp(64px,8vw,120px)", gap: "32px clamp(32px,6vw,96px)" }}>
          <div>
            <p style={{ ...label, marginBottom: 16 }}>{L("contents")}</p>
            <h2 id="ledger-guides" style={h2}>{L("libraryTitle")}</h2>
            <p className="serif" style={{ ...body, margin: "20px 0 0", maxWidth: "24em" }}>{L("libraryLead")}</p>
          </div>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--ink)" }}>
            {METHOD.map((g, i) => (
              <li key={g.slug} style={{ borderBottom: "1px solid var(--rule)" }}>
                <Link to={to(`/guides/${g.slug}`)} className="ledger-row">
                  <span className="serif" aria-hidden="true" style={{ fontStyle: "italic", fontSize: 20 }}>{ROMAN[i]}</span>
                  <span>
                    <span style={{ display: "block", fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>{g[locale].title}</span>
                    <span className="serif" style={{ display: "block", marginTop: 4, fontSize: 15, color: "var(--muted)" }}>{g[locale].summary}</span>
                  </span>
                  <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{L("minutes", { count: readingMinutes(g[locale]) })}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section id="pricing" aria-labelledby="ledger-pricing" style={{ padding: "clamp(64px,8vw,120px) 0", borderTop: "1px solid var(--rule)" }}>
          <h2 id="ledger-pricing" style={{ ...h2, marginBottom: 48 }}>{L("pricingTitle")}</h2>
          <div style={{ ...split(320), border: "1px solid var(--ink)" }}>
            <div style={{ padding: "clamp(24px,3vw,40px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ margin: 0, fontWeight: 500, fontSize: 22 }}>{L("free")}</h3>
                <span className="num" style={{ fontSize: 28 }}>0</span>
              </div>
              <ul className="serif" style={{ ...body, margin: "28px 0 0", padding: 0, listStyle: "none", fontSize: 16, lineHeight: 1.5, display: "grid", gap: 12 }}>
                {raw("freeList").map((x) => <li key={x}>— {x}</li>)}
              </ul>
            </div>
            <div className="ledger-pro" style={{ padding: "clamp(24px,3vw,40px)", background: "var(--paper-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <h3 style={{ margin: 0, fontWeight: 500, fontSize: 22 }}>{L("pro")}</h3>
                <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", border: "1px solid var(--ink)", padding: "4px 8px" }}>{L("notOnSale")}</span>
              </div>
              <ul className="serif" style={{ ...body, margin: "28px 0 0", padding: 0, listStyle: "none", fontSize: 16, lineHeight: 1.5, display: "grid", gap: 12 }}>
                {raw("proList").map((x) => <li key={x}>— {x}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="ledger-faq" style={{ ...split(320), padding: "0 0 clamp(64px,8vw,120px)", gap: "32px clamp(32px,6vw,96px)" }}>
          <h2 id="ledger-faq" style={h2}>{L("faqTitle")}</h2>
          <div style={{ borderTop: "1px solid var(--ink)" }}>
            {raw("faq").map((f) => (
              <details key={f.q} style={{ borderBottom: "1px solid var(--rule)" }}>
                <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 16, padding: "20px 0", minHeight: 44, fontSize: 18, fontWeight: 500 }}>
                  {f.q}<span className="num" aria-hidden="true" style={{ color: "var(--muted)" }}>+</span>
                </summary>
                <p className="serif" style={{ ...body, margin: "0 0 22px", maxWidth: "36em" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div style={{ ...wrap, paddingTop: 56, paddingBottom: 40, display: "grid", gap: 40 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 24, alignItems: "flex-end" }}>
            <p className="serif" style={{ margin: 0, fontStyle: "italic", fontSize: "clamp(24px,3vw,36px)", maxWidth: "18em", lineHeight: 1.25 }}>{L("colophon")}</p>
            <span className="serif" aria-hidden="true" style={{ fontSize: 28 }}>❦</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, paddingTop: 24, borderTop: "1px solid var(--ink-2)", fontSize: 13, color: "#C9C1B3" }}>
            <span dir="ltr">{L("byline")}</span>
            <span>{L("safetyFooter")}</span>
          </div>
          <nav aria-label={t("site.nav.privacy")} style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", fontSize: 13 }}>
            <Link to={to("/privacy")} className="ledger-foot">{t("site.nav.privacy")}</Link>
            <Link to={to("/terms")} className="ledger-foot">{t("site.nav.terms")}</Link>
            <span style={{ color: "#C9C1B3" }}>{t("site.footer.rights")}</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

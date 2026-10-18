// /dev/directions — v7 Phase 1. Three creative directions as scrolling boards.
// Dev only (see Root.jsx). Self-contained: its own fonts, colours and
// keyframes, so nothing here touches the app's tokens until one is chosen.
import React, { useEffect } from "react";

// Real figures from the Formulation method: 100 mL at 25% -> 23.75 g oil,
// 60.75 g alcohol, 84.50 g batch.
const FIG = { oil: "23.75", alcohol: "60.75", total: "84.50" };

const FONTS =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500&family=Reem+Kufi:wght@500;700&family=Cormorant+Garamond:ital,wght@0,300;1,300;1,500&family=Manrope:wght@400;500&family=Aref+Ruqaa:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=Hanken+Grotesk:wght@400;500&family=Readex+Pro:wght@400;600&display=swap";

const CSS = `
.dx{font-family:'Hanken Grotesk',system-ui,sans-serif;background:#f4f1ea;color:#1b1814}
.dx *{box-sizing:border-box}
.dx-top{padding:48px 24px 24px;max-width:1100px;margin:0 auto}
.dx-top h1{font:500 40px/1.1 'Instrument Serif',serif;margin:0 0 12px}
.dx-top p{max-width:60ch;line-height:1.55;margin:0 0 8px}
.dx-board{border-top:1px solid #1b181433;padding:56px 24px 72px}
.dx-in{max-width:1100px;margin:0 auto;display:grid;gap:40px}
.dx-tag{font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.dx-idea{font-size:26px;line-height:1.25;max-width:34ch;margin:8px 0 0}
.dx-sw{display:flex;gap:0;border:1px solid #0003}
.dx-sw div{flex:1;min-height:64px;padding:8px;font-size:11px;display:flex;align-items:flex-end}
.dx-type{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media(max-width:700px){.dx-type,.dx-bench{grid-template-columns:1fr!important}}
.dx-hero{position:relative;min-height:420px;overflow:hidden;padding:32px;display:flex;flex-direction:column;justify-content:flex-end}
.dx-bench{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px}
.dx-lbl{font-size:12px;opacity:.7;margin-bottom:8px}
.dx-rec{padding:40px 24px 80px;max-width:1100px;margin:0 auto;border-top:1px solid #1b181433}
.dx-rec h2{font:500 28px/1.2 'Instrument Serif',serif;margin:0 0 12px}
.dx-rec li{margin:6px 0;line-height:1.5}

/* A: Weighed — the number strip rolls to 84.50 while the pan fills */
@keyframes dxa-roll{from{transform:translateY(0)}to{transform:translateY(calc(-100% * 10 / 11))}}
@keyframes dxa-fill{from{transform:scaleY(.04)}to{transform:scaleY(1)}}
.dxa-col{height:1em;overflow:hidden;display:inline-block;line-height:1}
.dxa-strip{display:flex;flex-direction:column;animation:dxa-roll 4s cubic-bezier(.2,0,0,1) infinite alternate}
.dxa-pan{transform-origin:bottom;animation:dxa-fill 4s cubic-bezier(.2,0,0,1) infinite alternate}

/* B: Smoke — threads rise, blur, dissolve; rooms are threads */
@keyframes dxb-rise{0%{transform:translate3d(0,40px,0) scale(.8);opacity:0}25%{opacity:.7}100%{transform:translate3d(var(--dx,20px),-380px,0) scale(1.6);opacity:0}}
.dxb-puff{position:absolute;bottom:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#e8c9a0aa,#e8c9a000 70%);filter:blur(14px);animation:dxb-rise 7s ease-out infinite}

/* C: Rest — a marker travels day 0 to 28 while the ground warms */
@keyframes dxc-run{from{left:0}to{left:calc(100% - 2px)}}
@keyframes dxc-warm{from{background-color:#e9ecef}to{background-color:#e7c9a4}}
.dxc-hero{animation:dxc-warm 8s linear infinite alternate}
.dxc-mark{position:absolute;top:0;bottom:0;width:2px;background:#7a1f12;animation:dxc-run 8s linear infinite alternate}

@media(prefers-reduced-motion:reduce){
 .dxa-strip,.dxa-pan,.dxb-puff,.dxc-hero,.dxc-mark{animation:none}
 .dxa-strip{transform:translateY(calc(-100% * 10 / 11))}.dxb-puff{opacity:.4}
}
`;

const DIGITS = "0123456789".split("");

function Roll({ target }) {
  // Last-digit strip only: enough to sketch "results count in".
  return (
    <span className="dxa-col" aria-label={target}>
      <span className="dxa-strip" aria-hidden="true">
        {[...DIGITS, target.slice(-1)].map((d, i) => <span key={i}>{d}</span>)}
      </span>
    </span>
  );
}

function Board({ id, tag, idea, palette, fonts, hero, bench, motion, mood, bg, fg, children }) {
  return (
    <section className="dx-board" id={id} style={{ background: bg, color: fg }}>
      <div className="dx-in">
        <div>
          <div className="dx-tag">{tag}</div>
          <p className="dx-idea" style={{ fontFamily: fonts.display }}>{idea}</p>
        </div>
        <div>
          <div className="dx-lbl">Palette</div>
          <div className="dx-sw">
            {palette.map(([name, hex, dark]) => (
              <div key={hex} style={{ background: hex, color: dark ? "#fff" : "#111" }}>{name}<br />{hex}</div>
            ))}
          </div>
        </div>
        <div className="dx-type">
          <div>
            <div className="dx-lbl">Type, English: {fonts.names}</div>
            <div style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 1.05 }}>100 mL at 25%. {FIG.total} g.</div>
            <p style={{ fontFamily: fonts.ui, maxWidth: "44ch", lineHeight: 1.55 }}>Tare the beaker. Add the oil first, then the alcohol. Record the weight you read, not the weight you aimed for.</p>
          </div>
          <div dir="rtl" lang="ar">
            <div className="dx-lbl" dir="ltr">Type, Arabic: {fonts.namesAr}</div>
            <div style={{ fontFamily: fonts.displayAr, fontSize: 44, lineHeight: 1.3 }}>١٠٠ مل بتركيز ٢٥٪. ٨٤٫٥٠ غ.</div>
            <p style={{ fontFamily: fonts.uiAr, maxWidth: "44ch", lineHeight: 1.9 }}>اضبط الميزان على الصفر. أضف الزيت أولًا ثم الكحول. سجّل الوزن الذي قرأته لا الذي قصدته.</p>
          </div>
        </div>
        <div>
          <div className="dx-lbl">Homepage hero</div>
          {hero}
          <p style={{ fontFamily: fonts.ui, opacity: .8, fontSize: 14 }}>{motion}</p>
        </div>
        <div>
          <div className="dx-lbl">The Bench</div>
          {bench}
        </div>
        <div>
          <div className="dx-lbl">Mood</div>
          <p style={{ fontFamily: fonts.ui, maxWidth: "60ch", lineHeight: 1.6, margin: 0 }}>{mood}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function BenchMock({ ground, ink, accent, line, display, ui, radius = 0 }) {
  const row = (k, v) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${line}` }}>
      <span style={{ fontFamily: ui }}>{k}</span>
      <span style={{ fontFamily: display, fontSize: 24 }}>{v} g</span>
    </div>
  );
  return (
    <div className="dx-bench" style={{ background: ground, color: ink, border: `1px solid ${line}`, borderRadius: radius }}>
      <div>
        <div style={{ fontFamily: ui, fontSize: 13, opacity: .7 }}>Batch</div>
        <div style={{ fontFamily: display, fontSize: 28 }}>100 mL · 25% · Extrait-leaning EDP</div>
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          {["30", "50", "100"].map((n) => (
            <span key={n} style={{ fontFamily: ui, minWidth: 44, minHeight: 44, display: "grid", placeItems: "center", border: `1px solid ${n === "100" ? accent : line}`, color: n === "100" ? accent : ink, borderRadius: radius }}>{n}</span>
          ))}
        </div>
      </div>
      <div>
        {row("Fragrance oil", FIG.oil)}
        {row("Perfumer's alcohol 96%", FIG.alcohol)}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 14, color: accent }}>
          <span style={{ fontFamily: ui }}>Batch weight</span>
          <span style={{ fontFamily: display, fontSize: 40 }}>{FIG.total} g</span>
        </div>
        <div style={{ fontFamily: ui, fontSize: 13, opacity: .7, marginTop: 8 }}>Rest 14 days. Day 1 check-in due tomorrow.</div>
      </div>
    </div>
  );
}

export default function Directions() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  const A = { display: "'Instrument Serif',serif", ui: "'Instrument Sans',sans-serif", displayAr: "'Reem Kufi',sans-serif", uiAr: "'Readex Pro',sans-serif", names: "Instrument Serif + Instrument Sans", namesAr: "Reem Kufi + Readex Pro" };
  const B = { display: "'Cormorant Garamond',serif", ui: "'Manrope',sans-serif", displayAr: "'Aref Ruqaa',serif", uiAr: "'Readex Pro',sans-serif", names: "Cormorant Garamond Light Italic + Manrope", namesAr: "Aref Ruqaa + Readex Pro" };
  const C = { display: "'Bricolage Grotesque',sans-serif", ui: "'Hanken Grotesk',sans-serif", displayAr: "'Readex Pro',sans-serif", uiAr: "'Readex Pro',sans-serif", names: "Bricolage Grotesque ExtraBold + Hanken Grotesk", namesAr: "Readex Pro" };

  return (
    <div className="dx">
      <style>{CSS}</style>
      <header className="dx-top">
        <h1>Kyphira: three directions</h1>
        <p>Each board is one idea, executed the same way on the hero, the Bench and the motion. They differ in concept, not just colour. Real figures: 100 mL at 25% is {FIG.oil} g oil, {FIG.alcohol} g alcohol, {FIG.total} g batch.</p>
        <p>Jump to <a href="#a">A. Weighed</a> · <a href="#b">B. Smoke</a> · <a href="#c">C. Rest</a> · <a href="#rec">recommendation</a>. Reduced motion stops every sketch.</p>
      </header>

      <Board
        id="a" tag="Direction A" fonts={A} bg="#f4f1ea" fg="#1b1814"
        idea="Weight is the unit of the interface: every number is a reading on a balance, and every screen settles to a value before you read it."
        palette={[["Bone", "#f4f1ea"], ["Graphite", "#1b1814", 1], ["Brass pan", "#b8893a"], ["Verdigris", "#2f6f62", 1], ["Chalk line", "#d9d3c5"]]}
        hero={
          <div className="dx-hero" style={{ background: "#ebe6da", border: "1px solid #d9d3c5" }}>
            <div className="dxa-pan" style={{ position: "absolute", insetInline: 0, bottom: 0, height: "100%", background: "linear-gradient(#b8893a00,#b8893a33)" }} aria-hidden="true" />
            <div style={{ position: "relative", fontFamily: A.display, fontSize: "clamp(96px,22vw,220px)", lineHeight: .9 }}>
              84.5<Roll target="0" /><span style={{ fontSize: "0.3em", marginInlineStart: 8 }}>g</span>
            </div>
            <div style={{ position: "relative", fontFamily: A.ui, maxWidth: "36ch", marginTop: 12 }}>The batch weighs 84.50 g. Make it. Wear it. Know it.</div>
          </div>
        }
        motion="Motion sketch: the final digit rolls like a dial and the pan fills as the number settles (4 s loop here; on the site it is driven by scroll). Transform and opacity only."
        bench={<BenchMock ground="#fbf9f4" ink="#1b1814" accent="#2f6f62" line="#d9d3c5" display={A.display} ui={A.ui} />}
        mood="A balance room at noon. Paper, brass, one green light when a reading is stable. Silence around big numerals; the page scrolls like pouring, not like a feed. Rooms are pans you load: Bench, Wardrobe, Library, Atlas, Salon, Nose each get a weight."
      />

      <Board
        id="b" tag="Direction B" fonts={B} bg="#14110e" fg="#eadfce"
        idea="Smoke is navigation: pages are threads that rise from the ember and dissolve into the next room."
        palette={[["Soot", "#14110e", 1], ["Ember", "#d4924a"], ["Ash", "#8c8174", 1], ["Resin", "#5a3a22", 1], ["Haze", "#eadfce"]]}
        hero={
          <div className="dx-hero" style={{ background: "#1c1713", border: "1px solid #3b332b" }}>
            {[0, 1.2, 2.4, 3.6, 4.8].map((d, i) => (
              <span key={i} className="dxb-puff" aria-hidden="true" style={{ insetInlineStart: `${12 + i * 17}%`, animationDelay: `${d}s`, ["--dx"]: `${(i % 2 ? -1 : 1) * 30}px` }} />
            ))}
            <div style={{ position: "relative", fontFamily: B.display, fontStyle: "italic", fontWeight: 300, fontSize: "clamp(56px,12vw,128px)", lineHeight: .95 }}>It begins<br />with a burn.</div>
            <div style={{ position: "relative", fontFamily: B.ui, color: "#d4924a", marginTop: 12 }}>Kyphira, كيفيرا. Six rooms, one ember.</div>
          </div>
        }
        motion="Motion sketch: threads of warm haze rise and dissolve; on the site they rise with scroll and the thread you follow becomes the next room's header. Canvas, paused off-screen."
        bench={<BenchMock ground="#1c1713" ink="#eadfce" accent="#d4924a" line="#3b332b" display={B.display} ui={B.ui} radius={2} />}
        mood="A laboratory at dusk, one lamp. Dark by default with a warm light theme. Large italic serif against black, hairlines in ash, the only colour is ember. Slow, atmospheric, cinematic at the opener, and still at the Bench where numbers must be read."
      />

      <Board
        id="c" tag="Direction C" fonts={C} bg="#e9ecef" fg="#14181c"
        idea="Time is the material: scroll is days of maceration, and every screen shows how far along the thing you are making has come."
        palette={[["Slate", "#e9ecef"], ["Ink", "#14181c", 1], ["Oxblood", "#7a1f12", 1], ["Amber", "#e7c9a4"], ["Steel", "#5b6770", 1]]}
        hero={
          <div className="dx-hero dxc-hero" style={{ border: "1px solid #5b677055" }}>
            <div className="dxc-mark" aria-hidden="true" />
            <div style={{ position: "absolute", insetInline: 0, top: 24, display: "flex", justifyContent: "space-between", fontFamily: C.ui, fontSize: 12, padding: "0 12px" }} aria-hidden="true">
              {["Day 0", "7", "14", "21", "28"].map((d) => <span key={d}>{d}</span>)}
            </div>
            <div style={{ position: "relative", fontFamily: C.display, fontWeight: 800, fontSize: "clamp(64px,14vw,160px)", lineHeight: .9, letterSpacing: "-.03em" }}>Rest<br />14 days.</div>
            <div style={{ position: "relative", fontFamily: C.ui, marginTop: 12, maxWidth: "38ch" }}>A perfume is a batch plus time. Kyphira keeps the time.</div>
          </div>
        }
        motion="Motion sketch: a marker crosses 28 days and the ground warms from slate to amber as the oil matures. On the site the marker is the scroll position; each room shows its own clock."
        bench={<BenchMock ground="#f5f6f8" ink="#14181c" accent="#7a1f12" line="#b9c0c6" display={C.display} ui={C.ui} />}
        mood="A workshop wall calendar. Cool slate and sharp grotesque type, with oxblood for anything that is due. Dense, graphic, timeline-led; the Journal and its check-ins become the spine of the whole site. Least atmospheric, most useful."
      />

      <section className="dx-rec" id="rec">
        <h2>Recommendation: A, Weighed</h2>
        <ul>
          <li>It is the only idea that is already true of the product: the Bench is a scale, and grams are what the owner's books teach.</li>
          <li>It is the cheapest to run at 60 fps: number rolls and fills are transform and opacity, and it needs no canvas, so LCP and the 170 KB script budget stay reachable (production LCP is 2.9 s today).</li>
          <li>It gives Arabic a clear job: whole numerals and lines settle, never letter by letter.</li>
          <li>B is the strongest mood but repeats the Compounding scene and the dark-first look already shipped. C is the most useful but the least memorable first screen.</li>
          <li>Tell me A, B, C, or a mix (for example A with B's ember in the dark theme) and I continue through Phases 2 to 7 without asking again.</li>
        </ul>
      </section>
    </div>
  );
}

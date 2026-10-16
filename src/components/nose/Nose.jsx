import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { askNose } from "../../lib/aiApi";
import { flagOn } from "../../lib/flags";
import { fragranceHref } from "../../lib/atlas/entities.js";
import { Button, Chip, FragranceCard, Notice, RoomHeader, RoomPage } from "../kx";
import { listBottles, listWear } from "../../lib/wardrobeApi";
import { localDay } from "../../lib/wardrobe/day";
import { daysSince, lastWornOn } from "../../lib/wardrobe/stats";
import { inputClass, inputStyle } from "../wardrobe/ui";

const STARTERS = ["warm", "fresh", "office", "sweet"];
const MAX = 500;

// The error code the API sends → the nose.errors key.
const ERRORS = { nose_off: "off", nose_limit: "limit", rate_limited: "limit", nose_busy: "busy", feature_locked: "locked" };

// The Nose room (behind the "nose" flag): describe a scent, get real
// fragrances from the catalog with the accords that matched. The AI only
// reads the question and picks among catalog rows; it is never the source of
// a fragrance's notes. Signed-in only. The conversation lives on this screen
// only: nothing is kept. The thinking card shows while the request is open and
// goes when it ends, answered or not; nothing is faked or delayed.
export default function Nose() {
  const { t, locale } = useI18n();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState([]); // [{ q, status: "pending" | "done" | "error", result?, error? }]
  const [shelf, setShelf] = useState(null);
  const atlasOn = flagOn("atlas");
  const wardrobeOn = flagOn("wardrobe");
  const busy = turns.some((x) => x.status === "pending");
  const end = useRef(null);

  // The asker's own bottles, for the side card (the Wardrobe's data, private to them).
  useEffect(() => {
    if (!wardrobeOn) return undefined;
    let live = true;
    Promise.all([listBottles(), listWear()]).then(([b, w]) => { if (live) setShelf({ bottles: b.filter((x) => x.status === "owned"), wear: w }); }).catch(() => {});
    return () => { live = false; };
  }, [wardrobeOn]);

  async function ask(text) {
    const q = text.trim();
    if (busy) return;
    if (q.length < 3) return setTurns((l) => [...l, { q, status: "error", error: t("nose.errors.short") }]);
    const id = Date.now();
    setTurns((l) => [...l, { id, q, status: "pending" }]);
    setQuestion("");
    try {
      const result = await askNose(q, locale === "ar" ? "ar" : "en");
      setTurns((l) => l.map((x) => (x.id === id ? { ...x, status: "done", result } : x)));
    } catch (e) {
      const key = ERRORS[e?.code] ?? (e?.status === 503 && /not configured/i.test(e?.message ?? "") ? "unconfigured" : "failed");
      setTurns((l) => l.map((x) => (x.id === id ? { ...x, status: "error", error: t(`nose.errors.${key}`) } : x)));
    }
  }
  useEffect(() => { end.current?.scrollIntoView?.({ block: "nearest" }); }, [turns]);

  const today = localDay();
  const worn = (b) => {
    const last = shelf ? lastWornOn(shelf.wear, b.id) : null;
    return last ? t("nose.shelfWorn", { n: daysSince(last, today) }) : null;
  };

  return (
    <RoomPage>
      <RoomHeader num="VI" kicker={t("nose.title")} title={t("nose.headline")} />
      <p className="text-sm max-w-prose -mt-4" style={{ color: COLORS.inkSoft }}>{t("nose.lead")}</p>
      <Notice tone="info">{t("nose.safety")}</Notice>

      <div className="grid gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="flex flex-col gap-8 min-w-0">
          <div aria-live="polite" className="flex flex-col gap-8">
            {turns.map((x, i) => (
              <div key={x.id ?? i} className="flex flex-col gap-5">
                <p className="self-end max-w-[85%] px-4 py-3 rounded-sm text-[17px]" dir="auto" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>{x.q}</p>
                {x.status === "pending" && <Thinking t={t} />}
                {x.status === "error" && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{x.error}</p>}
                {x.status === "done" && (
                  <div className="nose-answer flex flex-col gap-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case" style={{ color: COLORS.dim }}>
                      <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: COLORS.amber }} />{t("nose.title")}
                    </p>
                    {x.result?.kind === "none" && <p style={{ color: COLORS.inkSoft }}>{t("nose.none")}</p>}
                    {x.result?.kind === "redirect" && (
                      <div>
                        <p className="max-w-prose" style={{ color: COLORS.ink }}>{t(`nose.redirect.${x.result.reason}`)}</p>
                        {x.result.reason === "diy" && <Button as={Link} to="/bench" variant="secondary" className="mt-3">{t("nose.openBench")}</Button>}
                      </div>
                    )}
                    {x.result?.kind === "picks" && <Picks result={x.result} atlasOn={atlasOn} t={t} />}
                    {x.result?.shelf?.length > 0 && <Shelf shelf={x.result.shelf} wardrobeOn={wardrobeOn} t={t} />}
                  </div>
                )}
              </div>
            ))}
            <div ref={end} />
          </div>

          <div role="group" aria-label={t("nose.startersLabel")} className="flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <Chip key={s} onClick={() => { if (!busy) ask(t(`nose.starters.${s}`)); }}>{t(`nose.starters.${s}`)}</Chip>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(question); }} noValidate className="flex flex-col gap-2">
            <label htmlFor="nose-q" className="sr-only">{t("nose.label")}</label>
            <div className="flex gap-2 items-stretch">
              <textarea id="nose-q" rows={2} maxLength={MAX} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("nose.placeholder")}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(question); } }}
                className={`${inputClass} py-3 flex-1 min-h-[52px] resize-none`} style={inputStyle} aria-describedby="nose-hint nose-privacy" />
              <Button type="submit" size="lg" loading={busy} className="on-resin shrink-0">{busy ? t("nose.asking") : t("nose.ask")}</Button>
            </div>
            <p id="nose-hint" className="text-xs" style={{ color: COLORS.dim }}>{t("nose.hint")}</p>
            <p id="nose-privacy" className="text-xs" style={{ color: COLORS.dim }}>{t("nose.privacy")}</p>
          </form>
        </div>

        {wardrobeOn && shelf && shelf.bottles.length > 0 && (
          <aside aria-labelledby="nose-side-h" className="p-6 rounded-sm" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
            <div className="flex items-baseline justify-between gap-3 pb-3.5" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <h2 id="nose-side-h" className="text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case" style={{ color: COLORS.dim }}>{t("nose.shelf.title")}</h2>
              <span className="text-xs" style={{ color: COLORS.dim }}>{t("nose.shelfCount", { bottles: shelf.bottles.length, wears: shelf.wear.length })}</span>
            </div>
            <ul>
              {shelf.bottles.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-baseline justify-between gap-3 py-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                  <span className="font-serif text-xl rtl:leading-[1.5]" dir="auto">{b.name}</span>
                  <span className="text-xs shrink-0" style={{ color: COLORS.dim }}>{worn(b)}</span>
                </li>
              ))}
            </ul>
            <Link to="/wardrobe?section=collection" className="inline-flex items-center mt-3 text-sm underline underline-offset-4 min-h-[44px]" style={{ color: COLORS.actionText }}>{t("nose.shelf.open")}</Link>
          </aside>
        )}
      </div>
    </RoomPage>
  );
}

// While a question is open: the card and one marker, 2 s ambient loop, and a
// hairline that fills. Gone the moment the request ends.
function Thinking({ t }) {
  return (
    <div role="status" className="p-5 rounded-sm flex flex-col gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <p className="flex items-center gap-3 text-[15px]">
        <span aria-hidden="true" className="nose-marker w-2 h-2 rounded-full" style={{ background: COLORS.amber }} />{t("nose.thinking")}
      </p>
      <span aria-hidden="true" className="block h-px relative overflow-hidden" style={{ background: COLORS.line }}><span className="nose-fill block h-px w-full origin-left" style={{ background: COLORS.amber }} /></span>
    </div>
  );
}

function Picks({ result, atlasOn, t }) {
  return (
    <section aria-labelledby="nose-results-h">
      <h2 id="nose-results-h" className="font-serif text-2xl mb-1 rtl:leading-[1.5]" style={{ color: COLORS.ink }}>{t("nose.heading")}</h2>
      {result.intro && <p className="text-sm mb-4 max-w-prose" style={{ color: COLORS.inkSoft }}>{result.intro}</p>}
      <ul className="list-none p-0 m-0" style={{ borderTop: `1px solid ${COLORS.dim}` }}>
        {result.picks.map((p) => (
          <FragranceCard key={p.id} name={p.name} href={atlasOn ? fragranceHref(p.id) : undefined}
            facts={[p.brand, p.year ? String(p.year) : null, p.family]} accords={p.accords ?? p.matched ?? []} matched={p.matched ?? []}>
            {p.reason && <p className="text-sm mt-2 max-w-prose" style={{ color: COLORS.ink }}>{p.reason}</p>}
            {p.matched?.length > 0 && <p className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{t("nose.matched", { list: p.matched.join(", ") })}</p>}
          </FragranceCard>
        ))}
      </ul>
    </section>
  );
}

// Bottles the asker already owns that fit: matched on the server, never by the AI.
function Shelf({ shelf, wardrobeOn, t }) {
  return (
    <section aria-labelledby="nose-shelf-h" className="mt-8">
      <h2 id="nose-shelf-h" className="font-serif text-2xl mb-1 rtl:leading-[1.5]" style={{ color: COLORS.ink }}>{t("nose.shelf.title")}</h2>
      <p className="text-sm mb-4 max-w-prose" style={{ color: COLORS.inkSoft }}>{t("nose.shelf.lead")}</p>
      <ul className="grid gap-2 list-none p-0 m-0">
        {shelf.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
            <span className="font-serif text-lg me-auto" style={{ color: COLORS.ink }}>{b.name}</span>
            {b.matched.length > 0 ? b.matched.map((a) => <Chip key={a}>{a}</Chip>) : <Chip>{t("nose.shelf.byFamily")}</Chip>}
          </li>
        ))}
      </ul>
      {wardrobeOn && <Link to="/wardrobe" className="inline-flex items-center mt-3 text-sm underline underline-offset-4 min-h-[44px]" style={{ color: COLORS.ink }}>{t("nose.shelf.open")}</Link>}
    </section>
  );
}

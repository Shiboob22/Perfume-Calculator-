import React, { useState } from "react";
import { Link, Reveal, Stagger } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { askNose } from "../../lib/aiApi";
import { flagOn } from "../../lib/flags";
import { fragranceHref } from "../../lib/atlas/entities.js";
import { Button, Chip, FragranceCard, Notice } from "../kx";
import { inputClass, inputStyle } from "../wardrobe/ui";
import RoomShell from "../kx/RoomShell";

const STARTERS = ["warm", "fresh", "office", "sweet"];
const MAX = 500;

// The error code the API sends → the nose.errors key.
const ERRORS = { nose_off: "off", nose_limit: "limit", rate_limited: "limit", nose_busy: "busy", feature_locked: "locked" };

// The Nose room (behind the "nose" flag): describe a scent, get real
// fragrances from the catalog with the accords that matched. The AI only
// reads the question and picks among catalog rows; it is never the source of
// a fragrance's notes. Signed-in only. One question at a time, nothing kept.
export default function Nose() {
  const { t, locale } = useI18n();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const atlasOn = flagOn("atlas");
  const wardrobeOn = flagOn("wardrobe");

  async function ask(text) {
    const q = text.trim();
    if (busy) return;
    if (q.length < 3) return setError(t("nose.errors.short"));
    setError(""); setResult(null); setBusy(true);
    try {
      setResult(await askNose(q, locale === "ar" ? "ar" : "en"));
    } catch (e) {
      const key = ERRORS[e?.code] ?? (e?.status === 503 && /not configured/i.test(e?.message ?? "") ? "unconfigured" : "failed");
      setError(t(`nose.errors.${key}`));
    } finally { setBusy(false); }
  }

  return (
    <RoomShell wide numeral="VI" name={t("nose.title")} headline={t("nose.headline")} lead={t("nose.lead")}
      notice={<Notice tone="info" className="mt-4">{t("nose.safety")}</Notice>}>
      <form onSubmit={(e) => { e.preventDefault(); ask(question); }} noValidate className="grid gap-3 max-w-3xl">
        <div>
          <label htmlFor="nose-q" className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("nose.label")}</label>
          <textarea id="nose-q" rows={3} maxLength={MAX} value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(question); } }}
            className={`${inputClass} py-2`} style={inputStyle} aria-describedby="nose-hint nose-privacy" />
          <p id="nose-hint" className="text-xs mt-1" style={{ color: COLORS.dim }}>{t("nose.hint")}</p>
          <p id="nose-privacy" className="text-xs mt-1" style={{ color: COLORS.dim }}>{t("nose.privacy")}</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Button type="submit" loading={busy}>{busy ? t("nose.asking") : t("nose.ask")}</Button>
        </div>
        <div role="group" aria-label={t("nose.startersLabel")} className="flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button key={s} type="button" disabled={busy}
              onClick={() => { const text = t(`nose.starters.${s}`); setQuestion(text); ask(text); }}
              className="px-3 min-h-[44px] text-sm border" style={{ borderColor: COLORS.line, color: COLORS.ink, background: COLORS.card }}>
              {t(`nose.starters.${s}`)}
            </button>
          ))}
        </div>
      </form>

      <div aria-live="polite" className="mt-6">
        {busy && (
          <p className="flex items-center gap-3 text-sm" style={{ color: COLORS.inkSoft }}>
            <span aria-hidden="true" className="cmp-breath block w-2.5 h-2.5 rounded-full" style={{ background: COLORS.oil, boxShadow: "0 0 14px 4px color-mix(in srgb, var(--c-oil) 45%, transparent)" }} /><span aria-hidden="true" className="kx-think inline-flex gap-1"><i /><i /><i /></span>{t("nose.thinking")}
          </p>
        )}
        {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}><Reveal as="span" eager key={error}>{error}</Reveal></p>}
        {result?.kind === "none" && <Reveal as="p" eager className="text-sm" style={{ color: COLORS.inkSoft }}>{t("nose.none")}</Reveal>}
        {result?.kind === "redirect" && (
          <Reveal eager>
            <p className="text-sm max-w-prose" style={{ color: COLORS.ink }}>{t(`nose.redirect.${result.reason}`)}</p>
            {result.reason === "diy" && <Button as={Link} to="/bench" variant="secondary" className="mt-3">{t("nose.openBench")}</Button>}
          </Reveal>
        )}
        {/* Picks on the left; on wide screens the shelf sits beside them (the board's shelf panel). */}
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-10 lg:items-start">
          {result?.kind === "picks" ? <Picks result={result} atlasOn={atlasOn} t={t} /> : <span />}
          {result?.shelf?.length > 0 && <Shelf shelf={result.shelf} wardrobeOn={wardrobeOn} t={t} />}
        </div>
      </div>
    </RoomShell>
  );
}

function Picks({ result, atlasOn, t }) {
  return (
    <Reveal as="section" eager aria-labelledby="nose-results-h">
      <h2 id="nose-results-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("nose.heading")}</h2>
      {result.intro && <p className="text-sm mb-4 max-w-prose" style={{ color: COLORS.inkSoft }}>{result.intro}</p>}
      <Stagger as="ul" eager key={result.picks.map((p) => p.id).join(",")} className="grid gap-3 list-none p-0 m-0">
        {result.picks.map((p) => (
          <FragranceCard key={p.id} name={p.name} href={atlasOn ? fragranceHref(p.id) : undefined}
            facts={[p.brand, p.year ? String(p.year) : null, p.family]} accords={p.accords ?? p.matched ?? []} matched={p.matched ?? []}>
            {p.reason && <p className="text-sm mt-2 max-w-prose" style={{ color: COLORS.ink }}>{p.reason}</p>}
            {p.matched?.length > 0 && <p className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{t("nose.matched", { list: p.matched.join(", ") })}</p>}
          </FragranceCard>
        ))}
      </Stagger>
    </Reveal>
  );
}

// Bottles the asker already owns that fit: matched on the server, never by the AI.
function Shelf({ shelf, wardrobeOn, t }) {
  return (
    <Reveal as="section" eager aria-labelledby="nose-shelf-h" className="mt-8 xl:mt-0 xl:p-5 xl:rounded xl:border" style={{ borderColor: COLORS.line }}>
      <h2 id="nose-shelf-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("nose.shelf.title")}</h2>
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
    </Reveal>
  );
}

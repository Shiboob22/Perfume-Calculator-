import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { searchCatalog } from "../../lib/searchApi";
import { profileFromRow } from "../../lib/selector";
import { SCORING } from "../../lib/selector/config";

const STATUSES = ["loved", "disliked", "unsure"];

// Loved / disliked / unsure picks, found through the app's own catalog
// search. `known` is [{status, profile}] in pick order; the same fragrance
// can hold one status only.
export default function KnownStep({ known, onChange }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ status: "idle", rows: [] });
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setState({ status: "idle", rows: [] }); return; }
    const mine = ++seq.current;
    setState((s) => ({ ...s, status: "loading" }));
    const timer = setTimeout(async () => {
      try {
        const { results } = await searchCatalog(q);
        if (mine === seq.current) setState({ status: "done", rows: results.slice(0, 6) });
      } catch {
        if (mine === seq.current) setState({ status: "error", rows: [] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const statusOf = (id) => known.find((k) => k.profile.id === String(id))?.status;
  function pick(row, status) {
    const profile = profileFromRow(row);
    if (!profile || profile.confidence < SCORING.minConfidence) return;
    const rest = known.filter((k) => k.profile.id !== profile.id);
    onChange(statusOf(profile.id) === status ? rest : [...rest, { status, profile }]);
  }
  const remove = (id) => onChange(known.filter((k) => k.profile.id !== id));

  const btn = (active) => ({
    border: `1px solid ${active ? COLORS.actionText : COLORS.field}`,
    background: active ? COLORS.sand : "transparent",
    color: active ? COLORS.actionText : COLORS.ink,
  });

  return (
    <div>
      <p className="mb-4 text-[15px]" style={{ color: COLORS.inkSoft }}>{t("selector.known.lede")}</p>
      <label htmlFor="selector-known-search" className="block text-sm mb-1" style={{ color: COLORS.ink }}>{t("selector.known.search")}</label>
      <input id="selector-known-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
        aria-describedby="selector-known-hint" className="w-full px-3 py-3 rounded-sm text-base min-h-[48px]"
        style={{ background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` }} />
      <p id="selector-known-hint" className="mt-1 text-xs" style={{ color: COLORS.dim }}>{t("selector.known.searchHint")}</p>

      <div aria-live="polite" className="mt-3">
        {state.status === "loading" && <p className="text-sm" style={{ color: COLORS.dim }}>{t("selector.known.searching")}</p>}
        {state.status === "error" && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{t("selector.known.failed")}</p>}
        {state.status === "done" && state.rows.length === 0 && <p className="text-sm" style={{ color: COLORS.dim }}>{t("selector.known.none", { query: query.trim() })}</p>}
      </div>
      {state.rows.length > 0 && (
        <ul className="mt-2 border-t" style={{ borderColor: COLORS.line }}>
          {state.rows.map((row) => {
            const usable = (() => { const p = profileFromRow(row); return !!p && p.confidence >= SCORING.minConfidence; })();
            const current = statusOf(row.id);
            return (
              <li key={row.id} className="py-3 border-b flex flex-wrap items-center gap-x-4 gap-y-2" style={{ borderColor: COLORS.line }}>
                <div className="min-w-0 flex-1 basis-48">
                  <div className="text-[15px] break-words" style={{ color: COLORS.ink }}>{row.name}</div>
                  {row.brand && <div className="text-xs" style={{ color: COLORS.dim }}>{row.brand}</div>}
                  {!usable && <div className="text-xs mt-1" style={{ color: COLORS.dim }}>{t("selector.known.noProfile")}</div>}
                </div>
                {usable && (
                  <div className="flex gap-2" role="group" aria-label={row.name}>
                    {STATUSES.map((s) => (
                      <button key={s} type="button" aria-pressed={current === s} onClick={() => pick(row, s)}
                        className="px-3 text-sm min-h-[44px] rounded-sm" style={btn(current === s)}>{t(`selector.known.${s}`)}</button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6">
        {known.length === 0 && <p className="text-sm" style={{ color: COLORS.dim }}>{t("selector.known.listEmpty")}</p>}
        {STATUSES.map((s) => {
          const items = known.filter((k) => k.status === s);
          if (!items.length) return null;
          return (
            <section key={s} className="mb-4">
              <h3 className="text-sm font-medium mb-1" style={{ color: COLORS.ink }}>{t(`selector.known.group${s[0].toUpperCase()}${s.slice(1)}`)}</h3>
              <ul>
                {items.map((k) => (
                  <li key={k.profile.id} className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderColor: COLORS.line }}>
                    <span className="text-[15px] break-words min-w-0" style={{ color: COLORS.ink }}>
                      {k.profile.name}{k.profile.brand ? <span style={{ color: COLORS.dim }}> — {k.profile.brand}</span> : null}
                    </span>
                    <button type="button" onClick={() => remove(k.profile.id)} aria-label={t("selector.known.remove", { name: k.profile.name })}
                      className="min-h-[44px] min-w-[44px] text-lg leading-none" style={{ color: COLORS.inkSoft }}>×</button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

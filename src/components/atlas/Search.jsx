import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { searchAtlas } from "../../lib/atlasApi";
import { EMPTY_FILTERS, isEmpty, parseFilters, toParams } from "../../lib/atlas/filters";
import { FAMILIES } from "../../lib/wardrobe/framework";
import Button from "../kx/Button";
import Chip from "../kx/Chip";
import Field from "../kx/Field";
import { SelectField } from "../wardrobe/ui";
import ResultList from "./ResultList";

// The Atlas search. The URL holds the search (so it can be linked and
// reloaded); the form edits a draft and applies it on submit.
export default function Search() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const applied = parseFilters(params);
  const key = params.toString();
  const [draft, setDraft] = useState(applied);
  const [state, setState] = useState({ status: "idle", rows: [], total: 0 });

  useEffect(() => { setDraft(parseFilters(params)); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- follow the URL (back/forward)

  useEffect(() => {
    const filters = parseFilters(params);
    if (isEmpty(filters)) { setState({ status: "idle", rows: [], total: 0 }); return undefined; }
    let live = true;
    setState((s) => ({ ...s, status: "loading" }));
    searchAtlas(filters)
      .then(({ rows, total }) => { if (live) setState({ status: "done", rows, total }); })
      .catch(() => { if (live) setState({ status: "failed", rows: [], total: 0 }); });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `params` is what `key` stands for

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const submit = (e) => { e.preventDefault(); setParams(toParams({ ...draft, page: 1 })); };
  const year = (k) => (e) => set({ [k]: e.target.value === "" ? null : e.target.value });

  // Chips apply at once (the URL holds the search); the text fields apply on submit.
  const apply = (patch) => setParams(toParams({ ...applied, ...patch, page: 1 }));
  const ERAS = [["all", null, null], ["pre1980", null, 1979], ["1980s", 1980, 1999], ["2000s", 2000, 2009], ["2010s", 2010, null]];
  const eraOn = (from, to) => (applied.from ?? null) === from && (applied.to ?? null) === to;

  return (
    <section aria-labelledby="atlas-search-h" className="grid gap-8 min-[1000px]:grid-cols-[300px_minmax(0,1fr)] items-start">
      <h2 id="atlas-search-h" className="sr-only">{t("atlas.search.label")}</h2>
      <form onSubmit={submit} role="search" aria-label={t("atlas.search.label")} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Field label={t("atlas.search.label")} type="search" value={draft.q} onChange={(e) => set({ q: e.target.value })} placeholder={t("atlas.search.placeholder")} autoComplete="off" maxLength={120} />
          <Button type="submit" variant="secondary">{t("atlas.search.submit")}</Button>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case mb-3" style={{ color: COLORS.dim }}>{t("atlas.search.family")}</p>
          <div role="group" aria-label={t("atlas.search.family")} className="flex flex-wrap gap-2">
            {FAMILIES.map((f) => <Chip key={f} pressed={applied.family === f} onClick={() => apply({ family: applied.family === f ? "" : f })}>{t(`families.${f}.label`)}</Chip>)}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case mb-3" style={{ color: COLORS.dim }}>{t("atlas.search.era")}</p>
          <div role="group" aria-label={t("atlas.search.era")} className="flex flex-wrap gap-2">
            {ERAS.map(([id, from, to]) => <Chip key={id} pressed={eraOn(from, to)} onClick={() => apply({ from, to })}>{t(`atlas.search.eras.${id}`)}</Chip>)}
          </div>
        </div>
        <details open={!!(applied.house || applied.note || applied.accord || applied.perfumer)}>
          <summary className="cursor-pointer text-sm min-h-[44px] inline-flex items-center underline underline-offset-4" style={{ color: COLORS.inkSoft }}>{t("atlas.search.filters")}</summary>
          <div className="grid gap-4 mt-3">
            <Field label={t("atlas.search.house")} value={draft.house} onChange={(e) => set({ house: e.target.value })} maxLength={120} />
            <Field label={t("atlas.search.note")} value={draft.note} onChange={(e) => set({ note: e.target.value })} maxLength={120} />
            <Field label={t("atlas.search.accord")} value={draft.accord} onChange={(e) => set({ accord: e.target.value })} maxLength={120} />
            <Field label={t("atlas.search.perfumer")} value={draft.perfumer} onChange={(e) => set({ perfumer: e.target.value })} maxLength={120} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("atlas.search.from")} mono inputMode="numeric" value={draft.from ?? ""} onChange={year("from")} dir="ltr" />
              <Field label={t("atlas.search.to")} mono inputMode="numeric" value={draft.to ?? ""} onChange={year("to")} dir="ltr" />
            </div>
          </div>
        </details>
        {!isEmpty(applied) && <Button variant="ghost" onClick={() => setParams({})} className="self-start">{t("atlas.search.clear")}</Button>}
      </form>

      <div className="min-w-0">
        {state.status === "idle" && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("atlas.search.start")}</p>}
        {state.status === "loading" && <p role="status" className="text-xs" style={{ color: COLORS.inkSoft }}>…</p>}
        {state.status === "failed" && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{t("atlas.search.failed")}</p>}
        {state.status === "done" && (state.total === 0
          ? <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("atlas.search.none")}</p>
          : <ResultList rows={state.rows} total={state.total} page={applied.page} onPage={(p) => setParams(toParams({ ...applied, page: p }))} />)}
      </div>
    </section>
  );
}

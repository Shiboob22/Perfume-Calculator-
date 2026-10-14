import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { searchAtlas } from "../../lib/atlasApi";
import { EMPTY_FILTERS, isEmpty, parseFilters, toParams } from "../../lib/atlas/filters";
import { FAMILIES } from "../../lib/wardrobe/framework";
import Button from "../kx/Button";
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

  return (
    <section aria-labelledby="atlas-search-h">
      <h2 id="atlas-search-h" className="sr-only">{t("atlas.search.label")}</h2>
      <form onSubmit={submit} role="search" aria-label={t("atlas.search.label")} className="grid gap-4">
        <Field label={t("atlas.search.label")} type="search" value={draft.q} onChange={(e) => set({ q: e.target.value })} placeholder={t("atlas.search.placeholder")} autoComplete="off" maxLength={120} />
        <details open={!!(applied.family || applied.house || applied.note || applied.accord || applied.perfumer || applied.from || applied.to)}>
          <summary className="cursor-pointer text-sm min-h-[44px] inline-flex items-center" style={{ color: COLORS.forestDeep }}>{t("atlas.search.filters")}</summary>
          <div className="grid gap-4 sm:grid-cols-2 mt-3">
            <SelectField label={t("atlas.search.family")} value={draft.family} onChange={(v) => set({ family: v })}
              options={[{ value: "", label: t("atlas.search.familyAny") }, ...FAMILIES.map((f) => ({ value: f, label: t(`families.${f}.label`) }))]} />
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
        <div className="flex flex-wrap gap-3">
          <Button type="submit">{t("atlas.search.submit")}</Button>
          {!isEmpty(applied) && <Button variant="ghost" onClick={() => setParams({})}>{t("atlas.search.clear")}</Button>}
        </div>
      </form>

      <div className="mt-8">
        {state.status === "idle" && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("atlas.search.start")}</p>}
        {state.status === "loading" && <p role="status" className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>…</p>}
        {state.status === "failed" && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{t("atlas.search.failed")}</p>}
        {state.status === "done" && (state.total === 0
          ? <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("atlas.search.none")}</p>
          : <ResultList rows={state.rows} total={state.total} page={applied.page} onPage={(p) => setParams(toParams({ ...applied, page: p }))} />)}
      </div>
    </section>
  );
}

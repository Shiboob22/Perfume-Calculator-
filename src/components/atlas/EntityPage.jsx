import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { getEntity, searchAtlas } from "../../lib/atlasApi";
import { ENTITY, termName } from "../../lib/atlas/entities";
import { EMPTY_FILTERS } from "../../lib/atlas/filters";
import ResultList from "./ResultList";

// One house, note, accord or perfumer: what the catalog says about it, and
// its fragrances.
export default function EntityPage({ kind, entityKey, terms }) {
  const { t, locale } = useI18n();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.min(500, Number(params.get("page")) || 1));
  const [entity, setEntity] = useState(undefined); // undefined loading, null missing
  const [state, setState] = useState({ status: "loading", rows: [], total: 0 });

  useEffect(() => {
    let live = true;
    getEntity(kind, entityKey).then((e) => { if (live) setEntity(e); }).catch(() => { if (live) setEntity(null); });
    return () => { live = false; };
  }, [kind, entityKey]);

  useEffect(() => {
    if (entity === undefined) return undefined; // wait for the entity's own name
    let live = true;
    setState((s) => ({ ...s, status: "loading" }));
    // The entity's own name (not its lower-case key) filters; the function compares case-insensitively.
    searchAtlas({ ...EMPTY_FILTERS, [ENTITY[kind].field]: entity?.name ?? entityKey, page })
      .then(({ rows, total }) => { if (live) setState({ status: "done", rows, total }); })
      .catch(() => { if (live) setState({ status: "failed", rows: [], total: 0 }); });
    return () => { live = false; };
  }, [kind, entityKey, entity, page]);

  const name = termName(terms, kind, entityKey, locale, entity?.name ?? entityKey);
  return (
    <section aria-labelledby="atlas-entity-h">
      <Link to="/atlas/browse" className="text-sm underline underline-offset-4 inline-flex items-center min-h-[44px]" style={{ color: COLORS.forest }}>{t("atlas.entity.back")}</Link>
      <p className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal mt-2" style={{ color: COLORS.dim }}>{t(`atlas.entity.kind.${kind}`)}</p>
      <h2 id="atlas-entity-h" className="font-serif text-3xl mb-2" style={{ color: COLORS.ink }}>{name}</h2>
      {entity === null && state.status === "done" && state.total === 0 && <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("atlas.entity.notFound")}</p>}
      {entity && (
        <ul className="text-sm mb-6 grid gap-1 list-none p-0" style={{ color: COLORS.inkSoft }}>
          {entity.first_year && <li className="font-mono tabular-nums">{t("atlas.entity.years", { from: entity.first_year, to: entity.last_year })}</li>}
          {entity.avg_rating && <li className="font-mono tabular-nums">{t("atlas.entity.rating", { rating: Number(entity.avg_rating).toFixed(2) })}</li>}
          {kind === "note" && <li>{t("atlas.entity.layers", { top: entity.top, heart: entity.heart, base: entity.base })}</li>}
        </ul>
      )}
      {state.status === "failed" && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{t("atlas.loadFailed")}</p>}
      {state.status === "done" && state.total > 0 && <ResultList rows={state.rows} total={state.total} page={page} onPage={(p) => setParams(p > 1 ? { page: String(p) } : {})} />}
    </section>
  );
}

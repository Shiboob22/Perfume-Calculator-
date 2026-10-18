import React, { useEffect, useState } from "react";
import { Link, Stagger } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { listEntities } from "../../lib/atlasApi";
import { ENTITY_KINDS, entityHref, termName } from "../../lib/atlas/entities";
import Field from "../kx/Field";

// Houses, notes, accords and perfumers: the biggest first, filterable.
export default function Browse({ terms }) {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState("house");
  const [q, setQ] = useState("");
  const [state, setState] = useState({ status: "loading", rows: [] });

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, status: "loading" }));
    const timer = setTimeout(() => {
      listEntities(kind, { q })
        .then((rows) => { if (live) setState({ status: "done", rows }); })
        .catch(() => { if (live) setState({ status: "failed", rows: [] }); });
    }, q ? 250 : 0);
    return () => { live = false; clearTimeout(timer); };
  }, [kind, q]);

  return (
    <section aria-labelledby="atlas-browse-h">
      <h2 id="atlas-browse-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("atlas.browse.title")}</h2>
      <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>{t("atlas.browse.lead")}</p>
      <div role="group" aria-label={t("atlas.browse.title")} className="flex flex-wrap gap-2 mb-4">
        {ENTITY_KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setQ(""); }}
            className="px-3 min-h-[44px] text-sm border" style={{ borderColor: kind === k ? COLORS.forest : COLORS.line, color: kind === k ? COLORS.forestDeep : COLORS.inkSoft }}>
            {t(`atlas.browse.kinds.${k}`)}
          </button>
        ))}
      </div>
      <Field label={t("atlas.browse.filter", { kind: t(`atlas.browse.kinds.${kind}`).toLowerCase() })} value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} className="mb-4 max-w-sm" />
      {state.status === "failed" && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{t("atlas.loadFailed")}</p>}
      {state.status === "done" && state.rows.length === 0 && <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("atlas.browse.none")}</p>}
      <Stagger as="ul" eager key={kind} className="grid gap-2 sm:grid-cols-2 list-none p-0 m-0">
        {state.rows.map((r) => (
          <li key={r.key}>
            <Link to={entityHref(kind, r.key)} className="flex items-baseline justify-between gap-3 px-4 min-h-[44px] py-2 border" style={{ borderColor: COLORS.line, background: COLORS.card, color: COLORS.ink }}>
              <span>{termName(terms, kind, r.key, locale, r.name)}</span>
              <span className="font-mono tabular-nums text-xs" dir="ltr" style={{ color: COLORS.inkSoft }}>{t("atlas.browse.count", { n: r.fragrances })}</span>
            </Link>
          </li>
        ))}
      </Stagger>
    </section>
  );
}

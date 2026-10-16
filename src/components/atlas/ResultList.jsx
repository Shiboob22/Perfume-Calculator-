import React from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { fragranceHref } from "../../lib/atlas/entities";
import { PAGE_SIZE, pageCount } from "../../lib/atlas/filters";
import Button from "../kx/Button";
import FragranceCard from "../kx/FragranceCard";

// Search results (also used for an entity's fragrances): a link, a line of
// facts, the first accords, and previous/next.
export function ResultRow({ f, no }) {
  const { t } = useI18n();
  return (
    <FragranceCard no={no} name={f.name} href={fragranceHref(f.id)} accords={(f.accords ?? []).slice(0, 3)}
      facts={[f.brand, f.year ? String(f.year) : null, f.tier ? t(`families.${f.tier}.label`) : null]} />
  );
}

export default function ResultList({ rows, total, page, onPage }) {
  const { t } = useI18n();
  const pages = pageCount(total);
  return (
    <>
      <p role="status" className="text-sm mb-3 tabular-nums" style={{ color: COLORS.inkSoft }}>
        {total === 1 ? t("atlas.search.resultsOne") : t("atlas.search.results", { count: total })}
      </p>
      <ul className="list-none p-0 m-0" style={{ borderTop: `1px solid ${COLORS.ink}` }}>{rows.map((f, i) => <ResultRow key={f.id} f={f} no={(page - 1) * PAGE_SIZE + i + 1} />)}</ul>
      {pages > 1 && (
        <nav aria-label={t("atlas.search.page", { page, pages })} className="flex items-center justify-between gap-3 mt-6">
          <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t("atlas.search.prev")}</Button>
          <span className="text-sm font-mono tabular-nums" style={{ color: COLORS.inkSoft }}>{t("atlas.search.page", { page, pages })}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>{t("atlas.search.next")}</Button>
        </nav>
      )}
    </>
  );
}

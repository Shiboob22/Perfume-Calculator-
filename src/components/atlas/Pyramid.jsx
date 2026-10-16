import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { pyramidBands } from "../../lib/atlas/pyramid";
import { entityHref, termName } from "../../lib/atlas/entities";

// The notes in three ruled rows, top, heart and base (Design/boards "Atlas",
// detail). Each note is a real link to that note, so nothing depends on a
// picture.
export default function Pyramid({ fragrance, terms = [] }) {
  const { t, locale } = useI18n();
  const bands = pyramidBands(fragrance);
  if (bands.length === 0) return null;
  return (
    <dl aria-label={t("atlas.fragrance.pyramid")} className="m-0" style={{ borderTop: `1px solid ${COLORS.dim}` }}>
      {bands.map((b) => (
        <div key={b.layer} className="grid grid-cols-[88px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] items-baseline gap-4 py-4" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
          <dt className="text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case" style={{ color: COLORS.dim }}>{t(`atlas.fragrance.layers.${b.layer}`)}</dt>
          <dd className="flex flex-wrap gap-x-2 font-serif text-xl sm:text-2xl m-0">
            {b.notes.map((n, i) => (
              <span key={n}>
                <Link to={entityHref("note", n)} className="underline-offset-4 hover:underline inline-flex items-center min-h-[44px]" style={{ color: COLORS.ink }}>
                  {termName(terms, "note", n.toLowerCase(), locale, n)}
                </Link>{i < b.notes.length - 1 ? "," : ""}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { layout, pyramidBands } from "../../lib/atlas/pyramid";
import { entityHref, termName } from "../../lib/atlas/entities";

// Notes as light: three bands, top bright and thin, heart warm, base deep and
// wide. The light is a decorative layer behind the words; the notes are real
// text, each a link to that note, so nothing depends on the picture.
export default function Pyramid({ fragrance, terms = [] }) {
  const { t, locale } = useI18n();
  const bands = layout(pyramidBands(fragrance));
  if (bands.length === 0) return null;
  return (
    <figure aria-label={t("atlas.fragrance.pyramid")} className="grid gap-1.5 m-0">
      {bands.map((b) => (
        <div key={b.layer} className="relative px-4 py-3 overflow-hidden" style={{ minHeight: `${Math.round(b.height * 1.1)}px`, border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
          {/* The light: as wide as the band's reach, as strong as its weight. Start edge in both directions. */}
          <span aria-hidden="true" className="absolute inset-y-0 start-0" style={{ width: `${b.width}%`, background: COLORS.resin, opacity: b.opacity * 0.3 }} />
          <div className="relative">
            <h3 className="text-xs uppercase tracking-[0.15em] rtl:tracking-normal mb-1" style={{ color: COLORS.inkSoft }}>{t(`atlas.fragrance.layers.${b.layer}`)}</h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 list-none p-0 m-0">
              {b.notes.map((n) => (
                <li key={n}>
                  <Link to={entityHref("note", n)} className="underline-offset-4 hover:underline text-base inline-flex items-center min-h-[44px]" style={{ color: COLORS.ink }}>
                    {termName(terms, "note", n.toLowerCase(), locale, n)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </figure>
  );
}

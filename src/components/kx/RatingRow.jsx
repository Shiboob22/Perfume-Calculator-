import React, { useId } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";

const SIZES = { sm: "w-10 h-10 text-[13px]", md: "w-11 h-11 text-[14px]", lg: "w-12 h-12 text-[15px]" };

// The 1–5 rating row (Journal note, quick-note sheet, buyer page), with its two
// ends named under it so 5 reads as best (UI/UX audit M6). Tapping the chosen
// number again clears it.
export default function RatingRow({ value, onChange, label, itemLabel, lead, size = "md" }) {
  const { t } = useI18n();
  const ends = useId();
  return (
    <div role="group" aria-label={label} aria-describedby={ends} className="flex flex-wrap items-center gap-2">
      {lead && <span aria-hidden="true" className="text-sm me-1" style={{ color: COLORS.inkSoft }}>{lead}</span>}
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={value >= n} aria-label={itemLabel(n)} onClick={() => onChange(value === n ? 0 : n)}
              className={`${SIZES[size]} rounded-full tabular-nums`}
              style={{ border: `1px solid ${value >= n ? COLORS.amber : COLORS.line}`, background: value >= n ? COLORS.amber : "transparent", color: value >= n ? COLORS.onAmber : COLORS.inkSoft }}>
              {n}
            </button>
          ))}
        </div>
        <div data-rating-ends aria-hidden="true" className="flex justify-between gap-3 text-xs" style={{ color: COLORS.inkSoft }}>
          <span>{t("rating.low")}</span><span>{t("rating.high")}</span>
        </div>
        <span id={ends} className="sr-only">{t("rating.ends")}</span>
      </div>
    </div>
  );
}

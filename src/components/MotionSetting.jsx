import React, { useEffect, useId, useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { LEVELS, currentLevel, setLevel } from "../motion";

// Motion M6: how much Kyphira moves on this device (Full, Calm, Off). Native
// radios in a fieldset, so arrow keys and screen readers work as they expect;
// drawn as one segmented row. Kept on the device; applied at once.
const reduceQuery = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function MotionSetting({ compact = false, className = "" }) {
  const { t } = useI18n();
  const name = useId();
  const [level, setLocal] = useState(null); // unknown until mounted (the prerender can't know)
  const [system, setSystem] = useState(false);
  useEffect(() => { setLocal(currentLevel()); setSystem(reduceQuery()); }, []);
  const choose = (v) => { setLevel(v); setLocal(v); };

  return (
    <fieldset data-motion-setting className={`min-w-0 ${className}`}>
      <legend className={compact ? "text-sm mb-1.5" : "mb-2"} style={{ color: compact ? COLORS.inkSoft : COLORS.ink }}>{t("settings.motion.label")}</legend>
      <div className="inline-grid grid-cols-3" style={{ border: `1px solid ${COLORS.field}` }}>
        {LEVELS.map((v) => {
          const on = level === v;
          return (
            <label key={v} className="relative inline-flex items-center justify-center min-h-[44px] px-4 text-sm cursor-pointer focus-within:ring-2"
              style={{ background: on ? COLORS.inkBand : "transparent", color: on ? COLORS.onInk : COLORS.ink, "--tw-ring-color": COLORS.focus }}>
              <input type="radio" name={name} value={v} checked={on} onChange={() => choose(v)} className="sr-only" />
              {t(`settings.motion.${v}`)}
            </label>
          );
        })}
      </div>
      {!compact && level && <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft }}>{t(`settings.motion.hint.${level}`)}</p>}
      {system && <p className="mt-1 text-xs" style={{ color: COLORS.dim }}>{t("settings.motion.system")}</p>}
    </fieldset>
  );
}

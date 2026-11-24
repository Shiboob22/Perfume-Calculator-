import React, { useEffect, useId, useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { SOUND_LEVELS, soundLevel, setSoundLevel, play } from "../lib/sound";

// Sound: Off (default), Soft, On. Drawn like MotionSetting: native radios in a
// fieldset, one segmented row. A choice other than Off plays the tare tick so
// the reader hears the level they picked.
export default function SoundSetting({ compact = false, className = "" }) {
  const { t } = useI18n();
  const name = useId();
  const [level, setLocal] = useState(null);
  useEffect(() => { setLocal(soundLevel()); }, []);
  const choose = (v) => { setSoundLevel(v); setLocal(v); if (v !== "off") play("tare"); };

  return (
    <fieldset data-sound-setting className={`min-w-0 ${className}`}>
      <legend className={compact ? "text-sm mb-1.5" : "mb-2"} style={{ color: compact ? COLORS.inkSoft : COLORS.ink }}>{t("settings.sound.label")}</legend>
      <div className="inline-grid grid-cols-3" style={{ border: `1px solid ${COLORS.field}` }}>
        {SOUND_LEVELS.map((v) => {
          const on = level === v;
          return (
            <label key={v} className="relative inline-flex items-center justify-center min-h-[44px] px-4 text-sm cursor-pointer focus-within:ring-2"
              style={{ background: on ? COLORS.inkBand : "transparent", color: on ? COLORS.onInk : COLORS.ink, "--tw-ring-color": COLORS.focus }}>
              <input type="radio" name={name} value={v} checked={on} onChange={() => choose(v)} className="sr-only" />
              {t(`settings.sound.${v}`)}
            </label>
          );
        })}
      </div>
      {!compact && level && <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft }}>{t(`settings.sound.hint.${level}`)}</p>}
    </fieldset>
  );
}

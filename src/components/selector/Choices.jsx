import React from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { IconCheck } from "../icons";

const CARD =
  "relative flex items-center gap-3 min-h-[52px] px-4 py-3 border cursor-pointer select-none " +
  "border-[var(--c-field)] bg-[var(--c-card-hi)] text-[var(--c-ink)] " +
  "peer-checked:border-[var(--c-amber)] peer-checked:bg-[var(--c-sand)] peer-checked:shadow-[inset_0_0_0_1px_var(--c-amber)] " +
  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--c-focus)] " +
  "peer-disabled:opacity-50 peer-disabled:cursor-not-allowed hover:bg-[var(--c-sand)]";

function Choice({ type, name, label, checked, disabled, onChange }) {
  const { t } = useI18n();
  return (
    <label className="block">
      <input type={type} name={name} checked={checked} disabled={disabled} onChange={onChange} className="sr-only peer" />
      <span className={CARD}>
        <span className="flex-1 text-[15px] leading-snug">{label}</span>
        {checked && <span className="shrink-0" style={{ color: "var(--c-amber)" }}><IconCheck size={18} /><span className="sr-only">{t("selector.selected")}</span></span>}
      </span>
    </label>
  );
}

// One question's answer control. single/scale: radio group; multi: checkboxes
// capped at `max`. `value` is the stored answer (string, string[] or 1-5).
export default function Choices({ question, value, onChange }) {
  const { t } = useI18n();
  const base = `selector.q.${question.id}`;
  if (question.kind === "scale") {
    const levels = t.raw(`${base}.levels`) || [];
    return (
      <div className="grid gap-2">
        {levels.map((label, i) => (
          <Choice key={i} type="radio" name={question.id} label={label} checked={value === i + 1} onChange={() => onChange(i + 1)} />
        ))}
      </div>
    );
  }
  const multi = question.kind === "multi";
  const picked = multi ? (Array.isArray(value) ? value : []) : [];
  const full = multi && question.max !== undefined && picked.length >= question.max;
  const two = question.options.length >= 6;
  return (
    <div className={`grid gap-2 ${two ? "sm:grid-cols-2" : ""}`}>
      {question.options.map((o) => {
        const checked = multi ? picked.includes(o.id) : value === o.id;
        return (
          <Choice key={o.id} type={multi ? "checkbox" : "radio"} name={question.id} label={t(`${base}.options.${o.id}`)}
            checked={checked} disabled={multi && full && !checked}
            onChange={() => onChange(multi ? (checked ? picked.filter((x) => x !== o.id) : [...picked, o.id]) : o.id)} />
        );
      })}
    </div>
  );
}

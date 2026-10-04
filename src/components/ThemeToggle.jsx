import React, { useEffect, useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";

// Light (paper) or dark ground. Follows the system until the reader picks
// one; the choice is kept in localStorage and applied before first paint by
// the inline script in index.html.
const effective = () =>
  document.documentElement.dataset.theme ||
  (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export default function ThemeToggle({ className = "", style }) {
  const { t } = useI18n();
  const [theme, setTheme] = useState(null); // unknown until mounted (prerendered HTML can't know)
  useEffect(() => setTheme(effective()), []);
  const next = theme === "dark" ? "light" : "dark";
  const choose = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* private mode: still switches for this page */ }
    setTheme(next);
  };
  return (
    <button type="button" onClick={choose} aria-label={t("settings.theme.label")}
      aria-pressed={theme === "dark"}
      className={`text-sm min-h-[44px] px-1 hover:underline underline-offset-4 ${className}`}
      style={{ color: COLORS.inkSoft, ...style }}>
      {t(theme === "dark" ? "settings.theme.light" : "settings.theme.dark")}
    </button>
  );
}

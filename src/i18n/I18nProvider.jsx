import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createTranslator, dirOf, matchLocale, LOCALES, NUMBERING_SYSTEM, NUMBERING_SYSTEMS } from "./core";
import { loadArabicFonts } from "./arabicFonts";
import en from "./messages/en";
import ar from "./messages/ar";

const CATALOGS = { en, ar };
const STORAGE_KEY = "sh-locale";
const DIGITS_KEY = "sh-digits";

function initialDigits() {
  try {
    const saved = localStorage.getItem(DIGITS_KEY);
    if (NUMBERING_SYSTEMS.includes(saved)) return saved;
  } catch {}
  return NUMBERING_SYSTEM;
}

// A saved choice wins; otherwise the browser's language list decides.
function initialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LOCALES.includes(saved)) return saved;
  } catch {}
  return matchLocale(typeof navigator === "undefined" ? [] : navigator.languages);
}

const I18nContext = createContext(null);

// `locale` forces the language — public pages take it from the URL (/ar/…),
// so the server and the browser render the same HTML. The app itself uses
// the saved choice.
export function I18nProvider({ children, locale: forced }) {
  const [chosen, setLocaleState] = useState(() => forced || initialLocale());
  const locale = forced || chosen;
  // Public pages always prerender with Western digits; the setting applies in the app.
  const [digits, setDigitsState] = useState(() => (forced ? NUMBERING_SYSTEM : initialDigits()));
  const dir = dirOf(locale);

  // <html lang dir> drives the browser's bidi layout and Tailwind's rtl: variant.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    if (locale === "ar") loadArabicFonts();
    // Reading /ar/… also sets the language the app opens in.
    if (forced) { try { localStorage.setItem(STORAGE_KEY, forced); } catch {} }
  }, [locale, dir, forced]);

  const value = useMemo(() => {
    function setLocale(next) {
      if (!LOCALES.includes(next)) return;
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      setLocaleState(next);
    }
    function setDigits(next) {
      if (!NUMBERING_SYSTEMS.includes(next)) return;
      try { localStorage.setItem(DIGITS_KEY, next); } catch {}
      setDigitsState(next);
    }
    return {
      locale, dir, setLocale, digits, setDigits,
      t: createTranslator(locale, CATALOGS, undefined, { numberingSystem: digits }),
    };
  }, [locale, dir, digits]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

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

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [digits, setDigitsState] = useState(initialDigits);
  const dir = dirOf(locale);

  // <html lang dir> drives the browser's bidi layout and Tailwind's rtl: variant.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    if (locale === "ar") loadArabicFonts();
  }, [locale, dir]);

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

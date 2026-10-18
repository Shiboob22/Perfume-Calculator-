import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createTranslator, dirOf, matchLocale, LOCALES, NUMBERING_SYSTEM } from "./core";
import { loadArabicFonts } from "./arabicFonts";
import { CATALOGS, loadCatalog } from "./catalogs";
const STORAGE_KEY = "sh-locale";

// A saved choice wins; otherwise the browser's language list decides.
export function initialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LOCALES.includes(saved)) return saved;
  } catch {}
  return matchLocale(typeof navigator === "undefined" ? [] : navigator.languages);
}

// Whether this browser already has its own language choice. A choice saved
// to the account applies only where there is none, so a device someone
// switched by hand keeps what they picked there.
export function hasLocalChoice() {
  try { return localStorage.getItem(STORAGE_KEY) != null; } catch { return false; }
}

const I18nContext = createContext(null);

// `locale` forces the language — public pages take it from the URL (/ar/…),
// so the server and the browser render the same HTML. The app itself uses
// the saved choice.
export function I18nProvider({ children, locale: forced }) {
  const [chosen, setLocaleState] = useState(() => forced || initialLocale());
  const locale = forced || chosen;
  // A language reached without the main.jsx preload (a client-side link to /ar/…, or a language saved to the
  // account) renders in English for the moment its catalog is fetched, then re-renders.
  const [, bump] = useState(0);
  const loaded = Boolean(CATALOGS[locale]);
  useEffect(() => {
    if (loaded) return undefined;
    let live = true;
    loadCatalog(locale).then(() => live && bump((n) => n + 1));
    return () => { live = false; };
  }, [locale, loaded]);
  // One digit style everywhere, in both languages: Western, as the scale
  // shows them (design brief, 2026-10-16). A digit style saved earlier, on the
  // device or the account, is kept but no longer read.
  const digits = NUMBERING_SYSTEM;
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
      loadCatalog(next).then(() => setLocaleState(next));
    }
    return {
      locale, dir, setLocale, digits,
      t: createTranslator(locale, CATALOGS, undefined, { numberingSystem: digits }),
    };
  }, [locale, dir, digits, loaded]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

// Framework-free translation core. Messages are nested objects of strings;
// a plural message is an object keyed by Intl.PluralRules categories
// (zero · one · two · few · many · other). Arabic uses all six, English two.

export const LOCALES = ["en", "ar"];
export const DEFAULT_LOCALE = "en";
const RTL = new Set(["ar"]);

// Western digits by default, so figures match what a scale shows. Arabic-
// Indic digits ("arab") are a per-user setting for text; calculator figures
// stay Western either way.
export const NUMBERING_SYSTEM = "latn";
export const NUMBERING_SYSTEMS = ["latn", "arab"];

export function dirOf(locale) {
  return RTL.has(locale) ? "rtl" : "ltr";
}

// First supported locale in a list of BCP 47 tags ("ar-EG" → "ar").
export function matchLocale(tags) {
  for (const tag of tags || []) {
    const base = String(tag).toLowerCase().split("-")[0];
    if (LOCALES.includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}

function lookup(messages, key) {
  let node = messages;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return node;
}

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    vars[name] === undefined ? whole : String(vars[name])
  );
}

// A plural message may omit categories a language rarely needs; fall back to
// `other`, which every plural message must define.
function pickPlural(forms, locale, count) {
  const category = new Intl.PluralRules(locale).select(count);
  if (count === 0 && forms.zero !== undefined) return forms.zero;
  return forms[category] ?? forms.other;
}

// t(key, vars): the message in `locale`, else in `fallback`, else the key
// itself (so a missing string is visible, never blank). Numbers passed in
// vars are formatted for the locale; `count` also selects the plural form.
export function createTranslator(locale, catalogs, fallback = DEFAULT_LOCALE, { numberingSystem = NUMBERING_SYSTEM } = {}) {
  const numberFormat = new Intl.NumberFormat(locale, { numberingSystem });
  function t(key, vars = {}) {
    let msg = lookup(catalogs[locale], key);
    let msgLocale = locale;
    if (msg === undefined && locale !== fallback) {
      msg = lookup(catalogs[fallback], key);
      msgLocale = fallback;
    }
    if (msg === undefined) return key;
    if (typeof msg === "object") {
      if (typeof vars.count !== "number") return key;
      msg = pickPlural(msg, msgLocale, vars.count);
      if (typeof msg !== "string") return key;
    }
    const shown = {};
    for (const [k, v] of Object.entries(vars)) {
      shown[k] = typeof v === "number" ? numberFormat.format(v) : v;
    }
    return interpolate(msg, shown);
  }
  // The raw message value — for list-shaped copy (arrays of strings or
  // objects) — in `locale`, else in `fallback`, else undefined.
  t.raw = (key) => {
    const own = lookup(catalogs[locale], key);
    return own !== undefined ? own : lookup(catalogs[fallback], key);
  };
  return t;
}

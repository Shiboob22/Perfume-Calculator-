import en from "./messages/en";

// English is in the first script. Other languages are their own chunk, fetched
// before anything renders in that language (main.jsx and the prerender wait for
// it; switching language waits for it too), so a reader never sees a catalog
// that is not there yet. createTranslator falls back to English per key.
export const CATALOGS = { en };

const LOADERS = { ar: () => import("./messages/ar") };

export function loadCatalog(locale) {
  if (CATALOGS[locale] || !LOADERS[locale]) return Promise.resolve(CATALOGS.en);
  return LOADERS[locale]().then((m) => (CATALOGS[locale] = m.default));
}

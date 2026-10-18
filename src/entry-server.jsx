// Build-time rendering of the public pages (see scripts/prerender.mjs).
import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import Root from "./Root";

import { loadCatalog } from "./i18n/catalogs";

// Arabic is split out of the first script; the prerender loads it before it renders any page.
export const preload = () => loadCatalog("ar");

export { publicPaths, headFor, headHtml } from "./site/meta";

export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <Root />
    </StaticRouter>
  );
}

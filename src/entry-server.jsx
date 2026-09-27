// Build-time rendering of the public pages (see scripts/prerender.mjs).
import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import Root from "./Root";

export { publicPaths, headFor, headHtml } from "./site/meta";

export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <Root />
    </StaticRouter>
  );
}

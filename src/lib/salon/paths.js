// The Salon's addresses. No imports: pages and tests read it.
//   /salon                 the feed (recipes and reviews)
//   /salon/new             write a post
//   /salon/me              my profile and its privacy switch
//   /salon/u/<handle>      someone's profile and posts
//   /salon/moderation      the report queue (editors)
export const profileHref = (handle) => `/salon/u/${encodeURIComponent(String(handle).toLowerCase())}`;

/** pathname → which view and what it needs. Anything unknown is the feed. */
export function parseSalonPath(pathname) {
  const parts = String(pathname).replace(/\/+$/, "").split("/").filter(Boolean).slice(1); // drop "salon"
  const [a, b] = parts;
  if (a === "new") return { view: "new" };
  if (a === "me") return { view: "me" };
  if (a === "moderation") return { view: "moderation" };
  if (a === "u" && b) {
    let handle = "";
    try { handle = decodeURIComponent(b).trim().toLowerCase().slice(0, 30); } catch { handle = ""; }
    if (/^[a-z0-9_]{3,30}$/.test(handle)) return { view: "profile", handle };
  }
  return { view: "feed" };
}

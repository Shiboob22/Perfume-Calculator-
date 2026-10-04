// No imports: the recipe page renders it on the server (Node ESM).
// A fragrance name from a link: no control or bidi-override characters,
// single spaces, at most 120 characters. Empty means none.
export function cleanName(raw) {
  const name = String(raw ?? "")
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .trim();
  return name || null;
}

// Library search, entirely in the browser (the content is small). Text is
// folded so near-spellings match: Latin accents removed; in Arabic, vowel
// marks and tatweel removed, أ/إ/آ → ا, ى → ي, ة → ه.

export function fold(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

// Everything a guide says, as one searchable string.
export function guideText(g) {
  const parts = [g.title, g.summary];
  for (const b of g.body) {
    parts.push(b.h2, b.p, b.quote, b.text, b.title, b.evidence?.label, b.callout?.title, b.callout?.text);
    for (const x of b.list || []) parts.push(x);
    for (const s of b.steps || []) parts.push(s.title, s.text);
    for (const row of b.table?.rows || []) parts.push(...row);
  }
  return parts.filter(Boolean).join(" ");
}

/** Guides whose text contains every word of the query, in library order. */
export function searchGuides(guides, locale, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return guides;
  return guides.filter((g) => {
    const hay = fold(guideText(g[locale]));
    return words.every((w) => hay.includes(w));
  });
}

/** Rough reading time in minutes (words per minute), at least 1. */
export function readingMinutes(g, wpm = 200) {
  const words = guideText(g).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wpm));
}

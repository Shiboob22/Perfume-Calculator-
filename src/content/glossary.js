// The Library's glossary. No definition is written here: each term is a
// section of a guide, and its definition is that section's own text, read
// from the guide in the reader's language. So the glossary never says more
// than the handbooks do, and the Arabic follows the Arabic guide (a draft
// until the author reviews it, like the guide itself).
//
//   term:  { slug, section }       the guide section that names the term (its heading)
//   text:  { slug, section, nth }  the nth text block after that section's heading
//   words: { en, ar }              forms linked where they first appear in other guides
//
// Terms the handbooks use without defining (tare, longevity, maceration…)
// are listed for the author in docs/redesign/DESIGN-BRIEF-AUDIT.md; add them
// here only once a guide carries the definition.
import { GUIDES } from "./guides";

const ENTRIES = [
  { id: "reference-density", term: { slug: "why-weigh", section: "reference-densities" }, text: { slug: "why-weigh", section: "principle", nth: 1 },
    words: { en: ["reference densities", "reference density"], ar: ["الكثافات المرجعية", "الكثافة المرجعية"] } },
  { id: "concentration", term: { slug: "how-fragrance-works", section: "concentration" }, text: { slug: "how-fragrance-works", section: "concentration", nth: 0 },
    words: { en: ["concentration"], ar: ["التركيز"] } },
  { id: "volatility", term: { slug: "how-fragrance-works", section: "volatility" }, text: { slug: "how-fragrance-works", section: "volatility", nth: 0 },
    words: { en: ["volatility"], ar: ["التطاير"] } },
  { id: "projection", term: { slug: "longevity-projection-sillage", section: "projection" }, text: { slug: "longevity-projection-sillage", section: "projection", nth: 0 },
    words: { en: ["projection"], ar: ["الفوحان"] } },
  { id: "sillage", term: { slug: "longevity-projection-sillage", section: "sillage" }, text: { slug: "longevity-projection-sillage", section: "sillage", nth: 0 },
    words: { en: ["sillage"], ar: ["الأثر"] } },
  { id: "olfactory-radius", term: { slug: "sixty-second-protocol", section: "olfactory-radius" }, text: { slug: "sixty-second-protocol", section: "olfactory-radius", nth: 0 },
    words: { en: ["olfactory radius"], ar: ["نطاق الرائحة"] } },
];

/** The plain text a body block carries, or null for headings, tables and lists. */
function blockText(b) {
  if (typeof b.p === "string") return b.p;
  if (typeof b.quote === "string") return b.quote;
  if (b.evidence && typeof b.text === "string") return b.text;
  return null;
}

function section(slug, id, locale) {
  const body = GUIDES.find((g) => g.slug === slug)?.[locale]?.body;
  const at = body?.findIndex((b) => b.h2 && b.id === id) ?? -1;
  if (at < 0) return null;
  const end = body.findIndex((b, i) => i > at && b.h2);
  return { heading: body[at].h2, blocks: body.slice(at + 1, end < 0 ? undefined : end) };
}

/** One term in a language: { id, term, text, slug, section }, or null if the guide doesn't carry it. */
export function glossaryTerm(entry, locale) {
  const head = section(entry.term.slug, entry.term.section, locale);
  const body = section(entry.text.slug, entry.text.section, locale);
  const texts = body?.blocks.map(blockText).filter(Boolean) ?? [];
  if (!head || texts[entry.text.nth] == null) return null;
  return { id: entry.id, term: head.heading, text: texts[entry.text.nth], slug: entry.term.slug, section: entry.term.section };
}

export const GLOSSARY_ENTRIES = ENTRIES;

/**
 * Splits a paragraph into strings and term marks: the first use of each term
 * on the page (tracked in `seen`) becomes { term, match }. A term is not
 * linked inside the section that defines it.
 */
export function markTerms(text, locale, { seen, slug, section: here }) {
  const hits = [];
  for (const e of ENTRIES) {
    if (seen.has(e.id) || (e.text.slug === slug && e.text.section === here) || (e.term.slug === slug && e.term.section === here)) continue;
    for (const w of e.words[locale] ?? []) {
      const re = locale === "ar"
        ? new RegExp(`(^|[^\\u0600-\\u06FF])(${w})(?![\\u0600-\\u06FF])`)
        : new RegExp(`(^|[^A-Za-z])(${w})(?![A-Za-z])`, "i");
      const m = re.exec(text);
      if (m) { hits.push({ id: e.id, start: m.index + m[1].length, match: m[2] }); break; }
    }
  }
  hits.sort((a, b) => a.start - b.start);
  const out = [];
  let pos = 0;
  for (const h of hits) {
    if (h.start < pos) continue;
    if (h.start > pos) out.push(text.slice(pos, h.start));
    out.push({ term: h.id, match: h.match });
    seen.add(h.id);
    pos = h.start + h.match.length;
  }
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}

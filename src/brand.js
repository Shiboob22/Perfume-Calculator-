// One place for the product's name, line, address and legal entity. Plain
// data with no imports: the browser, the prerender and the /api functions
// (api/recipe.ts renders through src/lib/recipePage.js) all read it.
//
// Kyphi was the compound incense of ancient Egypt; its recipes were cut into
// the walls of the laboratory at the Temple of Edfu. Kyphira is a coined name
// on that root. Pronounced kee-FEER-ah.
export const BRAND = Object.freeze({
  name: "Kyphira",
  nameAr: "كيفيرا",
  pronunciation: "kee-FEER-ah",
  // Chosen in Phase 1 (see docs/redesign/PHASE-1.md for why). The older line
  // "Every drop, weighed with care." stays as the bench's own motto.
  tagline: { en: "Make it. Wear it. Know it.", ar: "اصنعه. ارتدِه. اعرفه." },
  benchMotto: { en: "Every drop, weighed with care.", ar: "كل قطرة موزونة بعناية." },
  // The name before the rebrand, for the notice shown to returning users and
  // for redirects/notes. Not shown anywhere else.
  formerName: "Scent Ledger",
  // The owner's printed books. Kept in citations: "From The Scent Handbook, Vol. III".
  booksTitle: "The Scent Handbook",
  author: "Hisham Shiboob",
  // The production origin does not change in this phase (the domain is the
  // owner's to register). VITE_SITE_URL overrides it at build time.
  defaultSiteUrl: "https://scent-handbook-app.vercel.app",
  // [OWNER: legal name or trading name, country] — filled in by the owner.
  legalEntity: "[OWNER: legal name or trading name, country]",
  // How long returning signed-in users see "Scent Ledger is now Kyphira".
  renameNoticeDays: 60,
  // First day of the rebrand's release; the notice counts from here.
  renameNoticeFrom: "2026-10-14",
});

// The name in the given locale: Arabic text carries the Arabic spelling so it
// does not break the right-to-left line.
export const brandName = (locale) => (locale === "ar" ? BRAND.nameAr : BRAND.name);

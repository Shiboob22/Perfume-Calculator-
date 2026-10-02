// Text a user writes that may end up on a public page (a shared recipe's
// note and name), cleaned the same way in the share preview and in the API
// before it is stored. Stored as plain text and escaped again when rendered:
// cleaning alone is never trusted as the defence.

// Bidi embeddings/overrides and isolates (U+202A–202E, U+2066–2069) can
// make text display differently from what it says. The marks LRM/RLM/ALM
// stay: Arabic text with figures needs them. ZWNJ/ZWJ stay for the same
// reason; zero-width space and BOM go.
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069\u200B\uFEFF]/g;
// C0/C1 controls except newline.
// eslint-disable-next-line no-control-regex -- removing control characters is the point
const CONTROLS = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;
const TAGS = /<\/?[a-z!][^>]*>/gi;

/**
 * Plain text of at most `max` characters (code points, as Postgres's
 * char_length counts them), or null when nothing is left.
 */
export function cleanText(input, max) {
  const s = String(input ?? "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(TAGS, "")
    .replace(CONTROLS, "")
    .replace(BIDI_CONTROLS, "")
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const clipped = Array.from(s).slice(0, max).join("").trim();
  return clipped || null;
}

/** The language a note is mostly written in, for its lang attribute. */
export function textLang(text) {
  const s = String(text ?? "");
  const arabic = (s.match(/\p{Script=Arabic}/gu) || []).length;
  const latin = (s.match(/\p{Script=Latin}/gu) || []).length;
  return arabic > latin ? "ar" : "en";
}

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * A recipe URL slug: the name in any script (letters, marks, digits joined
 * by "-", at most 60 characters) plus 6 random characters, so URLs can't be
 * guessed. `randomBytes(n)` returns n random bytes (crypto in the API).
 */
export function recipeSlug(name, randomBytes) {
  const base = Array.from(
    String(name ?? "")
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
  ).slice(0, 60).join("").replace(/-+$/, "");
  const suffix = Array.from(randomBytes(6), (b) => SUFFIX_ALPHABET[b % SUFFIX_ALPHABET.length]).join("");
  return `${base || "recipe"}-${suffix}`;
}

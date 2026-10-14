# Phase 5 — The Atlas (flagged)

Branch `redesign/kyphira-p5-atlas` (off `redesign/kyphira-p4-wardrobe`). The room is **off by default** behind the `atlas` flag (`?flag=atlas`, or `VITE_FLAG_ATLAS=1`), signed-in only. Data-sourcing report: [ATLAS-DATA.md](ATLAS-DATA.md).

## What was built
- **Search** (`atlas_search`, migration 0025): full-text prefix matching, then trigram typo tolerance only when exact matches are few, plus aliases (an Arabic name matches). Filters by note, family, house, accord, perfumer and year range; the whole search lives in the URL. 16 to 360 ms on staging over 81,823 rows (a first version took 2 to 3 s: row-level security stops trigram indexes from being used, so the function runs as definer and returns approved rows only).
- **Pages:** search, browse (houses 2,494, notes 2,108, accords 92, perfumers 1,357), entity pages, fragrance pages.
- **Fragrance page:** facts, **notes as light** (three bands: top bright and thin, heart warm, base deep and wide, drawn behind real text; every note links to its page), accords strongest first, perfumers, related fragrances (the existing `similar_fragrances`), more from the same house, the catalog source, and "add to my Wardrobe" when that room is on.
- **Contribute and review:** anyone signed in can suggest a fragrance (bounded fields; at most 100 pending); it is a pending row only its author sees. Editors (the `admins` table) get a review queue: approve, or reject without deleting anything (a new `rejected` status, so the author's own stock and batches keep their link). Every decision is logged.
- **Community counts from the Wardrobe, opt-in:** off by default; a switch in the Wardrobe. Shown on a fragrance page only when 10 or more opted-in accounts (a week old or more) own it, as "at least N" ranges (10, 25, 50, 100, 250), never exact; occasions named only when 10 people wore it for that occasion; no total of wearings. An automated security review flagged the first version (k=5, exact counts) as open to inference by throwaway accounts; it now uses k=10, rounded buckets and an account-age gate. The residual risk is written in the migration.
- **Arabic:** the full UI in EN and AR (drafts); `atlas_terms` and `atlas_aliases` are searchable and empty (see the report).
- Data: `0025_atlas.sql` (+ down): 4 materialized views, 4 tables/log, 6 functions, 1 index, 1 relaxed check (`status` may be `rejected`), 1 column on `profiles` (`wear_stats_opt_in`, default false). **Staging only.** The catalog's own rows and columns are untouched.

## Not done
- **Public Atlas pages with SEO** (structured data, hreflang, OG images, sitemap): deliberately not built; see the report. The brief's Lighthouse targets for "an Atlas page" therefore don't apply yet.
- **Catalogue numbers** on fragrances: they have no sequence number in the data; I did not invent one.
- **Concentrations:** not in the data, not shown.
- Arabic terms and aliases are empty; scheduled refresh of the browse lists (it is a button for editors; a nightly job needs a scheduler you haven't chosen).
- Not pushed beyond the branch; production has none of migrations 0021 to 0025.

## Tests
Vitest 587 passed. Playwright (local Chrome) 302 passed, 34 skipped (macOS visual baselines). New: 16 Atlas logic tests (filters, addresses, pyramid, contribution), 9 e2e scenarios on phone and desktop (flag off, search and URL filters, fragrance page and the pyramid, unknown search, browse and entity, contribute, duplicate name, review queue for editors and for others, the Wardrobe opt-in, and Arabic at 320 px with axe on six pages). `supabase/tests/atlas_isolation.sql`: **38 checks pass on staging** (pending rows hidden, rejected rows visible only to their author, editor-only functions, the caps, the Arabic alias search, the k-anonymity rules and the account-age gate, anon blocked everywhere). A real bug the tests caught: a `null` in a notes list became a note called "null". ESLint 0 errors; `tsc` clean.

## Lighthouse (mobile)
Not run: the room is signed-in and flagged. Public pages are unchanged since Phase 2.

## Risks and open questions
1. **The Parfumo live scraper in `api/search.ts`**: keep or remove? (see the report.)
2. **Data route** for the Atlas: the options and my recommendation are in the report. Nothing is bought.
3. Arabic review of the Atlas strings, and whether to seed Arabic note/accord names (Wikidata labels are a candidate).
4. Production: migrations 0021 to 0025 need your SQL approval and the backup.

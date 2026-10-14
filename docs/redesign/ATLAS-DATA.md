# The Atlas: data-sourcing report

Owner decision 2026-10-14 (2-a): keep the existing catalog, hide the Atlas behind a flag, defer licensing. This report lists what the catalog is, what it risks, and the licensed routes you could pay for. **Prices and commercial terms below are not verified: where I could not find a figure, it says so.** Nothing here has been bought, signed or scraped.

## 1. What the catalog holds (staging, same as production: 81,823 rows)

| Source label | Rows | Notes | Accords | Perfumers | Year | Rating | Image URL |
|---|---|---|---|---|---|---|---|
| Fragrantica | 68,687 | 46,013 | 67,299 | 26,720 | 54,162 | 62,625 | 68,687 |
| Perfume dataset | 12,665 | 12,665 | 12,665 | 0 | 12,663 | 0 | 12,663 |
| curated (yours and the app's) | 467 | 349 | 393 | 266 | 376 | 385 | 407 |
| custom (users) | 4 | 1 | 1 | 1 | 1 | 1 | 1 |

There is no concentration column (EDT/EDP), so the Atlas does not show one. Release year exists for 67,202 rows.

## 2. Provenance and risk (the part to read)
1. **The 68,687 "Fragrantica" rows** carry that site's name, its community ratings and vote counts (the popularity column is "Fragrantica votes" in `api/search.ts`), and image links on its image host. How they were imported is not recorded in the repository. If they were collected by scraping, that conflicts with the rule for this project ("no scraping"), and a database like this can carry rights separate from copyright in some jurisdictions (the EU's database right is one). I could not retrieve Fragrantica's own terms in my research, so I cannot say what they allow: **a lawyer should read them against how these rows were obtained.**
2. **Images:** 69,100 of 81,758 image links point at Fragrantica's image host (hotlinked, not copied); 12,658 are on your own storage. Hotlinking someone's images is both a licence question and a reliability one.
3. **A live scraper is still in production code:** `api/search.ts` scrapes Parfumo for a signed-in user when the catalog has no match, and saves the result as that user's pending row (`source: "Parfumo (Live Scraped)"`). It predates this redesign and I have not removed it, because removing a feature is yours to decide. It is the one place the app scrapes today. **Decision needed (below).**
4. The "Perfume dataset" rows (12,665) have no recorded licence in the repository either.

## 3. What Phase 5 did about it
- The Atlas is **signed-in only and flagged**; no public pages, no sitemap entries, no search-engine exposure. The public SEO the brief wants for the Atlas (structured data, hreflang, OG images) is deliberately **not** built: publishing 81k pages from data with unclear rights is the risky step. It can follow once the data question is settled.
- Every fragrance page shows its catalog source and says the data may be incomplete.
- No new scraping or imports. New rows come only from users, as pending suggestions, reviewed by an editor first.
- Community counts from the Wardrobe are opt-in, anonymous, rounded and thresholded (see PHASE-5.md).

## 4. Licensed and open routes
| Route | What it is | Rights and cost | Fit |
|---|---|---|---|
| **Fragella API** | Structured JSON: notes, accords, longevity, sillage, season, occasion, images, brands. Its pages claim 13k+ fragrances in the API docs and 74k+ on the homepage (inconsistent). | Plans Free / Basic / Pro / Enterprise with usage limits; **prices not found**. Licence in its terms (updated Nov 2025) is limited, non-exclusive, non-transferable, non-sublicensable, revocable, for apps that connect to the service; I found no clause on caching, redistribution or a public catalogue. It says its search is built on NoseHQ's API, so the underlying rights may sit with a second party. | A live source for a signed-in Atlas; **ask in writing** whether storing and displaying results to your users is covered. |
| **Noteboxd API** | Fragrance API with a free tier (50 calls/day), then pay-as-you-go. | Commercial terms not found. | Worth a written question alongside Fragella. |
| **Wikidata** | Open, CC0 structured data: houses, perfumers, some fragrances, with labels in Arabic. | CC0 is Wikidata's published licence (stated from general knowledge; my search did not return the pages). Fragrance coverage is likely thin. | Free to test: a SPARQL count of perfume items and creators tells you in minutes. Good for house and perfumer names and Arabic labels, not for note pyramids. |
| **House and brand submissions** | Ask houses to submit their own notes and imagery. | Clean rights, free, slow and uneven. | Good for a curated core and for images. |
| **Your own curation + community contributions** | What the Atlas now supports: users suggest, an editor reviews. | Clean if contributors state their own data (the form says so). | Grows slowly; keeps the Atlas defensible. |
| WikiParfum (Puig) | A brand-run reference database. | Licence unknown; do not assume it is reusable. | Reference only. |
| Scraper services (Apify, Decodo, …) | Sell Fragrantica/Parfumo scrapers. | Same legal exposure as scraping yourself. | **Not an option.** |

## 5. Recommendation
1. Keep the Atlas flagged and signed-in only until you choose.
2. Free, this week: run a Wikidata SPARQL count; email Fragella and Noteboxd the same question: "Can a signed-in product store and display your results to its users, and under which plan?"
3. Plan to move imagery to images you host or are licensed to use, and the 68,687 Fragrantica-labelled rows to a licensed source or to the curated and community core, on whatever timetable the lawyer advises.
4. Decide about the Parfumo live scraper (open decision 2).

## 6. Technical notes
- The entity lists (houses, notes, accords, perfumers) are materialized views computed from the catalog; an editor's "Refresh the browse lists" button recomputes them. They are as fresh as the last refresh.
- Arabic names: `atlas_terms` (notes, accords, houses, perfumers) and `atlas_aliases` (a fragrance's Arabic name) exist and are searchable but **empty**: seeding them needs an Arabic review from you, and Wikidata's Arabic labels are a candidate source.

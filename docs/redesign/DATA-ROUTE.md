# Catalog data route: decision record and email drafts

Status 2026-10-15. Nothing has been sent, bought or scraped for this. See `ATLAS-DATA.md` for how the 81,825 rows are made up today.

## The problem

The catalog (68,687 Fragrantica-sourced rows, 12,665 dataset rows, 467 curated, a few custom) cannot be assumed to be ours to store and show in a commercial product. The Atlas, the Selector, the Wardrobe and the Nose all lean on it. The live Parfumo lookup in `api/search.ts` is kept for now at the owner's choice (1-b).

## What was checked

- **Wikidata (free, CC0), queried 2026-10-15:** 369 items are perfumes, 119 have a maker, 21 have an image, 10 have an Arabic label. Useful as a cross-reference for a few famous names, **not** as a catalog.
- A licensed route is therefore needed, or a catalog built from what users add (slow) plus facts that are not copyrightable (names, brands, years, note lists) entered or confirmed by Kyphira itself.

## Decision (proposed; the owner decides)

1. Ask two providers whether a signed-in product may store and display their data, and on what terms (drafts below). Ask for written answers.
2. Take the answers and the current catalog's sources to the lawyer together with `/terms` and `/privacy` (`LEGAL-BRIEF.md`).
3. Plan, on the lawyer's timetable, to replace the imagery and the rows labelled Fragrantica with licensed or self-entered data. Nothing is removed before then ("don't delete working features").
4. Until a route is settled the Atlas stays behind its flag and the Nose and Selector keep reading the catalog as it is. **This blocks a commercial launch of the Atlas, not the Bench or the Library.**

## Draft emails (not sent; fill the brackets, send from your own address)

**To Fragella**

> Subject: Licensing your fragrance data for a signed-in blending app
>
> Hello,
>
> I am the founder of Kyphira, a web app for people who blend their own fragrances at home (kyphira.com / [domain]). We are building a signed-in fragrance reference: a user searches a catalogue and sees a fragrance's house, year, notes and accords.
>
> Could you tell me whether your data can be licensed for this, and on what terms? In particular:
> 1. May we store the data in our own database and show it to signed-in users, or must every view call your API?
> 2. Which fields are included (name, house, year, notes, accords, perfumers, images)? Are images licensed separately?
> 3. Is Arabic or other localized data available?
> 4. What are the prices for [about 80,000] records and for ongoing updates?
> 5. May an AI model read the records to suggest fragrances to a user, with the user's question sent to a model provider?
>
> We are a small, new product, so a simple tier is welcome. I would be grateful for the answers in writing.
>
> Thank you,
> Hisham Shiboob

**To Noteboxd**

> Subject: Data terms for a signed-in fragrance reference
>
> Hello,
>
> I run Kyphira, a web app for home fragrance blenders. We would like to show fragrance information (house, year, notes) to signed-in users and would rather license it properly than build on data we cannot be sure we may use.
>
> Do you offer an API or a data licence? If so: may we store and display the data ourselves, what is included, how is it priced, and are there limits on using it to power recommendations (including with an AI model)? If you do not license data, I would be glad to know that too.
>
> Thank you,
> Hisham Shiboob

(The two emails are drafts. I have not looked up either provider's current offer; the questions are what a lawyer will want answered whichever way they reply.)

## Questions for the lawyer about the existing catalog

- Which of the three sources (Fragrantica-labelled, dataset, curated) can stay as they are, and which must be replaced or relicensed?
- Is showing note lists and accords, without images or text, a risk in your jurisdiction?
- Does the user-added path (ensure_fragrance, Atlas contributions) put the obligation on Kyphira or on the user who adds?

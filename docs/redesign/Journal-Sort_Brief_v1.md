# Journal sort: brief v1

Kyphira · The Journal room (`/journal`, `/ar/journal`) · 2026-11-06 · status: approved 2026-11-06, built on `claude/journal-sort`

## The problem

The Journal shows the same batches twice, in two different orders. "Ready soon" sorts them by days left to 90. The Batches list under it sorts them by number, newest first, and that order can't be changed. On a phone the rail pushes the list below the fold. The visit people make most often ("which batch needs a note?") has no order that serves it.

## Decisions (owner, 2026-11-06)

1. "Ready soon" folds into the Batches list. The rail and its `<h2>` go away.
2. The list gets four sorts: **Needs a note** (default) · **Newest** · **Maceration** · **Size**.
3. Sorting is **Free**. No gate, no upgrade sheet. Free still sees its newest 3 batches (`journalOpen`); the sort orders those 3, and the locked card stays under the list.

## The four sorts

All ordering is pure, in `src/lib/calc/restTracker.ts` (`journalSort(items, key)` plus `needsNote(checkins, day)`), with Vitest cases. The component only passes the key. Every key ends with batch number descending as the final tie-break, so the order is stable.

| Key | URL value | Order | Notes |
|---|---|---|---|
| Needs a note | `note` (default; no param) | Batches whose current milestone has no note come first, and among them the window closing soonest. Every other batch follows, newest first. | See the rule below. |
| Newest | `new` | `batch_no` descending (today's order). | |
| Maceration | `rest` | Started earliest first, so the closest to ready leads and ready batches sit at the top. | Rest is a fixed 90 days, so start date and ready date give one order. One key. |
| Size | `size` | `total_ml` descending, largest first. | See "Size" below. |

### "Needs a note" rule

- A batch needs a note when the milestone it has reached (`milestoneIndex(day)`) has no note in `notesByMilestone()`. A skip is not a note.
- Older missed milestones don't count. That matches the room's "due until the next point, then quietly missed".
- Among batches that need a note: fewest days before the next milestone first, because that window closes soonest. Day 90 (`m3`) has no next milestone, so those batches come last among the due ones.
- A batch logged today needs its Day 1 note, so it rises to the top. That fits the "New" badge.

### Size

Batches already store `total_ml` (non-null on every row), computed when the batch was logged, with that batch's own densities. That covers batches made in g or oz too. **No conversion is needed, and the density-fallback question from the brainstorm goes away.** The row keeps its own unit in the meta line ("50 g · 25% · …").

## Row layout (one list, phone first)

The list rows keep everything they show today: swatch, name, New badge, "No. NNN · meta", milestone dots. Each row gains what the rail card showed:

- a 1.5 px rest-progress bar under the meta line (amber while resting, verdigris once ready; `aria-hidden`)
- one line of text: "Ready in 12 days" / "Ready", plus "Day 78 of 90" at the trailing edge (existing strings `readyIn`, `ready`, `progress`)
- when the sort is **Needs a note**, the due rows also carry "Note due: Week 2", using the milestone's existing label, so the reason for the order is visible

Sort control: a toggle-chip row (`kx/Chip`, `aria-pressed`) above the list, under the "Batches" heading, with the group labelled "Sort batches". It is 44 px tall and mirrored in RTL. The chips wrap onto a second line when the column is narrow (the 300 px desktop column, 375 px phones), so none is hidden; the first draft scrolled them sideways, which cut "Size" off. Changing the sort keeps the selected batch selected, and focus stays on the chip.

On desktop (lg) the list keeps its 300 px column. With the rail gone, the list and the detail start at the top of the room.

## State

- `?sort=` in the URL, written with `replace` next to `?batch=`. An unknown value reads as `note`.
- The last choice is kept in localStorage under `kyphira.journalSort` (read and written inside try/catch). Order of precedence: URL, then storage, then `note`.
- When no `?batch=` is given, the room opens on the **first row of the current sort**, no longer on the newest batch. Under the default sort, that is the batch that needs a note.

## Strings (EN, AR drafts for review)

| Key | EN | AR (draft) |
|---|---|---|
| `journal.page.sort.label` | Sort batches | ترتيب الدفعات |
| `journal.page.sort.note` | Needs a note | تحتاج ملاحظة |
| `journal.page.sort.new` | Newest | الأحدث |
| `journal.page.sort.rest` | Maceration | التعتيق |
| `journal.page.sort.size` | Size | الحجم |
| `journal.page.noteDue` | Note due: {milestone} | ملاحظة مستحقة: {milestone} |

`journal.page.soon` ("Ready soon") stays in the files, unused, until the owner says it can go.

## Tests

- **Vitest:** `journalSort` for each key, the tie-breaks, `needsNote` (skip ≠ note, missed milestones, day 90, day 0), and an unknown key falling back to `note`.
- **e2e `e2e/journal-room.spec.js`:** two places read the rail (`[data-soon]` around line 114, and the "Ready soon" region around line 135). They move onto the list rows. New checks: the default order, each chip's order, `?sort=` surviving a reload, the chip row in AR, and a 320 px phone.
- **axe:** `e2e/a11y-bench-saas.spec.js` already covers the Journal (EN/AR × light/dark). It should stay at 0 violations.
- **Screenshots:** `docs/redesign/bench-saas/screens/journal/`, before and after, EN/AR, 375/1440.

No migration, no API change, no new flag.

## Open question for the owner

**The due badge counts something else.** The nav badge uses `dueNow()`, which follows the older family rest schedule (day 1 · rest start · rest end · +14). The room's "Needs a note" follows the room's five milestones (Day 1 · Week 1 · Week 2 · Month 1 · Month 3). So the badge can read 2 while the list shows 3 batches needing a note. Options:

- (a) leave it for now; this brief sorts only the list
- (b) a follow-up that moves the badge onto the room's milestones as well, so the two always agree

Recommendation: (b), as its own small change after this one, since the badge is shared with `/bench/journal`. Shipped with (a); the owner has not picked yet.

## Parked

Search by name or oil, sort by rating, a Due / Resting / Ready filter.

# Order queue → batch plan (spec v1)

Status: draft for the owner's review · 2026-11-13 · not built
v2: Q1 and Q2 answered by the owner (5 % allowance; family rest days, 90 days at most). Changes from v1 are in §5.2, §5.3, §5.4, R2, R6 and §9.
Plan: **Pro** (owner, 2026-11-13)

---

## 1. Problem

A small seller takes orders in person: several scents, several bottle sizes, each at a chosen strength. Today the planning happens on paper. You work out which orders can share a mix, add up the volumes, run the calculator once per mix, check that there's enough oil, and remember when each mix finishes resting so its bottles can go out.

Kyphira already does every piece of the arithmetic (calculator, cost and margin, inventory, batch numbers, rest dates) but only one batch at a time, with no idea of who it's for. The owner has 8 open orders right now (several scents and sizes) and 3 bottles already handed over.

If this isn't solved, a seller does the hardest part off-app, finds a shortfall at the scale, and Kyphira stays a calculator they open now and then instead of the place their work starts.

## 2. Goals

1. **No paper.** A seller with mixed orders gets every gram to weigh from Kyphira, with no arithmetic of their own.
2. **No surprises at the bench.** A missing oil shows up when the plan is made, not halfway through a pour.
3. **Every order knows its bottle date.** Each order shows the date its mix is ready to bottle.
4. **One place to start the day.** The queue answers "what do I mix, what do I bottle, what do I hand over" in one screen.

## 3. Non-goals (v1)

| Not in v1 | Why |
|---|---|
| Payments, invoices, receipts | Orders are in person and paid in cash or by transfer; billing isn't connected anywhere yet. |
| Buyer accounts or a buyer-facing page | Buyers don't sign in. The QR feedback page is a separate spec (see §8). |
| Linking to The Shop (`shop_orders`) | The Shop is off in production and orders come in person. Designed so it can be added (P2). |
| Stock of bottles, caps, boxes | Inventory tracks oil only. Bottle cost per batch already exists. |
| Reminders and notifications | `batches.remind` has no sender yet (TODO(reminders)). The queue shows dates; nothing is sent. |
| Mixing different strengths in one mix | One mix is one scent at one strength. Never averaged. |

## 4. Users and stories

**Seller (Pro), at home or at the bench, on a phone**

1. As a seller, I want to add an order in under 20 seconds (buyer, scent, size, strength, price) while I'm still talking to the buyer, so I don't lose it.
2. As a seller, I want Kyphira to group my open orders into mixes, so I weigh as few batches as possible.
3. As a seller, I want to split a group into separate bottles when I'd rather weigh each one, so the plan follows how I actually work.
4. As a seller, I want one list of total oil per scent compared with my stock, so I know what to buy before I start.
5. As a seller, I want to start a planned mix in Pour along with the right total volume, so the bench flow I know does the weighing.
6. As a seller, I want each order to show when its mix is ready and when I can bottle it, so I can tell the buyer a date.
7. As a seller, I want to mark an order bottled and handed over, so the queue only shows what's left.
8. As a seller, I want the cost and margin of each order, so I know which scents and sizes are worth selling.

**Edge cases**

- An order for a scent with no saved formula and no catalog match: it can still be queued (typed name) but can't be planned until a scent is chosen.
- An order is cancelled after its mix is weighed: the order is cancelled; the batch and its rest stay (the liquid exists).
- A mix comes out short (spillage, transfer loss): the plan shows how many mL each order is missing. Kyphira doesn't add a correction (the handbook has no overshoot or top-up procedure).
- A new order arrives for a scent that's already resting: it doesn't join that mix. It starts a new group (the resting mix was weighed for its own orders).
- Free user: sees the queue, locked, with the existing upgrade sheet (`useUpgrade().open("orders")`).

## 5. How it works

### 5.1 The order

| Field | Required | Notes |
|---|---|---|
| Buyer name | yes | Free text. Personal data: see §9. |
| Buyer contact | no | Phone or note. |
| Scent | yes | A saved formula (`recipe_versions`), a catalog fragrance, or typed text (not plannable). |
| Size | yes | mL. Presets 10/30/50/100 + custom. |
| Strength | yes | One of the four handbook tiers (15/20/25/30 %) or a custom %. |
| Price | no | In the profile currency. Feeds margin. |
| Wanted by | no | Date. Sorts the queue. |
| Note | no | |

Status, in order: **queued → planned → resting → ready → bottled → handed over** (or **cancelled** at any point before handed over).

### 5.2 Grouping into mixes (pure function)

`planMixes(orders, options)` in `src/lib/calc/orderPlan.ts`, unit-tested, no math in components:

- A group = open orders with the **same scent and the same strength %**.
- Default per group: **one mix** for the sum of the sizes (the owner's answer was "it depends", so the seller can switch any group to **separate bottles**, one batch per order).
- Mix volume = Σ sizes **× 1.05** (owner, 2026-11-13: 5 % extra for the liquid lost filling several bottles from one mix). The 5 % is one constant, `MIX_ALLOWANCE = 0.05`, in `src/lib/calc/orderPlan.ts`, shown on the plan ("105 mL: 100 mL ordered + 5 % for filling"). **Separate bottles get no allowance**: each is weighed straight into its own bottle, so nothing is lost in transfer.
- Grams come from the existing `calculate()`/`solveBottle` with the formula's densities (a measured density wins, as everywhere).
- Output per mix: scent, strength, total mL, oil g, ethanol g, total g, orders in it, cost (Pro, `batchEconomics`).
- Output overall: **oil per scent vs stock** (`inventory.stock_g`), with the shortfall in grams.

### 5.3 From plan to bench

- "Weigh this mix" opens the Bench with the formula, strength and total volume filled in. It then runs **Pour along** as it is today (no second flow). Logging creates the batch as usual (`batch_no`, `pours`, stock deducted on log) and links that batch to the orders in the group.
- After logging, the orders move to **resting**, with a **rest window** from the family's rest days (owner, 2026-11-13):
  - **Ready from** = blend date + the family's minimum rest days.
  - **Fully rested** = blend date + the family's maximum rest days, **never more than 90 days**.
  - The family comes from the formula (`recipes.family`) or the catalog fragrance's tier; with no family known, both dates are 90 days.
  - One pure function, `restWindow(family, blendDate)`, in `src/lib/calc/orderPlan.ts`, tested on every family and on the 90-day cap.
  - **Which numbers:** `FAMILIES[x].active.restDays` in `src/lib/formulation.ts` is 90/90 for every family today. The shorter per-family ranges (Fresh 7–14, Floral 14–21, 21–28, 28–42, 21–28 days) sit in `sources.htmlTool`, from the old HTML tool, not from the handbooks. v1 of this feature reads those ranges for orders only, through one table the owner can change. The Journal and the Bench resting line stay as they are (see Q7).

### 5.4 Bottling

- On the **ready from** date, the orders move to **ready**. The queue shows "Ready to bottle" and, until the fully rested date, "rests best until {date}". Bottling earlier than ready-from isn't blocked; it asks once ("This mix is still resting. Bottle anyway?").
- "Bottle" on a mix lists its orders with their sizes (fill 50 mL for Sara, 100 mL for Omar…). Mark each order bottled. Labels per order from the existing label PNG (Free), with the buyer's name optional.
- "Handed over" closes the order.

### 5.5 The queue screen (`/bench/orders`, `/ar/bench/orders`)

Three sections, top to bottom, phone first:

1. **To bottle**: ready mixes and their orders.
2. **To mix**: planned groups, with the shortfall line in red if oil is missing.
3. **Waiting**: resting mixes with days left, then queued orders by wanted-by date.

Entry points: a new "Orders" item in the More sheet and an "Orders" card at the top of the Bench for users with `sells = true`. Not a new bottom-bar tab (that's earned after use).

## 6. Requirements

### P0: ships with these

| # | Requirement | Acceptance |
|---|---|---|
| R1 | Add, edit, cancel an order | Given a Pro seller, when they add an order with buyer, scent, size and strength, then it appears under Waiting as queued. An order with typed-only scent shows "Choose a scent to plan". |
| R2 | `planMixes()` pure + tested | Groups by scent + strength only; two strengths of one scent never share a mix; Σ sizes matches; grams equal `calculate()` for the mix volume. Golden cases: with the allowance set to 0, 50 + 50 mL @ 25 % equals the 100 mL @ 25 % Quick Reference row (23.75 g oil, 60.75 g alcohol, 84.50 g); with 5 %, the mix is 105 mL and the grams are that row × 1.05 (24.94 g oil, 63.79 g alcohol, 88.73 g, rounded as the calculator shows them); separate bottles carry no allowance. 100 % covered like the rest of `src/lib/calc/`. |
| R3 | One mix / separate bottles per group | Toggle per group; separate = one planned batch per order. Choice saved. |
| R4 | Oil vs stock | Total oil per scent shown against `stock_g`; shortfall shown in grams; no inventory row = "stock unknown", not zero. |
| R5 | Weigh a mix through the existing Bench + Pour along | Opens prefilled; logged batch is linked to the group's orders; orders → resting. No second pour dialog. |
| R6 | Rest window per order | Every resting order shows "ready from" (family minimum) and "fully rested" (family maximum, capped at 90 days); it moves to ready on the ready-from date; no family = 90 days; bottling early asks once and isn't blocked. |
| R7 | Bottled and handed over | Each order can be marked; handed-over orders leave the queue (kept in history). |
| R8 | Pro gate on the server | All order writes go through `/api`, checked by entitlement (new gate `orders`); Free gets 402 + the lock card. |
| R9 | EN + AR together | Every string in both; Arabic as drafts for review; RTL layout checked. |
| R10 | Data rules | New tables reference `auth.users` ON DELETE CASCADE, are added to `EXPORT_TABLES` and to `rls_isolation.sql`. |

### P1: fast follow

- Cost and margin per order (share of the mix's cost by volume, `batchEconomics`) and per scent.
- Short-mix check: after logging, actual total vs planned; shows mL missing per order.
- Label PNG with the buyer's name and the batch number.
- **QR on the label** linking to the buyer feedback page (own spec).
- "Order again" from a handed-over order (prefills a new order).

### P2: designed for, not built

- Import from The Shop's `shop_orders` (same order shape, `source` column).
- Reminders when a mix is ready (needs the reminder sender).
- Bottle and packaging stock.
- Buyer feedback rolled into the Bench nudge ("buyers say No. 041 fades early").

## 7. Data and API

**Migration 0034** (staging first, re-runnable, down file):

- `seller_orders`: id, user_id → auth.users cascade, buyer_name, buyer_contact, recipe_version_id null, fragrance_id null, scent_text null, size_ml, strength_pct, price, currency, wanted_by, note, status (check list), group_mode (`mix` | `separate`), batch_id null → batches, bottled_at, handed_at, cancelled_at, created_at, updated_at.
- Owner-only RLS for SELECT. **No browser writes** (same rule as batches and inventory since 0011): writes only through `/api`, where the Pro gate lives.
- `plans.features` gains `orders` on Pro.

Named `seller_orders`, not `orders`, to stay clear of `shop_orders`.

**API**: the Hobby limit is used up (12 of 12 functions; `api/shop.ts` was the last). Orders go into an existing function: `api/batches.ts` with `?resource=orders` (GET list, POST create, PATCH edit/status). `functionBudget.test.ts` stays at 12.

**Typed access**: `src/lib/benchData.ts` + regenerated `database.types.ts`.

## 8. Success metrics

Measured on the owner's own account first (the only seller today), then on any seller.

**Leading (first round of orders)**
- The owner plans the next round of orders entirely in Kyphira: yes/no. Target: yes.
- Time from "all orders entered" to "plan with grams and shortfall": under 2 minutes.
- Oil shortfalls found at the bench rather than in the plan: 0.
- Orders entered vs orders handed over: every handed-over bottle went through the queue.

**Lagging (2–3 months)**
- Sellers (`sells = true`) who open the queue at least weekly.
- Repeat orders per buyer (needs P1 "Order again").
- Pro conversions where the upgrade sheet was opened from "orders".

## 9. Open questions

| # | Question | Who | Blocking? |
|---|---|---|---|
| Q1 | ~~Allowance for one mix.~~ **Answered 2026-11-13: 5 % extra on one mix; none on separate bottles.** | Owner | Resolved |
| Q2 | ~~Which rest sets the ready date?~~ **Answered 2026-11-13: family rest days, 90 days at most** (read as a window: ready from the family minimum, fully rested at the family maximum, capped at 90). | Owner | Resolved |
| Q3 | ~~Bottle straight after the rest?~~ Covered by the window in §5.3: bottle from ready-from; fully rested shown as a guide. | Owner | Resolved |
| Q4 | **Buyer names and phones are third-party personal data.** `/privacy` needs a paragraph (as with The Shop). Wording for the lawyer. | Owner / legal | Before public release, not for the owner's own use |
| Q5 | Should an order for a resting scent be allowed to join that mix if there's enough liquid (overfilled)? v1 says no. | Owner | No |
| Q6 | Price and currency: use the profile currency only, or per order? | Owner | No |
| Q7 | The per-family rest ranges come from the old HTML tool, not the handbooks, and the rest of the app now uses 90 days for every family. Should the Journal and the Bench resting line move to the same window later, so one batch never shows two dates? | Owner | No (orders only in v1) |

## 10. Phasing

1. **Phase A: queue + plan** (R1–R4, R8–R10). The owner can plan the next round of orders.
2. **Phase B: bench link + dates + bottling** (R5–R7). Orders follow the batch through resting to handover.
3. **Phase C: P1** (margin per order, short-mix check, labels with the buyer's name, QR feedback).

Each phase on its own branch, staging migration first, e2e EN/AR on phone and desktop, screenshots for review. The current 8 orders will most likely be weighed before Phase B ships. Enter them in Phase A anyway, so they count as the first test.

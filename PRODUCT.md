# SettleUp Product Brief

SettleUp is a no-login group expense splitter for one bounded shared-cost occasion. People create an Event, share its Event Link, record Expenses and Settlement Payments, then use Balances and Suggested Settlements to settle up.

`CONTEXT.md` is the source of truth for domain language. `docs/adr/` records durable architecture and product/security decisions.

## MVP Scope

- Create an Event with an Event Title, supported Currency, and first Participant.
- Share an opaque Event Link for Private-by-Link access.
- Let anyone with the Event Link view and edit Event data.
- Let visitors choose or create their local Participant identity, and switch it later.
- Add, edit, and delete Participants, where referenced Participants cannot be deleted.
- Add, edit, and delete Expenses with a required description, positive amount, one Payer, and explicit positive Shares that sum to the full Expense amount.
- Support custom per-Participant Share amounts immediately.
- Default new Expenses to the current Participant as Payer and an equal split across all current Participants.
- Add, edit, and delete Settlement Payments with different Sender and Recipient Participants and a positive amount.
- Show per-Participant Balances and deterministic Suggested Settlements that minimize payment count.
- Allow recording a Suggested Settlement directly as a Settlement Payment.
- Refresh Event state after actions and by lightweight polling while the Event is open.

## Out Of Scope For MVP

- Accounts, login, owners, admins, or permission levels.
- Human-readable Event Link slugs.
- Natural-language Expense parsing.
- Multiple currencies inside one Event.
- Whole-Event deletion, bulk clearing, token rotation, or automatic expiry.
- Audit history, edit attribution, comments, chat, categories, tags, receipts, exports, print views, recurring Events, templates, forgiveness, or waiver records.
- True realtime collaboration, offline mutation support, public API guarantees, CAPTCHA, or explicit rate limiting.
- A separate frontend application or frontend framework.

## Product Rules

- Event pages and the create page are not intended for search indexing.
- User-provided text is plain text only.
- Participant display names, Event Titles, and Expense descriptions are trimmed and non-blank.
- Participant display names and Expense descriptions do not need to be unique.
- MVP Currencies are AUD, USD, EUR, GBP, and NZD.
- Money amounts use whole minor units for the Event Currency, with two decimal places for every MVP Currency.
- D1-backed Event mutations that write multiple records should save as one all-or-nothing action.
- Balances reflect only saved Expenses and Settlement Payments.
- Draft forms must not be overwritten by polling refreshes.
- Concurrent edits use last-write-wins in the MVP.
- Settlement Payments may overpay; Balances and Suggested Settlements reflect the current saved state.
- Event data is sensitive Private-by-Link data, not public data and not account-private data.
- Event Link tokens are opaque, URL-safe, lowercase, and avoid visually ambiguous characters.

## Interface Shape

- The first screen is the create Event flow, not a marketing landing page.
- Event pages live at `/e/:token`.
- Internal JSON routes live under `/api/...` and include the Event token where Event state is accessed.
- The Event page has separate sections for Balances, Suggested Settlements, Expenses, Settlement Payments, Participants, and Event Link sharing.
- The Event Link can be copied/shared from inside the Event page, but the full token should not be prominently displayed.
- The UI is English-only in MVP, with locale-aware currency formatting where practical.
- JavaScript is required for the app experience.

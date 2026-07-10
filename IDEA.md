# Product

SettleUp is a no-login group expense splitter for one bounded shared-cost Event. The product priority is fast shared expense capture first, confident final settlement second, and low-friction return visits only where they support capture or settlement.

## Project Scope

- Create a Private-by-Link Event with an Event Title, Currency, and first Participant.
- Start the app on event creation when no Event Link is present.
- Keep the create screen focused: Event name first, creator name beside a compact Currency selector, truthful required-field progress, and a three-step lifecycle explaining what opens now, what link holders can change, and when the Event closes.
- Keep newly created Events empty until users add Participants, Expenses, or Settlement Payments.
- Share an opaque Event Link.
- Let anyone with the Event Link view and edit Event data.
- Let visitors choose, remember, and switch their local Participant default.
- Add, rename, and delete unreferenced Participants.
- Add, edit, and delete Expenses with Included Participants.
- Equal-split Expenses across the selected Included Participants.
- Preview the exact derived Share for every Included Participant before saving, including deterministic minor-unit remainder allocation.
- Add, edit, and delete Settlement Payments.
- Show Balances.
- Record owed Balances directly from a Participant row.
- Record manual Settlement Payments.
- Refresh saved Event state through realtime notifications, with polling fallback.
- Preserve active draft forms when saved Event state changes.
- Restore invested Expense drafts from local browser storage after a refresh and clear the stored draft after save, discard, or edit-mode handoff.
- Include known totals in save and settlement action labels so the next shared mutation is explicit before activation.
- Expire Events three days after creation and clean up persisted Event data five days after creation.

## Product Rules

- Event pages and the create page are not intended for search indexing.
- The root app must not auto-create demo Events.
- User-provided text is plain text only.
- Participant display names, Event Titles, and Expense descriptions are trimmed and non-blank.
- Participant display names and Expense descriptions do not need to be unique.
- MVP Currencies are AUD, USD, EUR, GBP, and NZD.
- Money amounts use whole minor units with two decimal places.
- Exact Share previews must use the same `deriveEqualShares` allocation as persistence; the interface must not approximate or hide odd-cent remainder allocation.
- One Event has exactly one Currency.
- Saved Expense commands accept Included Participants and derive equal Shares before persistence.
- Events must retain at least one Participant.
- Participants can be deleted only when they are not referenced by Expenses, Expense Shares, or Settlement Payments.
- SQLite-backed multi-record Event mutations must be all-or-nothing.
- Balances reflect only saved Expenses and Settlement Payments.
- Settlement Payments may overpay.
- Suggested Settlement Payments are convenience commands; manual Settlement Payments can be recorded and edited when the real payment differs.
- Draft forms must not be overwritten by realtime or polling refreshes.
- Settlement controls can be shown whenever saved Balances are open, but draft Expense work blocks recording a payment until the draft is saved, discarded, or cleared.
- Recording a Settlement Payment must say that no money is transferred and that the record can be undone from Event history.
- Realtime messages announce saved Event changes only; SQLite remains the source of truth.
- Concurrent edits are last-write-wins for the MVP.
- Event data is Private-by-Link, not public and not account-private.
- Event Link tokens are opaque, URL-safe, lowercase, and avoid visually ambiguous characters.
- Event retention is intentionally short for the MVP: Event Links stop resolving after three days, and scheduled cleanup deletes Event data after five days.

## Out Of Scope

- Accounts, login, owners, admins, or permission levels.
- Human-readable Event Link slugs.
- Multiple currencies inside one Event.
- Natural-language Expense parsing.
- Receipt photos, OCR, attachments, comments, chat, categories, tags, exports, print views, recurring Events, templates, forgiveness, or waiver records.
- Presence, viewer counts, edit attribution, locks, merge conflict UI, and audit history.
- Manual whole-Event deletion and token rotation.
- Offline mutation support, public API guarantees, CAPTCHA, or explicit rate limiting.
- A separate frontend app detached from the Node app.

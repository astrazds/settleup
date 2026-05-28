# Product

SettleUp is a no-login group expense splitter for one bounded shared-cost Event. The product priority is fast shared expense capture first, confident final settlement second, and low-friction return visits only where they support capture or settlement.

## Current Scope

Shipped MVP behavior:

- Create a Private-by-Link Event with an Event Title, Currency, and first Participant.
- Share an opaque Event Link.
- Let anyone with the Event Link view and edit Event data.
- Let visitors choose, remember, and switch their local Participant default.
- Add, rename, and delete unreferenced Participants.
- Add, edit, and delete Expenses with Included Participants.
- Equal-split Expenses across the selected Included Participants.
- Add, edit, and delete Settlement Payments.
- Show Balances.
- Record owed Balances directly from a Participant row.
- Record manual Settlement Payments.
- Refresh saved Event state through realtime notifications, with polling fallback.
- Preserve active draft forms when saved Event state changes.

## Next Product Work

Strengthen current Participant clarity for return visits and shared devices. The visitor's selected Participant may be remembered in the browser, but the UI must make who they are acting as obvious and easy to switch without implying login, ownership, or permissions.

Defer browser-local recent Event lists until the Event page itself is excellent. They can help return visits later, but should not pull the product toward an account-like home screen.

## Product Rules

- Event pages and the create page are not intended for search indexing.
- User-provided text is plain text only.
- Participant display names, Event Titles, and Expense descriptions are trimmed and non-blank.
- Participant display names and Expense descriptions do not need to be unique.
- MVP Currencies are AUD, USD, EUR, GBP, and NZD.
- Money amounts use whole minor units with two decimal places.
- One Event has exactly one Currency.
- Saved Expense commands accept Included Participants and derive equal Shares before persistence.
- D1-backed multi-record Event mutations must be all-or-nothing.
- Balances reflect only saved Expenses and Settlement Payments.
- Suggested Settlements are derived data used to power Balance-row Pay actions, not recorded history.
- Settlement Payments may overpay.
- Draft forms must not be overwritten by realtime or polling refreshes.
- Realtime messages announce saved Event changes only; D1 remains the source of truth.
- Concurrent edits are last-write-wins for the MVP.
- Event data is Private-by-Link, not public and not account-private.
- Event Link tokens are opaque, URL-safe, lowercase, and avoid visually ambiguous characters.

## Out Of Scope

- Accounts, login, owners, admins, or permission levels.
- Human-readable Event Link slugs.
- Multiple currencies inside one Event.
- Natural-language Expense parsing.
- Receipt photos, OCR, attachments, comments, chat, categories, tags, exports, print views, recurring Events, templates, forgiveness, or waiver records.
- Presence, viewer counts, edit attribution, locks, merge conflict UI, and audit history.
- Whole-Event deletion, token rotation, and automatic expiry.
- Offline mutation support, public API guarantees, CAPTCHA, or explicit rate limiting.
- A separate frontend app or frontend framework.

## Test Direction

Keep the confidence suite behavior-first. Prefer public domain functions, Hono requests, shared command runtime behavior, migration-backed D1 tests, realtime protocol/notifier seams, DOM-free UI policy helpers, and Playwright-visible Event behavior over private implementation assertions.

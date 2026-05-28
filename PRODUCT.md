# SettleUp Product Brief

SettleUp is a no-login group expense splitter for one bounded shared-cost occasion. People create an Event, share its Event Link, record Expenses and Settlement Payments, then use Balances and Suggested Settlements to settle up.

`CONTEXT.md` is the source of truth for domain language. `docs/adr/` records durable architecture and product/security decisions.

## Product Priority

SettleUp should prioritize fast shared expense capture during the Event first, confident final settlement second, and low-friction return visits only where they support capture or settlement. The main product test is whether someone can add or correct shared costs while the group is still in motion without turning the moment into admin.

## Current Product State

The current implementation includes the core MVP flow: Private-by-Link Event creation, local Participant defaults, Participant management, Included Participant expense capture, exact Shares, Balances, Suggested Settlements, Settlement Payments, settlement focus, copyable settlement summaries, and Event-change realtime notifications with fallback polling.

Included Participants, settlement focus, and realtime stale-draft polish are shipped product behavior, not future scope. The product should keep these behaviors stable while the next tranche improves return visits and confidence around shared-device use.

## Next Feature Sequence

The next product tranche should strengthen current Participant clarity for low-friction return visits. SettleUp may remember the visitor's selected Participant for an Event in the browser, but the interface should make who they are acting as obvious and easy to switch without implying login, ownership, or permissions.

Remembered current Participant context should be visible near money-changing forms without blocking every action. SettleUp should prefer persistent "defaults" context and quick switching over return-visit prompts or pre-submit confirmation gates.

Browser-local recent Event lists should remain deferred until the Event page itself is excellent. A recent list may help return visits later, but it should not pull the product toward an account-like home screen before capture, settlement, and current Participant clarity are strong.

The capture flow should continue to optimize around Included Participants first. SettleUp should equal-split among Included Participants by default, preserve exact Share overrides when needed, and keep saved Shares explicit so their minor-unit amounts sum to the Expense amount.

When equal-splitting an Expense among Included Participants, any minor-unit rounding remainder should be assigned by Participant order. Do not privilege the payer or current Participant because that implies social intent where there is only arithmetic.

The Expense draft may temporarily have no Included Participants while the user edits, but Save should be disabled or blocked until at least one Participant is included. SettleUp should not auto-recheck the payer to escape the empty draft state.

When editing an existing Expense, Included Participants should initialize from the Expense's saved Shares, not from new-Expense defaults or the current Event Participant list. Adding Participants to the Event later should not change who was included in earlier Expenses.

The Included Participants slice should improve the empty Event path only where it supports first Expense capture. After an Event is created with one Participant, the interface should make adding Participants the obvious next action before the first shared Expense, without introducing an onboarding wizard.

The next capture improvement should make uneven Shares easier before broadening into receipt/photo support. Equal split is already the low-friction default; the higher-friction moment is correcting who was included and how much each Participant should carry when an Expense is not evenly shared.

For uneven Shares, the capture flow should optimize around choosing Included Participants first. After the user chooses who is included in an Expense, SettleUp should equal-split among those Participants by default and allow exact Share overrides when needed.

The Expense payer should be an Included Participant by default. The user may remove the payer when the payer did not share the Expense, but the default should protect the common case where the person who paid also participated.

If the payer is not an Included Participant, the Expense remains valid but the interface should make the unusual state visible with a low-friction warning. SettleUp should not block this because one Participant can pay on behalf of others without sharing the Expense.

Included Participants should be chosen with a direct checkbox-style control before exact Share amounts are adjusted. The user should not have to infer inclusion from whether a Share row exists.

After Included Participants are selected, SettleUp should keep equal Shares as the default and hide exact Share amount inputs behind an intentional adjustment action. The normal path should show the equal Share result without making every Expense look like manual accounting.

When exact Share amounts are adjusted, Shares must still sum to the Expense amount before saving. SettleUp should provide helper actions such as assigning the remaining amount to one Included Participant instead of silently redistributing money across other Participants.

Remaining-amount helpers should start generic, such as assigning the remaining amount to a selected Included Participant. Intent-specific helpers like "I paid the difference" should wait until the repeated real-world patterns are clear enough to avoid ambiguous money behavior.

For confident final settlement, Suggested Settlements should remain the primary action once an Event is ready to settle. Balances explain the current state, but the settlement flow should foreground the recommended Participant-to-Participant payments and make recording each one as a Settlement Payment fast.

Readiness to settle should be user-controlled through a settlement-focused mode or action. SettleUp should not automatically infer that an Event is ready to settle from Balances or recent activity, and entering settlement focus should not lock the Event or imply ownership.

Settlement focus should change emphasis on the same Event page first. Balances, Add Expense, embedded Event Participants, Event History, and Event Link sharing should remain available so late costs can still be added without leaving a separate settlement workflow.

Recording a Suggested Settlement should use inline confirmation before saving a Settlement Payment. One-click recording is too easy to trigger accidentally, while simply filling the Settlement Payment form keeps too much form-filling friction in the final settlement moment.

Inline confirmation for a Suggested Settlement should allow the amount to be edited before recording the Settlement Payment. The suggested amount should remain visible as the reference, but partial payments and overpayments should not force users into the generic Settlement Payment form.

After any Settlement Payment is recorded, SettleUp should refresh Balances and Suggested Settlements from the saved Event state. Suggested Settlements should not become checklist items with progress; they remain derived recommendations based on current Balances.

True realtime collaboration is worth adding earlier than originally planned because it directly improves the shared Event experience. Realtime should make other Participants' saved changes appear quickly while still preserving local draft forms; it should not introduce chat, edit attribution, presence, locking, accounts, or permissions.

Realtime should not show presence for now. A browser's remembered current Participant does not prove who is actually present, and viewer counts do not improve capture or settlement enough to justify another concept.

Concurrent edits should stay last-write-wins for the MVP, but realtime should make staleness visible when it matters. If saved Event data changes while a draft or edit form is open, the interface should warn the user to review before saving without blocking the action or introducing locks.

Edit attribution should stay out of MVP realtime. SettleUp may say the Event updated, but it should not claim which Participant made a change because current Participant selection is a local default, not authenticated identity.

Receipts should stay deferred until the Event page is excellent. Photos, attachments, OCR, and receipt notes broaden storage, privacy, deletion, and review behavior; the app's distinct job is turning shared costs into correct Shares, Balances, and Settlement Payments.

Natural-language Expense entry should stay deferred until the structured capture flow is excellent. Free-text parsing sounds low-friction, but it becomes ambiguous around payer, Included Participants, exact Shares, Currency, and whether something is an Expense or Settlement Payment.

Expense categories and tags should stay deferred. They support analysis and reporting more than settling a bounded occasion, and they add classification friction during fast capture.

Full exports and print views should stay deferred. The concise copyable settlement summary should stay plain and group-chat-friendly, not expand into archiving or reporting the full Event.

## Test Confidence Direction

SettleUp's confidence suite should stay behavior-first. Prefer public domain functions, Hono requests, migration-backed D1 store tests, realtime notifier seams, and Playwright-visible Event behavior over private implementation assertions.

D1 adapter tests should continue applying checked-in migrations to fresh Miniflare databases. Multi-record Event mutations should remain all-or-nothing, and tests should prove rollback behavior for Participants, Expenses, Shares, and Settlement Payments when storage changes.

Realtime tests should continue proving Event token isolation, Durable Object room broadcast behavior, success-only mutation notifications, draft preservation, and fallback polling. Realtime should remain Event-change notification only, not presence or edit attribution.

Browser coverage should keep a small critical Event path and a separate extended realtime path. Accessibility checks should grow around money-changing controls, correction flows, focus behavior, and dense repeated panels before adding broad visual or snapshot testing.

Whole-Event deletion, automatic expiry, and Event Link token rotation should stay deferred as privacy hardening. In a no-login Private-by-Link Event, SettleUp first needs a clear answer for who may delete or rotate access, how accidental deletion is handled, and how Participants recover a changed Event Link.

Multiple currencies inside one Event should stay out of scope. If a shared-cost occasion has costs in another Currency, Participants should convert the amount before entering it so Balances and Settlement Payments remain simple and trusted in the Event's single Currency.

Recurring Events and templates should stay out of scope. SettleUp should keep each Event focused on one bounded occasion rather than becoming a household ledger, group workspace, or repeated-expense tracker.

Forgiveness, waivers, and "mark settled" overrides should stay out of scope. SettleUp should keep the money model literal: adjust Shares when cost allocation changes, record Settlement Payments when money moves, and avoid clearing Balances without saved history.

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
- Refresh Event state after actions and by realtime Event-change notifications while the Event is open, with lightweight polling as a fallback.

## Out Of Scope For MVP

- Accounts, login, owners, admins, or permission levels.
- Human-readable Event Link slugs.
- Natural-language Expense parsing.
- Multiple currencies inside one Event.
- Whole-Event deletion, bulk clearing, token rotation, or automatic expiry.
- Audit history, edit attribution, comments, chat, categories, tags, receipts, exports, print views, recurring Events, templates, forgiveness, or waiver records.
- Offline mutation support, public API guarantees, CAPTCHA, or explicit rate limiting.
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
- Draft forms must not be overwritten by realtime or fallback polling refreshes.
- Concurrent edits use last-write-wins in the MVP.
- Settlement Payments may overpay; Balances and Suggested Settlements reflect the current saved state.
- Event data is sensitive Private-by-Link data, not public data and not account-private data.
- Event Link tokens are opaque, URL-safe, lowercase, and avoid visually ambiguous characters.

## Interface Shape

- The first screen is the create Event flow, not a marketing landing page.
- Event pages live at `/e/:token`.
- Internal JSON routes live under `/api/...` and include the Event token where Event state is accessed.
- The Event page uses compressed task panels: Balances; Add Expense with Event Participants under Included Participants; Record Settlement Payment with Suggested Settlements; and Event History for saved Expenses and Settlement Payments.
- Event Link sharing is a compact utility action beside Expense defaults rather than a full panel.
- The Event Link can be copied/shared from inside the Event page, but the full token should not be prominently displayed.
- The UI is English-only in MVP, with locale-aware currency formatting where practical.
- JavaScript is required for the app experience.

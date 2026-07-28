# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

SettleUp is for small groups sharing one bounded set of costs: trips, dinners, shared houses, weekends, and other short-lived events where people need to capture expenses quickly and settle confidently.

People arrive through a private event link, often on mobile and while the event is still happening. They should be able to contribute without accounts, roles, setup knowledge, or familiarity with accounting.

## Product Purpose

SettleUp is a no-login group expense splitter for one shared-cost event. It prioritizes fast shared expense capture first, confident final settlement second, and low-friction return visits only where they preserve capture or settlement work.

Success means a group can create a private-by-link event, manage participants, add expenses, understand exact shares and balances, record or correct settlement payments, and return later without losing active drafts. The root app starts with event creation rather than a sample event.

## Positioning

SettleUp uses one short-lived private link as both the way into an event and the collaboration boundary for that event. It gives a temporary group the exact expense and settlement record they need without turning the relationship into accounts, permissions, a permanent finance workspace, or a banking product.

## Operating Context

An event begins with its name, the creator's name, and one currency. The creator shares the resulting private link with the group, and anyone holding it can act as a listed participant and change the shared event record.

People add participants and expenses during the event, often from a phone and in the middle of a conversation. They later use balances and suggested or manual payments to settle, while explicit undo and correction paths keep shared changes recoverable.

The private link is intentionally temporary: event access expires after three days and persisted event data is cleaned up after five days. Browser draft storage and realtime snapshot refresh support returning to unfinished capture without making the event permanent.

## Capabilities and Constraints

- Preserve the root create flow: event name, creator name, currency, a truthful lifecycle preview, then `Start my event`.
- Start each event with only the creator participant and no sample expenses, balances, payments, or history.
- Support participant management, equal expense splits across selected people, exact cent allocation, derived balances, and suggested or manual settlement payments.
- Keep description and amount first in the event capture flow, followed by payer identity, defaults, split controls, and save; keep participant administration behind a collapsed `Manage people` disclosure.
- Name the participant in removal confirmation, state that the shared change cannot be undone, and explain that referenced participants cannot be removed.
- Lead the balance surface with the single next payment, present the viewer's balance as supporting context, and keep the full participant ledger available behind a mobile disclosure.
- Keep payment recording inside the balance surface and retain compact record evidence while placing edit, undo, and remove actions behind a `Manage` disclosure.
- Use one currency per event and store saved amounts as exact integer minor units.
- Treat possession of the private link as collaboration access. SettleUp has no accounts, admins, or permission levels.
- Preserve invested create-event drafts for up to 24 hours and active expense drafts across refreshes and realtime updates.
- Keep shared mutations understandable and reversible through confirmation, correction, and undo paths.
- Keep the product intentionally bounded: no multi-currency events, receipt OCR, attachments, chat, categories, exports, audit-history product, offline mutation support, or public API contract.

## Brand Commitments

SettleUp is fast, calm, and trustworthy. The experience should feel practical and settled: quick enough to use during a conversation, quiet enough to trust with money details, and clear enough that anyone with the link can understand what changed.

Product language uses concrete amounts and human directions such as `pays`, `gets back`, and `settled`. It avoids sales-oriented financial language, fake urgency, vague progress, and metaphors that imply banking, investing, account administration, or gamified money behavior.

The canonical app icon is `public/icon-updated.png`, with derived PWA, Apple touch, and favicon assets under `public/`. Its cooperative three-part mark must not be replaced with currency, banking, calculator, spreadsheet, or payment-product imagery.

## Evidence on Hand

- `README.md` documents the implemented product scope, lifecycle, technical stack, and explicit exclusions.
- `AGENTS.md` records the repository's product trust contracts and verification requirements.
- `src/App.jsx`, `src/components/event-ui.jsx`, and `src/styles.css` implement the create, capture, balance, settlement, recovery, and responsive interaction surfaces.
- `src/shared/domain.ts` and `src/server/` implement exact money, event-scoped mutations, persistence, expiry, cleanup, and realtime invalidation.
- `DESIGN.md` records the incumbent interface system and interaction commitments.
- `public/icon-updated.png` is the canonical brand asset, with derived application icons alongside it.

No customer testimonials, usage benchmarks, press claims, pricing claims, or named customer evidence are on hand. Future work must not fabricate them.

## Product Principles

- Capture before administration: keep description, amount, payer, defaults, split, and save ahead of participant maintenance; let settlement follow only after saved balances exist.
- Make money explainable: show exact amounts, deterministic shares, plain balance directions, and the known consequence of each action.
- Preserve work in progress: shared refreshes and return visits must not erase an invested local draft or silently change the user's task.
- Make shared change recoverable: mutations that affect everyone with the link need clear consequences, correction paths, and honest undo behavior.
- Stay bounded to the event: expiry, cleanup, and the absence of accounts are intentional product constraints rather than missing platform features.

## Accessibility & Inclusion

Target WCAG AA. Maintain readable contrast for text, placeholders, and controls; visible keyboard focus; alert semantics and first-invalid-field focus after failed submission; accessible names for icon buttons; reduced-motion support for non-essential motion; mobile touch targets of at least 44px; and state communication that does not rely on color alone.

Keep primary mobile flows usable at 320px and verify browser-visible UI work at 390×844.

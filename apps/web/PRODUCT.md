# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

SettleUp is for friends sharing costs during trips and weekends, shared meals,
and parties. They need to capture costs while the event is happening,
understand exactly how each expense was divided, and finish settling without
creating accounts or maintaining a spreadsheet.

One person starts the event and shares its private link, but there is no
organizer or owner role after creation. Anyone with the complete link can view
and edit the event.

## Product Purpose

SettleUp gives a temporary group one short-lived shared-expense workspace. The
group can record expenses, see cent-exact equal splits and current balances,
follow one clear next settlement suggestion, and record payments made outside
the app.

Success means the group can reach understood, zeroed balances confidently and
quickly, without turning the occasion into an account setup, banking workflow,
or spreadsheet exercise.

## Positioning

SettleUp combines no-account, private-by-link access with transparent,
deterministic equal splits and one clear next settlement step. It is an
ephemeral coordination tool for a shared occasion, not a durable personal
finance product or a money-transfer service.

## Operating Context

- A friend creates an event with a title, their name, and a currency, then
  shares the private link with the group.
- Link holders use three focused sections: **Expenses** to record shared costs,
  **Settle** to review balances and record payments made elsewhere, and
  **People** to maintain the participants who can pay or share an expense.
- Expense capture happens in a mobile-first web interface during the event.
  The interface may already be open on several phones or browser tabs.
- The server snapshot is authoritative. Live change notifications cause the
  client to refetch it, and an open form pauses a stale save until the latest
  version is reviewed.
- Previously loaded details can remain visible when a device goes offline, but
  changes require a connection. The event is not kept as an offline or
  persistent browser ledger.
- Native sharing is used when available, with clipboard and manual-copy
  fallbacks.

## Capabilities and Constraints

- Events require a title, an initial participant, and one supported currency:
  AUD, USD, EUR, GBP, or NZD. Browser locale selects the initial currency, with
  AUD as the fallback.
- Participants can be added and renamed. At least one participant must remain,
  and a participant referenced by an expense or payment cannot be removed.
- Expenses have a description, a positive amount, a payer, and one or more
  included participants. Splits are equal only; there are no percentages,
  weights, itemization, or manually entered shares.
- Money crosses the API as integer minor units. Every cent is assigned
  deterministically, and remainder cents are visibly allocated from top to
  bottom in the submitted participant order.
- The server recomputes and returns the complete snapshot after each
  transactional mutation. The browser does not author ledger balances.
- Settlement presents one next suggested payment at a time. Payments happen
  outside SettleUp; the app only records them and recomputes what remains.
- The event token is the access credential. It must not be persisted or logged,
  and participant names are visible to everyone holding the link.
- Event links are accessible for three days. Event data becomes inaccessible
  at expiry and is deleted at the five-day cleanup deadline.
- The static frontend uses relative `/api` requests. The independently
  deployable backend does not serve frontend assets or client routes.
- The current interface is English-only.
- Explicit exclusions are accounts, authenticated identities or roles, bank
  transfers, banking dashboards, charts, spreadsheet-heavy interaction,
  custom split formulas, permanent event history, and persistent event caches.

## Brand Commitments

The product is named **SettleUp**. Its primary promise is **“Everyone pays.
Every cent lands.”** Supporting copy should reinforce the same verified truths:
private-by-link access, no accounts, cent-exact equal splits, one clear
settlement step, and payments made outside the app.

The code-native **Settle Cut** mark is the binding product symbol. Its clipped
teal plate, two cream ledger bands, and mustard remainder block express two
sides resolving into one aligned settlement. Use it with the Barlow SettleUp
wordmark; do not replace it with exchange arrows, currency symbols, wallets,
banking imagery, or a generic rounded fintech tile.

The visual world is **“The Shared Session”**: direct, social, exact, and
short-lived. The landing page may use its poster-like color fields and
condensed type at full volume. Event routes must translate the same identity
into a calmer working register where names, money, status, and actions remain
immediately legible.

Brand language must never imply authenticated privacy, money transfer,
ownership roles, permanent history, or verified social proof. The complete
event link remains the access credential, and SettleUp records—not moves—money.

## Evidence on Hand

- A complete working product interface and its factual copy live in
  `apps/web/app/`.
- The current product and design contracts live in `apps/web/PRODUCT.md` and
  `apps/web/DESIGN.md`; they describe current state rather than redesign
  history.
- The code-native mark lives in `apps/web/app/components/icons.tsx`; favicon,
  touch-icon, and social derivatives live in `apps/web/public/`.
- Mobile and desktop reference screenshots cover the landing page and
  Expenses, Settle, People, empty, dialog, and dark event states in
  `apps/web/tests/e2e/states.spec.ts-snapshots/`.
- End-to-end coverage exercises event creation, participant and expense
  management, exact split disclosure, settlement, deletion, concurrent
  updates, horizontal-overflow prevention, and light, dark, and forced-colors
  accessibility checks.
- There are no verified testimonials, customer logos, usage metrics, case
  studies, press quotes, pricing claims, or third-party proof assets in the
  repository. Future work must not fabricate them.

## Product Principles

1. **Start sharing before setup becomes a task.** A private link should be
   enough to begin; accounts and identity administration stay out of the way.
2. **Make exactness understandable.** Show how every cent is divided and keep
   the server-authored ledger as the source of truth.
3. **Prefer one confident next step.** Guide the group toward settlement
   without turning the experience into a financial dashboard.
4. **Treat the link as a credential.** Privacy depends on link confidentiality,
   minimal browser persistence, and clear expectations for every participant.
5. **End with the occasion.** The product serves a short-lived event rather
   than building a permanent financial history.

## Accessibility & Inclusion

The web experience must remain keyboard operable, usable without horizontal
overflow at widths down to 320px, and conform to WCAG 2.2 AA. Interaction
targets, visible focus, semantic structure, live status and error announcements,
light and dark schemes, reduced-motion preferences, forced-colors adaptation,
and fixed mobile dialog commitments must continue to support that requirement.

No additional product-specific accessibility needs, localization requirements,
or launch-geography commitments have been confirmed.

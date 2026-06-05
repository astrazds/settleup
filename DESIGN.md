# Design

SettleUp is product UI, not a marketing site. It should feel quiet, trustworthy, and direct while people capture shared costs at a table, in a group chat context, or on a phone.

The standalone design mockup is [docs/design/mockups.html](./docs/design/mockups.html).

## Create Page Shape

The create page is a compact task form, not a landing page. It uses the headline "Create a shared expense Event" with supporting copy "Use it for a trip, dinner, or shared cost.", followed by Event Title, Currency, Your name, and a receipt-like submit band with the private Event Link note and Create Event. On phones it top-aligns, stacks fields, uses 44px controls, and makes the Create Event action full width. Validation errors preserve submitted text, mark and focus the relevant field, and keep long or mixed-direction text from breaking the layout.

## Visual System

- Use shadcn preset `b6u0ULvrE` as the visual source of truth. It resolves to the `radix-rhea` style with the olive base color, Inter variable font, Lucide icons, default radius, default menu color, and subtle menu accent.
- Use a text-first `SettleUp` wordmark with a simple code-native mark if needed.
- Avoid generic money imagery: coins, dollar signs, wallets, banks, calculators, and receipt mascots.
- Use preset typography and fixed `rem` type sizes; use tabular numerals for money.
- Use shadcn semantic tokens (`background`, `foreground`, `card`, `muted`, `primary`, `destructive`, `border`, `input`, and `ring`) rather than a repo-specific palette.
- Compose Event page controls with checked-in shadcn/ui source components and semantic tokens before adding bespoke UI markup.
- Use the preset radius scale from `src/ui/shadcn.css`; do not recreate a separate radius system.
- Use receipt-grid structure: rows, dividers, subtotal bands, aligned amounts, and compact grouped forms.
- Repeated records should read as ledger rows, not floating cards.
- Touch targets on mobile and coarse pointers should be at least 44px.

## Event Page Shape

The Event page uses three durable panels:

- Balances, including direct Pay actions for owed rows and Suggested Settlement review.
- Add Expense, including a one-Participant onboarding state, compact Participant rows for split selection, and Participant correction.
- Event History for saved Expenses and payments.

Utility actions stay compact. Event Link sharing and the current acting Participant selector belong beside the Event title, not as separate full panels. Settlement Payment capture belongs beside Balances as direct row Pay actions plus a folded Record outside payment panel.

The Event page state policy lives outside DOM rendering. Keep placement, visibility, empty guidance, history ordering, and Participant deletion availability in a plain policy layer so renderer changes do not redefine the product shape.

## Interaction Rules

- Draft forms must survive realtime and polling refreshes.
- Realtime status should communicate connection and update behavior, not presence.
- Do not show named presence, viewer counts, edit attribution, or lock language.
- If saved Event data changes while a draft is active, show a calm review warning near the form without blocking save.
- Current Participant copy should say who is adding and paying for the expense, without account, owner, or permission language.
- In a one-Participant empty Event, Add Expense shows a compact Add Participant onboarding state and withholds expense-entry controls until at least two Participants exist.
- The current acting Participant selector lives in the Event header once there are at least two Participants.
- Add Expense uses shadcn Field, Input, Radix Select, and Radix Checkbox controls. The payer can be changed for the draft, and the current Participant default seeds new drafts.
- Participant rows use compact shadcn rows: split checkbox, display name with inclusion/reference status below it, then correction actions. Participant rename stays inline in the row; Participant delete uses an explicit browser confirmation only when deletion is allowed.
- The payer is included by default, but may be removed with a calm warning.
- Add Expense ends at the Add Participant row; do not add secondary controls below it until custom Share editing returns.
- Disabled Save expense states explain the missing action near the button.
- Submitting an Expense sends the selected Included Participants; equal Share amounts are derived by the Worker.
- Balance rows with negative amounts show a compact Pay button immediately before the owes amount.
- Record outside payment stays folded in its own panel beside Balances; when open, it states that money already moved outside SettleUp, Who paid and Who received share one row, Amount follows, and Record payment plus Cancel close the form action row.
- Validation errors appear near the relevant form.
- Buttons and inputs use explicit HTML types.
- Focus rings must be visible.
- Empty states teach the next useful action.
- Event History combines saved Expenses and payments in newest-first order. Each row leads with the record kind and human action, then supporting split or outside-payment detail, with amount and correction actions aligned separately.

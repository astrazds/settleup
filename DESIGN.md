# Design

SettleUp is product UI, not a marketing site. It should feel quiet, trustworthy, and direct while people capture shared costs at a table, in a group chat context, or on a phone.

The standalone design mockup is [docs/design/mockups.html](./docs/design/mockups.html).

## Create Page Shape

The create page is a compact task form, not a landing page. It uses the headline "Create a shared expense Event" with supporting copy "Use it for a trip, dinner, or shared cost.", followed by Event Title, Currency, Your name, and a receipt-like submit band with the private Event Link note and Create Event. On phones it top-aligns, stacks fields, uses 44px controls, and makes the Create Event action full width. Validation errors preserve submitted text, mark and focus the relevant field, and keep long or mixed-direction text from breaking the layout.

## Visual System

- Use a text-first `SettleUp` wordmark with a simple code-native mark if needed.
- Avoid generic money imagery: coins, dollar signs, wallets, banks, calculators, and receipt mascots.
- Use system sans-serif, fixed `rem` type sizes, and tabular numerals for money.
- Keep the palette warm and restrained: paper surfaces, ink text, ledger green for action/owed state, clay for error/owes state, and amber for caution.
- Use 8px radii for panels and controls, 4px for compact tags.
- Use receipt-grid structure: rows, dividers, subtotal bands, aligned amounts, and compact grouped forms.
- Repeated records should read as ledger rows, not floating cards.
- Touch targets on mobile and coarse pointers should be at least 44px.

## Event Page Shape

The Event page uses three durable panels:

- Balances, including direct Pay actions for owed rows and the folded Record outside payment form.
- Add Expense, including a one-Participant onboarding state, the current acting Participant selector once split selection is possible, and compact Participant rows for split selection and Participant correction.
- Event History for saved Expenses and payments.

Utility actions stay compact. Event Link sharing belongs beside the Event title, not as a full panel. Settlement Payment capture belongs beside Balances as direct row Pay actions plus a folded Record outside payment action.

The Event page state policy lives outside DOM rendering. Keep placement, visibility, empty guidance, history ordering, and Participant deletion availability in a plain policy layer so renderer changes do not redefine the product shape.

## Interaction Rules

- Draft forms must survive realtime and polling refreshes.
- Realtime status should communicate connection and update behavior, not presence.
- Do not show named presence, viewer counts, edit attribution, or lock language.
- If saved Event data changes while a draft is active, show a calm review warning near the form without blocking save.
- Current Participant copy should say who is adding and paying for the expense, without account, owner, or permission language.
- In a one-Participant empty Event, Add Expense shows a compact Add Participant onboarding state and withholds expense-entry controls until at least two Participants exist.
- The current acting Participant selector lives in the Add Expense header, aligned opposite the panel title once there are at least two Participants.
- Add Expense uses the current Participant default as payer; do not duplicate it as a separate Payer field.
- Participant rows use a ledger line: split checkbox, display name with inclusion/reference status below it, then correction actions. Participant rename stays inline in the row with validation, keyboard submit, cancel, and no browser prompt.
- The payer is included by default, but may be removed with a calm warning.
- Add Expense ends at the Add Participant row; do not add secondary controls below it until custom Share editing returns.
- Disabled Save expense states explain the missing action near the button.
- Submitting an Expense sends the selected Included Participants; equal Share amounts are derived by the Worker.
- Balance rows with negative amounts show a compact Pay button immediately before the owes amount.
- Record outside payment stays folded inside Balances; when open, it states that money already moved outside SettleUp, Who paid and Who received share one row, Amount, Record payment, and Cancel share the second row, and a preview sentence confirms the payment record before submit.
- Validation errors appear near the relevant form.
- Buttons and inputs use explicit HTML types.
- Focus rings must be visible.
- Empty states teach the next useful action.
- Event History combines saved Expenses and payments in newest-first order. Each row leads with the record kind and human action, then supporting split or outside-payment detail, with amount and correction actions aligned separately.

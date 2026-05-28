# Design

SettleUp is product UI, not a marketing site. It should feel quiet, trustworthy, and direct while people capture shared costs at a table, in a group chat context, or on a phone.

The standalone design mockup is [docs/design/mockups.html](./docs/design/mockups.html).

## Create Page Shape

The create page is a compact task form, not a landing page. It uses the headline "Split costs, easy...done..." with supporting copy "Share the link. Add people and expenses. Pay them.", followed immediately by Event Title, Currency, Your name, and Create Event.

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

- Balances, including direct Pay actions for owed rows and the folded Manual Payment form.
- Add Expense, including the current default selector and compact Participant rows for split selection and Participant correction.
- Event History for saved Expenses and Settlement Payments.

Utility actions stay compact. Event Link sharing belongs beside the Event title, not as a full panel. Settlement Payment capture belongs beside Balances as direct row Pay actions plus a folded Manual Payment action.

The Event page state policy lives outside DOM rendering. Keep placement, visibility, empty guidance, history ordering, and Participant deletion availability in a plain policy layer so renderer changes do not redefine the product shape.

## Interaction Rules

- Draft forms must survive realtime and polling refreshes.
- Realtime status should communicate connection and update behavior, not presence.
- Do not show named presence, viewer counts, edit attribution, or lock language.
- If saved Event data changes while a draft is active, show a calm review warning near the form without blocking save.
- Current Participant copy should use defaults language, not account, owner, or permission language.
- Expense defaults live in the Add Expense header, aligned opposite the panel title.
- Add Expense uses the current Participant default as payer; do not duplicate it as a separate Payer field.
- Participant rows combine split selection, display name, status, and correction actions.
- The payer is included by default, but may be removed with a calm warning.
- Add Expense ends at the Add Participant row; do not add secondary controls below it until custom Share editing returns.
- Submitting an Expense sends the selected Included Participants; equal Share amounts are derived by the Worker.
- Balance rows with negative amounts show a compact Pay button immediately before the owes amount.
- Manual Payment stays folded inside Balances; when open, Sender and Recipient share one row, and Amount, Record, and Cancel share the second row.
- Validation errors appear near the relevant form.
- Buttons and inputs use explicit HTML types.
- Focus rings must be visible.
- Empty states teach the next useful action.
- Event History combines saved Expenses and Settlement Payments in newest-first order.

# Design

SettleUp is product UI, not a marketing site. It should feel quiet, trustworthy, and direct while people capture shared costs at a table, in a group chat context, or on a phone.

The standalone design mockup is [docs/design/mockups.html](./docs/design/mockups.html).

## Visual System

- Use a text-first `SettleUp` wordmark with a simple code-native mark if needed.
- Avoid generic money imagery: coins, dollar signs, wallets, banks, calculators, and receipt mascots.
- Use system sans-serif, fixed `rem` type sizes, and tabular numerals for money.
- Keep the palette warm and restrained: paper surfaces, ink text, ledger green for action/owed state, clay for error/owes state, amber for caution and Suggested Settlements.
- Use 8px radii for panels and controls, 4px for compact tags.
- Use receipt-grid structure: rows, dividers, subtotal bands, aligned amounts, and compact grouped forms.
- Repeated records should read as ledger rows, not floating cards.
- Touch targets on mobile and coarse pointers should be at least 44px.

## Event Page Shape

The Event page uses four durable task regions:

- Balances.
- Add Expense, including Event Participants and Included Participants.
- Record Settlement Payment, including Suggested Settlements.
- Event History for saved Expenses and Settlement Payments.

Utility actions stay compact. Event Link sharing belongs near Expense defaults, not as a full panel. Suggested Settlements are recommendations until recorded as Settlement Payments.

## Interaction Rules

- Draft forms must survive realtime and polling refreshes.
- Realtime status should communicate connection and update behavior, not presence.
- Do not show named presence, viewer counts, edit attribution, or lock language.
- If saved Event data changes while a draft is active, show a calm review warning near the form without blocking save.
- Current Participant copy should use defaults language, not account, owner, or permission language.
- Included Participants use direct checkbox-style controls before exact Share amounts.
- The payer is included by default, but may be removed with a calm warning.
- Exact Share controls stay behind an intentional adjustment action.
- Share adjustment must show total, assigned, and remaining amounts, with an explicit assign-remaining helper.
- Validation errors appear near the relevant form.
- Buttons and inputs use explicit HTML types.
- Focus rings must be visible.
- Empty states teach the next useful action.

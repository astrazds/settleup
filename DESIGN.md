# SettleUp Design Notes

SettleUp is product UI. Design serves fast group expense entry at a table, in a group chat context, or on a phone during a trip. The interface should feel quiet, trustworthy, and direct.

## Register

Product.

## Visual System

- Use system sans-serif typography for native platform feel.
- Use a restrained light theme with warm tinted neutrals and a green accent for primary actions.
- Keep cards to actual panels and repeated records; do not nest cards.
- Use 8px border radii for panels, buttons, and controls.
- Keep body copy compact and task-focused.
- Avoid decorative motion, decorative gradients, glass effects, and marketing hero treatment.

## Layout

- The first screen is the create Event form.
- The Event page uses a top summary and two-column desktop layout.
- On mobile, the Event page collapses to a single column.
- Separate sections are used for Balances, Suggested Settlements, Expenses, Settlement Payments, Participants, and Event Link sharing.
- Balance wording should say "is owed", "owes", or "is settled" instead of relying on signed numbers.

## Interaction Rules

- Draft forms must survive polling refreshes.
- Event Link sharing should be available, but the full token should not be prominent.
- User-provided text is rendered as plain text.
- Validation errors appear near the relevant form.
- Current Participant selection controls defaults only; it must not imply permissions.

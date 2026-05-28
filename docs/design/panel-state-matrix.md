# Event Panel State Matrix

Use this matrix when changing Event-page actions. The goal is to keep the page dense and task-first without showing controls that cannot help in the current Event state.

## Empty Event

- One Participant, no Expenses: make Participants the primary next action; keep Add Expense visible but visually secondary.
- Two or more Participants, no Expenses: make Add Expense the primary next action.
- Balances and Suggested Settlements remain readable state panels, but they should not compete with the next useful action.
- Generic Record Settlement Payment remains visible but disabled until at least two Participants exist, with a note to add another Participant first.

## Populated Event

- Add Expense stays available.
- Expenses show Edit and Delete on each saved Expense.
- Participants show Rename. Delete is shown only when the Participant is not referenced by Expenses or Settlement Payments and at least one other Participant remains.
- Referenced Participants show an `in use` chip instead of a destructive action.

## Settlement Focus

- Settle up appears only when Suggested Settlements exist.
- Suggested Settlement rows show one primary Record action until inline confirmation is open.
- While inline confirmation is open, the row shows Record Settlement Payment and Cancel, not a second Record action.
- Copy summary appears only in settlement focus while Suggested Settlements exist.

## Settled Event

- Suggested Settlements reads as settled and does not show Settle up or Copy summary.
- Settlement Payments history remains available when records exist.
- Add Expense and Participants remain available because late costs and corrections are still valid.

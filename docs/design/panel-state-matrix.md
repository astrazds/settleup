# Event Panel State Matrix

Use this matrix when changing Event-page actions. The goal is to keep the page dense and task-first without showing controls that cannot help in the current Event state. The Event page now compresses utility surfaces into four durable task panels: Balances, Add Expense, Record Settlement Payment, and Event History.

## Panel Compression Rules

- Participant management lives inside the Add Expense panel under the Included Participants area. Keep the wording distinct: Event Participants are people on the Event; Included Participants are the people with Shares on the current Expense.
- Event Link sharing is a Copy Event Link button beside Expense defaults. Keep the Private-by-Link warning visible in the Event header and keep copied feedback in the fixed toast.
- Suggested Settlements live inside Record Settlement Payment. They are recommendations until the user records a Settlement Payment.
- Expenses and Settlement Payments share Event History, ordered newest first by creation time. Preserve Edit and Delete actions on each row.

## Empty Event

- One Participant, no Expenses: make the embedded Event Participants control the primary next action; keep Add Expense visible but visually secondary.
- Two or more Participants, no Expenses: make Add Expense the primary next action.
- Balances and Suggested Settlements remain readable state areas, but they should not compete with the next useful action.
- Generic Record Settlement Payment remains visible but disabled until at least two Participants exist, with a note to add another Participant first.

## Populated Event

- Add Expense stays available.
- Event History shows Edit and Delete on each saved Expense and Settlement Payment.
- Embedded Event Participants show Rename. Delete is shown only when the Participant is not referenced by Expenses or Settlement Payments and at least one other Participant remains.
- Referenced Participants show an `in use` chip instead of a destructive action.

## Settlement Focus

- Settle up appears only when Suggested Settlements exist.
- Suggested Settlement rows show one primary Record action until inline confirmation is open.
- While inline confirmation is open, the row shows Record Settlement Payment and Cancel, not a second Record action.
- Copy summary appears only in settlement focus while Suggested Settlements exist.

## Settled Event

- Suggested Settlements reads as settled and does not show Settle up or Copy summary.
- Event History remains available when records exist.
- Add Expense and embedded Event Participants remain available because late costs and corrections are still valid.

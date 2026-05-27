# SettleUp

SettleUp helps people track shared expenses for a bounded occasion and work out who should pay whom.

## Language

**Event**:
A temporary shared space for one bounded occasion where participants record expenses and settle balances in one **Currency**. An **Event** may be a dinner, party, weekend trip, household errand run, or any other short-lived shared-cost occasion.
_Avoid_: Trip, group, room, tab, ledger

**Event Link**:
The shareable URL that grants access to one **Event**. Anyone with the **Event Link** may view the Event and act as a **Participant** within it.
_Avoid_: Invite, login link, magic link, access token

**Event Record**:
The saved state of an **Event** before derived **Balances** and **Suggested Settlements** are added. An **Event Record** contains the Event summary, Participants, Expenses, Shares, and Settlement Payments that storage adapters persist or load.
_Avoid_: Raw event, database row bundle, store payload

**Event Snapshot**:
The full readable state of an **Event** returned to callers after **Balances** and **Suggested Settlements** have been derived from an **Event Record**.
_Avoid_: View model, response blob, DTO

**Event Title**:
The required human-readable name of an **Event**. An **Event Title** helps **Participants** recognize the Event but does not identify or grant access to it.
_Avoid_: Slug, event id, token

**Balance**:
A **Participant**'s net position in an **Event** after **Expenses** and **Settlement Payments**. A positive Balance means the Participant is owed money; a negative Balance means the Participant owes money.
_Avoid_: Debt, tab, running total

**Currency**:
The money unit used by an **Event**. Each **Event** has exactly one Currency, and all money amounts inside the Event use whole minor units for that Currency, such as cents.
_Avoid_: Exchange rate, converted amount, multi-currency

**Expense**:
A cost recorded in an **Event** because one **Participant** paid money on behalf of one or more **Participants**. An **Expense** has exactly one paying Participant and one or more **Shares**, and is not itself a repayment between Participants.
_Avoid_: Payment, entry, transaction, bill

**Participant**:
A person represented inside an **Event** with a display name and a stable identity for that Event. A **Participant** is not an account, and may be created by anyone with the **Event Link**.
_Avoid_: User, member, account, contact

**Private-by-Link**:
A privacy model where an **Event** is accessible to anyone with its **Event Link** and not discoverable through public listing or search. **Private-by-Link** does not mean account-private or end-to-end encrypted.
_Avoid_: Public, account-private, encrypted

**Settlement Payment**:
Money one **Participant** records as paid to another Participant to reduce or clear balances in an **Event**. A **Settlement Payment** has a Sender and a Recipient, is not an **Expense**, and has no **Shares**.
_Avoid_: Expense, payment, reimbursement, transfer

**Share**:
A **Participant**'s portion of an **Expense**, expressed as a specific amount for that Participant. An **Expense** has one or more Shares whose amounts sum to the full Expense amount.
_Avoid_: Split, allocation, weight, line item

**Suggested Settlement**:
A recommended Participant-to-Participant payment, with a suggested Sender and Recipient, that would reduce outstanding **Balances** in an **Event**. A **Suggested Settlement** is not recorded history unless someone records a **Settlement Payment**.
_Avoid_: Balance, debt, invoice

## Example Dialogue

**Developer**: Should we create a Trip when someone wants to split a dinner bill?

**Domain Expert**: No, create an **Event**. A dinner and a weekend away are both Events.

**Developer**: Can one Event include Australian dollars and US dollars?

**Domain Expert**: No. Pick one **Currency** for the Event.

**Developer**: Does the invite prove that someone can edit the Event?

**Domain Expert**: Call it an **Event Link**. Anyone with it can participate in the Event.

**Developer**: Is "Sydney weekend" part of the Event Link?

**Domain Expert**: No, that is the **Event Title**. The Event Link is separate.

**Developer**: Sarah paid the restaurant. Is that a Payment?

**Domain Expert**: No, it is an **Expense**. The Payment language is only used for **Settlement Payments** between Participants.

**Developer**: Alex later pays Sarah back. Is that another Expense?

**Domain Expert**: No, that is a **Settlement Payment**.

**Developer**: Should the app say who owes whom?

**Domain Expert**: Show **Balances** and **Suggested Settlements**. Suggested Settlements are recommendations, not recorded payments.

**Developer**: Everyone ate different amounts. Is the Expense still equal?

**Domain Expert**: Not necessarily. Record each person's **Share** as a specific amount.

**Developer**: Sarah paid for dinner and also ate dinner. Does Sarah get a Share?

**Domain Expert**: Yes. The paying Participant can also have a **Share**.

**Developer**: Should we store the User who paid for dinner?

**Domain Expert**: Store the **Participant**. SettleUp does not require accounts.

**Developer**: Can two people in the same Event both be called Alex?

**Domain Expert**: Yes. The display name can collide because each **Participant** still has a stable identity inside the Event.

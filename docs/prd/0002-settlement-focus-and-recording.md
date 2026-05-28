# PRD: Settlement Focus and Recording

## Problem Statement

SettleUp can calculate Balances and Suggested Settlements, but final settlement still risks feeling like manual form entry. When the group is ready to settle, the app should make the recommended Participant-to-Participant payments obvious and make recording actual Settlement Payments fast without blurring the distinction between recommendations and saved history.

## Solution

Add a user-controlled settlement-focused mode on the same Event page. In that mode, Suggested Settlements become the primary action, each Suggested Settlement can be recorded through inline confirmation, and the recorded amount can be edited for partial payments or overpayments. Later, add a concise copyable settlement summary for group chat.

## User Stories

1. As a Participant ready to settle, I want to switch into settlement focus, so that the next payments are obvious.
2. As a Participant reviewing the Event, I want Expenses and context to remain reachable, so that late costs can still be added.
3. As a Participant seeing a Suggested Settlement, I want to confirm before recording it, so that saved history is not created by accident.
4. As a Participant making a partial payment, I want to edit the suggested amount before saving, so that actual money movement is recorded accurately.
5. As a Participant making an overpayment, I want the app to accept it deliberately, so that Balances reflect what happened.
6. As a Participant after recording a Settlement Payment, I want Balances and Suggested Settlements refreshed, so that the remaining state is current.
7. As a Participant, I do not want Suggested Settlements to become checklist items, so that recommendations stay separate from history.
8. As a Participant coordinating in a group chat, I want to copy a concise settlement summary, so that everyone can see the final recommended payments.

## Implementation Decisions

- Settlement focus is user-controlled and stays on the Event page.
- Settlement focus does not lock the Event, imply ownership, or imply special permission for the current Participant.
- Suggested Settlements become primary actions when settlement focus is active.
- Recording a Suggested Settlement uses inline confirmation with sender, recipient, amount, and a final Record Settlement Payment action.
- The suggested amount remains visible and the recorded amount is editable.
- After recording, refresh from the saved Event state and recompute Balances and Suggested Settlements.
- Do not track progress on Suggested Settlements. They remain derived recommendations.
- Settlement summaries should be plain text for group chat, not a report, export center, print view, or archive.

## Testing Decisions

- Test settlement focus through visible behavior and route payloads rather than internal state shape.
- Cover inline confirmation creating a Settlement Payment from a Suggested Settlement.
- Cover edited amounts for partial payments and overpayments.
- Cover recomputation after recording so old suggestions are not treated as checklist items.
- Cover copyable summary text using realistic Participant names and Currency formatting.

## Out of Scope

- One-click saved Settlement Payments.
- Dedicated settlement route or wizard.
- Payment provider integration.
- Export, PDF, print, archive, audit history, edit attribution, or comments.

## Further Notes

`CONTEXT.md` defines Suggested Settlement as a recommendation and Settlement Payment as recorded money movement. The UI must preserve that distinction.

## Implementation Status

Shipped for Forgejo issues `#35` through `#38`.

- The Event page now exposes Settle up only when current Suggested Settlements exist.
- Settlement focus highlights Suggested Settlements while keeping the rest of the Event page reachable.
- Recording from a Suggested Settlement now opens inline confirmation instead of filling the generic Settlement Payment form.
- The confirmation keeps the suggested amount visible and allows a different recorded amount for partial payments or overpayments.
- Recording posts a real Settlement Payment and refreshes Balances and Suggested Settlements from saved Event state.
- Copy summary is available in settlement focus when suggestions exist and writes concise plain text to the clipboard.

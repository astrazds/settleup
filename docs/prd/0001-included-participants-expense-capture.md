# PRD: Included Participants Expense Capture

## Problem Statement

SettleUp already supports exact Shares, but the current Expense flow makes users think in Share rows before they have answered the simpler question: who was included in this Expense? That creates friction during the highest-priority moment, when someone is trying to capture a shared cost while the group is still in motion.

## Solution

Make Included Participants the first-class Expense capture control. Users choose who was included with direct checkbox-style controls, SettleUp equal-splits the Expense among those Participants by default, and exact Share adjustment remains available when needed. The saved Expense still contains explicit Shares whose amounts sum to the Expense amount.

## User Stories

1. As a Participant entering a taxi Expense, I want to choose only the people who rode in the taxi, so that uninvolved Participants are not charged.
2. As a Participant entering a dinner Expense, I want the payer included by default, so that the common case is correct without extra taps.
3. As a Participant entering an Expense, I want equal Shares generated for the Included Participants, so that I do not need to calculate per-person amounts.
4. As a Participant entering an Expense with uneven costs, I want to adjust exact Shares intentionally, so that I can record precise amounts when equal split is wrong.
5. As a Participant editing an old Expense, I want the Included Participants to match the saved Shares, so that later Participants are not added accidentally.
6. As a Participant using a phone, I want inclusion controls to be direct and obvious, so that I do not need to understand removable rows.
7. As a Participant briefly changing the included set, I want temporary empty draft states to be allowed, so that editing does not fight me.
8. As a Participant saving an Expense, I want SettleUp to block saving with no Included Participants, so that saved Expenses always have at least one Share.
9. As a Participant reviewing the split, I want any rounding cents assigned deterministically, so that the result feels neutral and trustworthy.
10. As a new Event creator, I want the empty Event page to guide me toward adding Participants, so that the first shared Expense is easy to capture.

## Implementation Decisions

- Add checkbox-style Included Participant controls to Expense capture.
- Include the selected payer by default for new Expenses.
- Allow the payer to be removed from Included Participants, but show a calm warning because it is valid but uncommon.
- Equal-split among Included Participants by default and generate explicit Shares in minor units.
- Assign any equal-split rounding remainder by Participant order, not by payer or current Participant.
- Preserve exact Share support behind an intentional adjustment path.
- Allow a temporary draft with no Included Participants, but disable or block save until at least one Participant is included.
- Initialize edit mode from the Expense's saved Shares, not from new-Expense defaults.
- Improve the empty Event path only enough to make adding Participants the obvious next action before first Expense capture.

## Testing Decisions

- Test behavior through public interfaces and route/UI-facing behavior, not private helpers.
- Cover new Expense capture with Included Participants through existing route behavior and client payload generation.
- Cover edit behavior by proving saved Shares initialize inclusion and are not overwritten by later Event Participants.
- Cover rounding with deterministic examples that prove Shares sum to the Expense amount.
- Cover validation for no Included Participants with user-facing error behavior.

## Out of Scope

- Receipt photos, OCR, receipt notes, natural-language Expense parsing, categories, tags, recurring Events, templates, multiple currencies, and forgiveness records.
- Locks, permissions, owners, accounts, or edit attribution.
- Full redesign of settlement focus.

## Further Notes

`CONTEXT.md` defines an Included Participant as a Participant who has a Share on a specific Expense. The implementation should keep that domain meaning intact: inclusion is not membership in the Event.

## Implementation Status

Shipped for Forgejo issues `#29` through `#33`.

- New Expense capture now starts with Included Participant checkboxes and an equal-split preview.
- Saving an equal split generates explicit Shares in minor units and blocks invalid no-Participant or zero-share splits.
- Editing an Expense initializes Included Participants and exact Share rows from the saved Shares, so later Participants are not added accidentally.
- Exact Share controls stay behind Adjust Shares and include an assign-remaining helper for resolving positive or negative remaining amounts.
- Empty Events with only the creator Participant now guide users toward adding Participants before the first shared Expense.

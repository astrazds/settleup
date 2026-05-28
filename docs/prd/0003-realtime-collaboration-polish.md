# PRD: Realtime Collaboration Polish

## Problem Statement

Realtime Event updates make SettleUp feel more collaborative, but they also make stale drafts more visible. If saved Event data changes while someone is editing, the app should communicate that calmly without adding locks, permissions, presence, or edit attribution.

## Solution

Keep realtime collaboration focused on saved Event-change notifications. Show compact connection/update status, preserve draft forms when refreshes arrive, and warn near active drafts when the Event changed while the user was editing. Do not show named presence, viewer counts, or who made a change.

## User Stories

1. As a Participant with the Event open, I want saved changes from others to appear quickly, so that I do not act on stale Balances.
2. As a Participant entering an Expense, I want my draft preserved when realtime updates arrive, so that I do not lose work.
3. As a Participant editing a saved Expense, I want to know if the Event changed while I was editing, so that I can review before saving.
4. As a Participant on a shared device, I do not want the app to claim who made a change, so that local defaults are not mistaken for identity.
5. As a Participant, I do not want presence indicators, so that the app does not imply account-like certainty.
6. As a Participant on an unreliable connection, I want fallback refresh behavior, so that the Event still updates without WebSocket support.

## Implementation Decisions

- Use realtime as Event-change notification, not as presence, chat, locking, or edit attribution.
- Keep D1 as the saved Event source of truth; refresh Event Snapshot after a change notification.
- Preserve draft forms during realtime refreshes and fallback polling refreshes.
- If a realtime update arrives while a draft or edit form is open, show a calm review warning near the active form.
- Keep copy neutral: "Event updated" rather than naming a Participant.
- Keep polling as fallback while WebSockets reconnect or are unavailable.

## Testing Decisions

- Test mutation notification behavior through public routes and notifier seams.
- Test stale-draft warning behavior from the client-visible state, not private functions.
- Test that draft form values survive realtime-triggered refreshes.
- Test fallback polling remains available when WebSocket setup fails.

## Out of Scope

- Named presence, viewer counts, chat, edit attribution, accounts, permissions, ownership, locking, merge conflict UI, and audit history.

## Further Notes

Current Participant selection is a local default, not authenticated identity. Realtime copy and behavior must not imply otherwise.

## Implementation Status

Shipped for Forgejo issue `#34`.

- Expense and Settlement Payment drafts are marked dirty through visible form input and edit actions.
- Realtime and fallback polling refreshes preserve active draft fields.
- If an Event update arrives while a draft is active, the app shows the same neutral warning near the active form: "Event updated while you were editing. Review before saving."
- The warning copy does not name Participants, imply presence, or introduce locks or permissions.

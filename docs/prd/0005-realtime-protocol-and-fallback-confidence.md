# PRD: Realtime Protocol and Fallback Confidence

## Problem Statement

Realtime Event updates are central to shared expense capture, but the test suite needed stronger confidence that notifications are Event-scoped, only sent after successful mutations, and backed up by fallback polling without overwriting drafts.

## Solution

Add protocol-level tests around the Durable Object room, notifier routing, realtime connection route, and route notification behavior. Extend browser coverage so fallback polling proves that remote saved changes appear while active draft form values are preserved and the warning copy remains neutral.

## User Stories

1. As a Participant with an Event open in two browsers, I want saved changes to reach the other browser quickly.
2. As a Participant editing a draft during an update, I want my unsaved fields preserved.
3. As a developer changing realtime routing, I want Event token isolation tests, so unrelated Events do not receive each other's notifications.
4. As a developer changing mutation routes, I want notification tests that fire only after success, so failed writes do not prompt stale refreshes.

## Implementation Decisions

- Keep D1 as the saved Event source of truth; realtime only broadcasts Event-change notifications.
- Test the Durable Object room broadcast behavior directly with fake WebSocket globals.
- Test `DurableObjectEventRealtimeNotifier` token isolation through the public notifier seam.
- Test route-level realtime connection and mutation notification behavior through Hono requests.
- Keep browser fallback polling as the recovery path when WebSockets reconnect or are unavailable.

## Testing Decisions

- Cover Durable Object broadcast behavior without relying on a live network.
- Cover success-only notifications for Participant, Expense, and Settlement Payment mutations.
- Cover browser fallback polling through Playwright against local Wrangler dev.
- Assert draft preservation and neutral review warning copy through user-visible browser state.

## Out of Scope

- Presence, viewer counts, chat, edit attribution, locks, merge conflict UI, accounts, and permissions.
- Moving Event state into Durable Objects.

## Implementation Status

Shipped for Forgejo issues `#70` and `#76` through `#78`.

- Covered realtime room broadcast and Event token isolation.
- Covered success-only realtime notifications.
- Hardened reconnect and fallback polling browser tests.

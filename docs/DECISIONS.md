# Decisions

This file replaces the former ADR folder. Keep it short: add only durable decisions that future work should not accidentally reverse.

## Platform

- Use Cloudflare Workers with Hono for the Worker runtime.
- Serve the frontend and JSON API from one Worker until the UI complexity justifies a separate frontend app.
- Use plain TypeScript, JavaScript, and CSS for the first frontend instead of React, Vite, Hono JSX, or another frontend framework.

## Data

- Use Cloudflare D1 as the durable database for Events, Participants, Expenses, Shares, Settlement Payments, Balances inputs, and Suggested Settlement inputs.
- Keep Balances and Suggested Settlements derived from saved records.
- Keep Event mutation rules centralized in `src/event-record.ts`; storage adapters load and persist Event Records.
- Keep D1 row mapping and all-or-nothing Event Record replacement behind `src/d1-event-record-persistence.ts`.
- D1 adapter tests use Miniflare with checked-in migrations rather than a handwritten SQL fake.

## Runtime Shape

- Route handlers adapt HTTP details into Saved Event Commands; `src/event-command-runtime.ts` owns saved mutation execution, validation error mapping, and success-only realtime notification.
- UI state that can be described without the DOM belongs in plain TypeScript policy/composition modules before it is mirrored into browser script helpers.

## Access And Privacy

- Use Private-by-Link access for MVP Events: anyone with the Event Link can view and edit the Event.
- Event Links use opaque random tokens rather than human-readable slugs.
- Event Titles are human-readable labels only; they do not grant access.

## Money

- MVP Currencies are AUD, USD, EUR, GBP, and NZD.
- MVP money handling assumes two-decimal minor units.
- Reject unsupported Currency codes until the product deliberately adds metadata for broader Currency support.

## Realtime

- Use one Durable Object room per Event token for WebSocket coordination.
- D1 remains the saved Event source of truth; the Durable Object only broadcasts Event-change notifications after successful mutations.
- Keep the Event realtime protocol in `src/event-realtime-protocol.ts` and share its message shape, route path, fallback interval, and reconnect timing with the browser client.
- Browser polling remains a fallback for unavailable or reconnecting WebSockets.
- Realtime must not add presence, chat, edit attribution, locks, accounts, or permissions.

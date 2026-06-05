# Decisions

This file replaces the former ADR folder. Keep it short: add only durable decisions that future work should not accidentally reverse.

## Platform

- Use Hono on a Node HTTP server for the app runtime.
- Serve the frontend and JSON API from one Node app until the UI complexity justifies a separate frontend app.
- Use React for Event page interaction while keeping the frontend served by the app as a bundled `/static/client.js` asset.
- Keep CSS and route-owned document shells in the app; do not introduce a separate frontend app until the UI complexity justifies it.

## Data

- Use SQLite through Node `node:sqlite` as the durable database for Events, Participants, Expenses, Shares, and Settlement Payments.
- Keep Balances and Suggested Settlements derived from saved records; Suggested Settlements may power UI actions but are not persisted as history.
- Keep the UI and Saved Event command surface limited to Included Participants for Expenses; derive equal Shares server-side before persisting the Event Record.
- Keep Event mutation rules centralized in `src/event-record.ts`; storage adapters load and persist Event Records.
- Keep SQLite row mapping and all-or-nothing Event Record replacement behind `src/sqlite-event-record-persistence.ts`.
- SQLite adapter tests use in-memory Node SQLite with checked-in migrations rather than a handwritten SQL fake.
- Treat MVP Events as short-lived data: expire access after three days and delete persisted records after five days through runtime cleanup.

## Runtime Shape

- Route handlers adapt HTTP details into Saved Event Commands; `src/event-command-runtime.ts` owns saved mutation execution, validation error mapping, and success-only realtime notification.
- UI state that can be described without the DOM belongs in plain TypeScript policy/composition modules before it is consumed by React components.
- Use checked-in shadcn/ui source components for the React Event page. Keep the app server-rendered and app-served; do not introduce a separate frontend build app just to use shadcn.
- Use shadcn preset `b6u0ULvrE` (`radix-rhea`, olive base color, Inter variable font, Lucide icons) as the UI styling baseline.
- `npm run build:client` owns both generated browser assets: the React client bundle and the compiled shadcn/Tailwind stylesheet module.

## Access And Privacy

- Use Private-by-Link access for MVP Events: anyone with the Event Link can view and edit the Event.
- Event Links use opaque random tokens rather than human-readable slugs.
- Event Titles are human-readable labels only; they do not grant access.

## Money

- MVP Currencies are AUD, USD, EUR, GBP, and NZD.
- MVP money handling assumes two-decimal minor units.
- Reject unsupported Currency codes until the product deliberately adds metadata for broader Currency support.

## Realtime

- Use one in-process WebSocket room per Event token for realtime coordination.
- SQLite remains the saved Event source of truth; realtime only broadcasts Event-change notifications after successful mutations.
- Keep the Event realtime protocol in `src/event-realtime-protocol.ts` and share its message shape, route path, fallback interval, and reconnect timing with the browser client.
- Browser polling remains a fallback for unavailable or reconnecting WebSockets.
- Realtime must not add presence, chat, edit attribution, locks, accounts, or permissions.

# SettleUp Server

SettleUp is a backend-only JSON API for no-login, private-by-link shared
expense events. The event token is the access boundary: keep links private and
send money as positive integer minor-unit amounts (for example, `1250` for
`$12.50`).

The server does not build or serve a frontend. Every non-API path returns
`404 Not Found`.

## Run locally

Use Node.js 20, 22, or 24 and newer with npm 12.

```sh
npm install
npm run dev
```

The API listens on port `8787` by default.

## HTTP API

All event operations are scoped by the private event token.

| Method | Path | Request body |
| --- | --- | --- |
| `POST` | `/api/events` | `{ title, currency, firstParticipantName }` |
| `GET` | `/api/events/:token` | — |
| `GET` | `/api/events/:token/stream` | — |
| `POST` | `/api/events/:token/participants` | `{ name }` |
| `PATCH` | `/api/events/:token/participants/:participantId` | `{ name }` |
| `DELETE` | `/api/events/:token/participants/:participantId` | — |
| `POST` | `/api/events/:token/expenses` | `{ description, amountMinor, payerId, includedParticipantIds }` |
| `PATCH` | `/api/events/:token/expenses/:expenseId` | `{ description, amountMinor, payerId, includedParticipantIds }` |
| `DELETE` | `/api/events/:token/expenses/:expenseId` | — |
| `POST` | `/api/events/:token/payments` | `{ from, to, amountMinor }` |
| `PATCH` | `/api/events/:token/payments/:paymentId` | `{ from, to, amountMinor }` |
| `DELETE` | `/api/events/:token/payments/:paymentId` | — |

Event creation returns `201` with `{ token, snapshot }`. Successful creates
return `201`; other successful mutations return `200`. Each event mutation
returns the complete updated snapshot rather than a resource fragment.
Validation errors return `{ error }` with `400`, missing resources return
`404`, and expired event links return `410`.

Supported currencies are `AUD`, `USD`, `EUR`, `GBP`, and `NZD`.

## Snapshots and realtime updates

An event snapshot contains the event, participants, expenses, recorded
payments, balances, and the next settlement suggestion. Expense shares,
balances, and settlement suggestions are recomputed from persisted rows; they
are not stored summary values. Each successful mutation increments the event
version.

`GET /api/events/:token/stream` opens a server-sent events stream. It sends an
initial `connected` event and then `changed` events whose data contains only
`{ version }`. Consumers should refetch `GET /api/events/:token` after a
change. The broker is in-memory and process-local; SQLite remains the durable
source of truth.

## SQLite and retention

The server uses `better-sqlite3`, enables foreign keys and WAL mode, and
applies its schema at startup. Event tokens are stored as hashes.

Private event links work for three days. Expired links return `410`; their rows
remain until the five-day cleanup deadline. Cleanup runs at startup and hourly,
with related participant, expense, share, and payment rows removed by cascade.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | HTTP listening port |
| `SETTLEUP_DB` | `data/settleup.sqlite` | SQLite database path; `:memory:` is also supported |

## Commands

```sh
npm run dev          # Watch and run the TypeScript backend
npm run dev:api      # Compatibility alias for dev
npm run typecheck    # Type-check server, shared code, and tests
npm test             # Run the Vitest suite
npm run clean        # Remove all generated output under dist
npm run build        # Clean and compile the server to dist/server
npm run build:server # Compatibility alias for build
npm run build:all    # Compatibility alias for build
npm start            # Run the compiled server
```

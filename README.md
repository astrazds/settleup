# SettleUp

SettleUp is a mobile-first shared-expense app for short-lived, private-by-link
events. It has no accounts: the event link is the access boundary, so keep it
private.

The repository contains two independently deployable surfaces and one shared
wire-contract package:

- `apps/web` builds a static React application.
- The repository root builds the Hono JSON API and SQLite service.
- `packages/contracts` provides the Zod schemas and TypeScript types used at
  both sides of the HTTP boundary.

The API never serves frontend assets or client routes. Direct non-API requests
to the backend continue to return `404 Not Found`.

## Run locally

Use Node.js 22.22.x, or Node.js 24 and newer, with npm 12.

```sh
npm install
npm run dev:all
```

Open `http://127.0.0.1:5173`. The web development server proxies relative
`/api` requests and event streams to the API on port `8787`.

Run either surface separately with `npm run dev:web` or `npm run dev:api`.

## Frontend

The frontend is a static React Router SPA with three event sections:

- Expenses: record equal-split expenses and see current balances.
- Settle: follow the next settlement suggestion and record offline payments.
- People: add, rename, or remove eligible participants.

Expense forms preview the exact per-person minor-unit split, including remainder
cents, and saved expenses keep that server-authored breakdown available.
The API rejects a mutation before writing if the event's combined expense and
payment amounts would exceed the exact safe-integer range.
Mutation responses are validated, then route actions revalidate the event
loader so the latest server snapshot remains authoritative. Live updates are
invalidation messages only; the browser refetches the snapshot after a newer
event version, reconnection, focus, or return online. If live details change
while a transaction form is open, saving pauses until the latest version is
loaded and reviewed.

Browser preferences are limited to the current tab session and store only a
participant ID keyed by the public event ID. Event tokens and snapshots are
not persisted.

## Shared contracts

`@settleup/contracts` is the source of truth for request commands, snapshots,
API errors, and event-stream payloads. The API validates incoming JSON with
these schemas, and the frontend validates both outgoing commands and incoming
responses. Keep backend persistence and browser presentation concerns out of
this package.

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
`404`, stale mutation preconditions return `412`, and expired event links
return `410`.

Snapshot responses include an event-version `ETag` such as `"v3"`. Event
mutations may send that value in `If-Match`; if another mutation won the race,
the server checks the version inside the SQLite transaction and returns `412`
without writing. The web client uses this precondition for every event
mutation.

Supported currencies are `AUD`, `USD`, `EUR`, `GBP`, and `NZD`.

## Snapshots and realtime updates

An event snapshot contains the event, participants, expenses, recorded
payments, balances, and the next settlement suggestion. Expense shares,
are derived deterministically when an expense is saved and persisted with it.
Balances and settlement suggestions are recomputed from the persisted ledger
rather than stored as summary values. Each successful mutation increments the
event version.

`GET /api/events/:token/stream` opens a server-sent events stream. It sends an
initial `connected` event and then `changed` events whose data contains only
`{ version }`. Consumers should refetch `GET /api/events/:token` after a
change. The broker is in-memory and process-local; SQLite remains the durable
source of truth.

## SQLite and retention

The server uses `better-sqlite3`, enables foreign keys and WAL mode, and
applies its schema at startup. Event tokens are stored as hashes.

Private event links work for three days after creation. Expired links return
`410`; their rows remain until the cleanup deadline five days after creation.
Cleanup runs at startup and hourly, with related participant, expense, share,
and payment rows removed by cascade.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | HTTP listening port |
| `SETTLEUP_DB` | `data/settleup.sqlite` | SQLite database path; `:memory:` is also supported |

## Deployment boundary

`npm run build:all` produces:

- `dist` as the compiled API tree, including the `dist/server/server.js`
  entrypoint and its `dist/shared` dependencies. It is not a standalone
  bundle; deploy its production dependencies, including the built
  `@settleup/contracts` workspace package.
- `apps/web/build/client` as the static web-host payload. React Router also
  emits `apps/web/build/server` while building the SPA; it is not the API
  service and is not the directory to publish to the static host.

Expose both through one public origin. Route `/api/*` to the API before the
static-host fallback, and route all other paths to the SPA `index.html`. The
edge or reverse proxy must allow long-lived, unbuffered server-sent event
connections.

Private JSON and event-stream responses must not be cached. The generic HTML
shell should be revalidated, while hashed assets may be cached immutably. The
current realtime broker is process-local, so v1 runs a single API replica.

## Commands

```sh
npm run dev:all      # Run the API and web development servers
npm run dev:api      # Run only the TypeScript API watcher
npm run dev:web      # Run only the web development server
npm run lint         # Lint the frontend
npm run typecheck    # Type-check contracts, API, and frontend
npm test             # Run contract, API, and frontend unit tests
npm run test:e2e     # Run real-browser end-to-end tests
npm run clean        # Remove generated server and web output
npm run build:server # Build contracts and compile the API
npm run build:web    # Build the static SPA
npm run build:all    # Build contracts, API, and SPA
npm start            # Run the compiled API
npm run preview:web  # Preview the built SPA locally
```

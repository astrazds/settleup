<p align="center">
  <img src="docs/assets/readme/settleup-icon.png" width="112" height="112" alt="SettleUp Settle Cut icon">
</p>

<h1 align="center">SettleUp</h1>

<p align="center">
  No-login shared expenses for short-lived private-by-link events.
</p>

<p align="center">
  <a href="https://github.com/astrazds/settleup/actions/workflows/ci.yml"><img alt="CI status" src="https://github.com/astrazds/settleup/actions/workflows/ci.yml/badge.svg?branch=main"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

SettleUp is a mobile-first shared-expense app for trips, weekends, meals, and
parties. One person starts a private event and shares the link. The group
records what everyone paid, sees exactly how each cost was split, and finishes
settling without creating accounts.

The promise is **"Everyone pays. Every cent lands."** SettleUp records
payments made outside the app. It does not move money.

<p align="center">
  <img src="docs/assets/readme/settleup-landing.png" alt="SettleUp landing page for creating a private shared-expense event">
</p>

## Why SettleUp?

Shared costs should not become a spreadsheet or a banking product. SettleUp
keeps one short-lived workspace behind a private link:

- No accounts. The complete event link is the access boundary, so keep it
  private. Anyone with the link can view and edit the event.
- Equal splits only, in integer minor units. Remainder cents are assigned
  deterministically and shown on the expense.
- One next settlement suggestion at a time, derived from the current ledger.
- Links work for three days. Event data becomes eligible for cleanup after
  five days and is deleted by the next startup or hourly cleanup run.

## Install

SettleUp ships as source. [mise](https://mise.jdx.dev/) installs the exact
Node.js and npm versions declared in `mise.toml`.

```sh
git clone https://github.com/astrazds/settleup.git
cd settleup
mise install
mise run install
mise run dev
```

Open `http://127.0.0.1:5173`. The web development server proxies relative
`/api` requests and event streams to the API on port `8787`.

Run either surface separately with `mise run dev:web` or `mise run dev:api`.

## Use

1. Create a private event with a title, your name, and a currency, then share
   the link with the group.
2. Record equal-split expenses as they happen. Inspect the exact per-person
   shares, including remainder cents.
3. Open **Settle** for current balances and the next suggested payment. Record
   the payment after it happens outside SettleUp.
4. Use **People** to add or rename participants. A person referenced by an
   expense or payment cannot be removed.

```mermaid
flowchart LR
  C[Create event] --> L[Share private link]
  L --> E[Record expenses]
  E --> S[Review balances]
  S --> P[Record payment elsewhere]
  P --> S
```

Add and edit tasks are URL-addressable sheets. Live updates cause the browser
to fetch the latest event snapshot. If the event changes while you edit, your
draft stays visible and saving pauses. Choose **Load latest** to reset the form
to the current event before continuing.

## Privacy

SettleUp has no accounts, analytics, or advertising. The server does store
event titles, participant names, expenses, and recorded payments for the event
lifetime. Event tokens are stored as hashes. Anyone with the complete link can
read and change that data.

| Location | Purpose |
| --- | --- |
| SQLite event rows | Title, currency, participants, expenses, shares, and payments until cleanup |
| Hashed event token | Resolve the private link without storing it in plaintext |
| Tab-session participant ID | Remember the current person in this browser tab |

See [PRIVACY.md](PRIVACY.md) for the complete data boundary.

## Limitations

- Splits are equal only. There are no percentages, weights, or itemized shares.
- SettleUp records payments. It does not transfer money or connect to a bank.
- Event links last three days. This is not a permanent ledger.
- The interface is English-only.
- The realtime broker is process-local, so v1 runs a single API replica.
- There is no hosted demo. Run it locally from this repository.

## Project structure

| Path | Purpose |
| --- | --- |
| `apps/web/` | Static React Router SPA and visual/product contracts |
| `src/server/` | Hono JSON API, SQLite, and SSE invalidation |
| `packages/contracts/` | Zod schemas and TypeScript types for the HTTP boundary |
| `docs/assets/readme/` | README icon and landing screenshot |

Product behavior lives in [`apps/web/PRODUCT.md`](apps/web/PRODUCT.md). The
visual system is [`apps/web/DESIGN.md`](apps/web/DESIGN.md). The API never
serves frontend assets or client routes. See the [architecture map](docs/architecture.md)
for rule ownership, mutation order, browser state, and focused verification.
Contributor setup and test commands live in [CONTRIBUTING.md](CONTRIBUTING.md).
Report vulnerabilities through the process in [SECURITY.md](SECURITY.md).

## HTTP API

All event operations are scoped by the private event token.

| Method | Path | Request body |
| --- | --- | --- |
| `POST` | `/api/events` | `{ title, currency, firstParticipantName }` |
| `GET` | `/api/events/:token` | - |
| `GET` | `/api/events/:token/stream` | - |
| `POST` | `/api/events/:token/participants` | `{ name }` |
| `PATCH` | `/api/events/:token/participants/:participantId` | `{ name }` |
| `DELETE` | `/api/events/:token/participants/:participantId` | - |
| `POST` | `/api/events/:token/expenses` | `{ description, amountMinor, payerId, includedParticipantIds }` |
| `PATCH` | `/api/events/:token/expenses/:expenseId` | `{ description, amountMinor, payerId, includedParticipantIds }` |
| `DELETE` | `/api/events/:token/expenses/:expenseId` | - |
| `POST` | `/api/events/:token/payments` | `{ from, to, amountMinor }` |
| `PATCH` | `/api/events/:token/payments/:paymentId` | `{ from, to, amountMinor }` |
| `DELETE` | `/api/events/:token/payments/:paymentId` | - |

Event creation returns `201` with `{ token, snapshot }`. Participant, expense,
and payment creation return `201` with the complete updated snapshot. Updates
and deletions return `200` with that snapshot. Validation errors
return `{ error }` with `400`, missing resources `404`, stale
`If-Match` preconditions `412`, and expired links `410`.

Snapshot responses include an ETag such as `"v3"`. Send that value in
`If-Match` when changing an existing event to reject a stale write. The header
is optional at the API boundary; the web app sends its accepted event version.
Malformed entity tags return `400`. A syntactically valid list matches if it
contains the current strong version tag. Weak tags do not match, and `*`
accepts the current active event without checking a version.

Supported currencies are `AUD`, `USD`, `EUR`, `GBP`, and `NZD`. Money crosses
the API as integer minor units. Balances and settlement suggestions are
recomputed from the persisted ledger. The event stream opens with `connected`
and `{}`. Subsequent `changed` messages contain only `{ version }`; clients
refetch the snapshot after connection and after a newer version arrives.

## SQLite, retention, and deploy

The server uses `better-sqlite3` with foreign keys and WAL mode. Private links
work for three days. Cleanup runs at startup and hourly, deleting events whose
five-day cleanup deadline has passed. After deletion, their links return `404`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | HTTP listening port |
| `SETTLEUP_DB` | `data/settleup.sqlite` | SQLite path; `:memory:` is also supported |

`mise run build` produces `dist` for the API and `apps/web/build/client`
for the static host. Start the built API with `mise exec -- npm start` from
the repository root, with workspace dependencies and the built contracts
package available. Keep the SQLite directory on persistent writable storage.

Expose both runtimes through one HTTPS origin. Route `/api/*` to the API,
serve static assets from the frontend build, and use its `index.html` as the
fallback for client routes. Private JSON and event streams must not be cached.
The edge must allow long-lived, unbuffered SSE. Run one API replica because the
event broker is process-local. See [SECURITY.md](SECURITY.md) for link and log
handling at the host.

## Development

```sh
mise run dev         # API and web development servers
mise run lint        # Lint the frontend
mise run typecheck   # Type-check contracts, API, and frontend
mise run test        # Contract, API, and frontend unit tests
mise run test:e2e    # Real-browser end-to-end tests; install browsers first
mise run build       # Build contracts, API, and SPA
mise run check       # Run every gate in order
```

CI on `main` is the [CI workflow](https://github.com/astrazds/settleup/actions/workflows/ci.yml).
It uses `mise.toml` and runs lint, typecheck, unit tests, build, and the Playwright suite
without pixel snapshots. Visual baselines stay a local Chromium gate. The
verification commands rebuild the generated contracts package. Frontend lint
and typecheck each generate React Router types before reading them, so lint
also works before the first build. If verification runs
while `mise run dev` is active and a watcher reports a temporarily missing
contracts output, restart `mise run dev` after verification.

Run `mise run browsers:install` before the first browser test. mise keeps these
browsers in the ignored `.scratch/playwright` directory. Playwright also
requires its platform libraries. On a supported Linux distribution,
`mise run browsers:install -- --with-deps` installs those libraries. Pass test
filters directly, for example `mise run test:e2e -- --project=mobile-chromium`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for focused test commands and visual
baseline review. SettleUp is licensed under [MIT](LICENSE).

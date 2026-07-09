# SettleUp

SettleUp is a no-login shared expense app for one trip, dinner, weekend, house share, or other short-lived event.

Create a private event link, add the people involved, capture expenses as they happen, and see who should pay whom when the group is ready to settle. It is built for mobile-first capture, plain payment language, and low ceremony: no accounts, no roles, no finance-dashboard feel.

The app opens on event creation. A new event starts empty: the creator gives the event a name, adds their own name, sets a compact currency field, then shares the generated private link. People and expenses are added from the event page.

## What It Does

- Creates private-by-link expense events.
- Keeps event creation focused on name, creator, currency, and a short private-link expiry note.
- Adds participants without account setup.
- Renames participants and removes participants that are not referenced by expenses or settlement payments.
- Starts new events without sample participants, expenses, or placeholder data.
- Tracks shared expenses in one event currency.
- Splits expenses equally across selected participants.
- Shows balances in human terms: who pays, who gets back money, and what is already settled.
- Records suggested or manual settlement payments so the group can mark money movement as done.
- Edits or removes recorded settlement payments when the marked payment was wrong.
- Sends saved event changes through a server-sent events stream, with normal API reads as fallback.
- Keeps data short-lived by design: event links expire after three days and cleanup removes persisted event data after five days.

## Stack

- React 19 and Vite for the client.
- Hono on Node for the API and static app server.
- SQLite via `better-sqlite3` for local durable storage.
- TypeScript for shared domain, API, and server code.
- Vitest for behavior tests.

## Local Development

Install dependencies:

```sh
npm install
```

Run the API server in one terminal:

```sh
npm run dev:api
```

Run the Vite client in another terminal:

```sh
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8787`, so the browser app can talk to the local API while keeping normal Vite refresh behavior.

## Production Build

Build the client and server:

```sh
npm run build:all
```

Start the built Node server:

```sh
npm start
```

The server listens on `PORT` or `8787` by default. Runtime data is stored at `data/settleup.sqlite` unless `SETTLEUP_DB` is set. The built client is served from `dist/client` unless `SETTLEUP_PUBLIC_DIR` is set.

## Useful Commands

```sh
npm test              # Run Vitest tests
npm run typecheck     # Run TypeScript checks
npm run build         # Build the client
npm run build:server  # Compile the server
npm run build:all     # Build both client and server
npm run preview       # Preview the built client
```

## Project Map

- `src/App.jsx`: main product UI.
- `src/styles.css`: app styling and responsive behavior.
- `src/client/api.ts`: browser API client.
- `src/shared/domain.ts`: shared event, participant, expense, payment, and balance types.
- `src/server/app.ts`: Hono routes and static client serving.
- `src/server/event-service.ts`: event mutation and balance logic.
- `src/server/database.ts`: SQLite schema and migrations.
- `public/icon-updated.png`: source app and repository icon.
- `PRODUCT.md`: product scope and rules.
- `DESIGN.md`: design system and interaction direction.

## Product Boundaries

SettleUp is intentionally small. It does not include accounts, admins, permission levels, multi-currency events, receipt OCR, attachments, chat, categories, exports, audit history, offline mutation support, or a public API contract.

That restraint is the point: the app should stay fast to open, clear enough to trust with money details, and easy to leave behind when the event is over.

# SettleUp

SettleUp is a no-login shared expense app for one trip, dinner, weekend, house share, or other short-lived event.

Create a private event link, add the people involved, capture expenses as they happen, and see who should pay whom when the group is ready to settle. It is built for mobile-first capture, plain payment language, and low ceremony: no accounts, no roles, no finance-dashboard feel.

The app opens on event creation. A new event starts empty: the creator gives the event a name, adds their own name, chooses a currency, reviews how the three-day private link works, then starts and shares the event. People and expenses are added from the event page.

## What It Does

- Creates private-by-link expense events.
- Keeps event creation focused on name, creator, currency, truthful field progress, and a concrete private-link lifecycle.
- Adds participants without account setup.
- Renames participants and removes participants that are not referenced by expenses or settlement payments.
- Starts new events without sample participants, expenses, or placeholder data.
- Tracks shared expenses in one event currency.
- Splits expenses equally across selected participants and previews the exact cent allocation before saving.
- Uses amount-aware actions such as `Save $100.00 expense`, `Record $33.33`, and `Mark $33.33 paid` when the amount is known.
- Shows balances in human terms: who pays, who gets back money, and what is already settled.
- Records suggested or manual settlement payments so the group can mark money movement as done.
- Edits or removes recorded settlement payments when the marked payment was wrong.
- Sends saved event changes through a server-sent events stream, with normal API reads as fallback.
- Restores an invested local create-event draft for up to 24 hours, while safely ignoring expired or malformed browser data.
- Restores an invested local expense draft after a refresh without letting realtime updates overwrite it.
- Keeps shared changes reversible with expense removal undo and recorded-payment undo paths.
- Keeps data short-lived by design: event links expire after three days and cleanup removes persisted event data after five days.
- Keeps required-field semantics, first-invalid-field focus, and validation announcements accessible while showing create errors inside their inputs without shifting the form.
- Keeps readable placeholders and visible mobile controls at least 44px tall across the primary flows.

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
- `src/components/design-system.jsx`: shared progress, status, avatar, button, and form primitives.
- `src/components/event-ui.jsx`: balance, settlement, confirmation, removal, and undo patterns.
- `src/client/api.ts`: browser API client.
- `src/shared/domain.ts`: shared event, participant, expense, payment, and balance types.
- `src/server/app.ts`: Hono routes and static client serving.
- `src/server/event-service.ts`: event mutation and balance logic.
- `src/server/database.ts`: SQLite schema and migrations.
- `public/icon-updated.png`: canonical 1024×1024 app and repository icon master.
- `public/icon-512.png`, `public/icon-192.png`, `public/apple-touch-icon.png`, and `public/favicon*.png`: derived PWA, Apple touch, and browser icon assets.
- `PRODUCT.md`: product scope and rules.
- `DESIGN.md`: design system and interaction direction.

## Brand Assets

The SettleUp app icon uses three rounded forms gathered into one balanced mark. The deep blue and warm cream treatment is intended to read as cooperative, calm, and trustworthy without relying on currency, banking, calculator, spreadsheet, or payment-product imagery.

Use `public/icon-updated.png` as the canonical master. Keep the important artwork inside its existing central safe area and regenerate every derived icon when the master changes. The web manifest consumes the 192px and 512px files; the document head consumes the Apple touch icon and 64px, 32px, and 16px favicons.

## Product Boundaries

SettleUp is intentionally small. It does not include accounts, admins, permission levels, multi-currency events, receipt OCR, attachments, chat, categories, exports, audit history, offline mutation support, or a public API contract.

That restraint is the point: the app should stay fast to open, clear enough to trust with money details, and easy to leave behind when the event is over.

SettleUp is a no-login expense splitter for one bounded shared-cost Event. People create an Event, share its Event Link, add people and Expenses, then use Balances to pay back what is owed.

Core docs:

- [PRODUCT.md](./PRODUCT.md): product scope, priorities, and rules.
- [CONTEXT.md](./CONTEXT.md): domain vocabulary.
- [DESIGN.md](./DESIGN.md): UI direction and interaction rules.
- [docs/DECISIONS.md](./docs/DECISIONS.md): durable architecture and product decisions.
- [docs/VERIFICATION.md](./docs/VERIFICATION.md): test, CI, and packaging verification workflow.
- [AGENTS.md](./AGENTS.md): repo-local agent instructions.

## Architecture

- `src/index.ts`: Hono app routes and response shapes.
- `src/server.ts`: Node HTTP/WebSocket server entrypoint.
- `src/node-sqlite.ts`: Node SQLite database adapter and migration runner.
- `src/event-command-input.ts`: form and JSON command parsing, including Included Participant to equal Share derivation for Expense commands.
- `src/event-command-runtime.ts`: saved Event mutation lifecycle, validation mapping, and success-only realtime notification.
- `src/event-record.ts`: Event Record mutation rules for Participants, Expenses, stored Shares, and Settlement Payments.
- `src/sqlite-event-record-persistence.ts`: SQLite row mapping and all-or-nothing Event Record persistence.
- `src/event-retention.ts`: short-lived Event retention policy.
- `src/store.ts`: `MemoryStore` for tests and `SqliteStore` for durable SQLite storage.
- `src/event-realtime-protocol.ts`: shared Event realtime message shape, route path, fallback interval, and reconnect policy.
- `src/event-realtime.ts`: in-process WebSocket room notifications scoped by Event token.
- `src/money.ts`: two-decimal Currency parsing and formatting.
- `src/ui/client-expense-draft.ts`: DOM-free Expense Draft equal split composition.
- `src/ui/client-event-page-policy.ts`: DOM-free Event page state policy.
- `src/ui/app-icons.ts` and `assets/icons/`: app icon, favicon, touch icon, and manifest assets served by the Node app.
- `src/ui/react-client.tsx`: React Event page client composed with shadcn/ui source components and served by the app as `/static/client.js`.
- `src/components/ui/`: checked-in shadcn/ui source components used by the React Event page.
- `src/ui/shadcn.css`: Tailwind v4 and shadcn preset `b6u0ULvrE` theme input for browser styles.
- `src/ui/generated-client.ts`: generated bundled browser asset. Regenerate with `npm run build:client`.
- `src/ui/generated-shadcn-styles.ts`: generated bundled stylesheet asset. Regenerate with `npm run build:client`.
- `test/e2e/`: Playwright coverage for Event UI, realtime fallback behavior, and accessibility.

## Current UI

- Create page copy: "Create a shared expense Event", "Use it for a trip, dinner, or shared cost.", and the private Event Link note before Create Event.
- Event header: Event Title, System/Light/Dark theme selector, Copy Event Link action, Currency note, realtime status, and current acting Participant selector once split selection is possible.
- Balances: net Balance rows, with a `Pay` action on rows where a Participant owes money.
- Add Expense: one-Participant onboarding, header acting-Participant selector once available, Description, Amount, Save expense, compact Participant rows, and a one-row Add Participant form. The payer is the current Participant default; selected Participants split the Expense equally.
- Record outside payment: folded shadcn panel beside Balances for Who paid, Who received, Amount, Record payment, and Cancel.
- Event History: newest-first Expenses and payments with Edit and Delete controls.

The UI uses shadcn preset `b6u0ULvrE` as the styling baseline. The Event page uses checked-in shadcn/ui source components for panels, fields, buttons, badges, alerts, Radix Select, Radix Checkbox, Radix Toggle Group, and loading states. Theme mode defaults to the system color scheme and can be pinned to Light or Dark from the Event header.

## Runtime Scope

The UI and saved Event HTTP commands expose Expense capture as Description, Amount, Payer, and Included Participants. The server derives equal Shares from those Included Participants before saving the Event Record. SQLite stores explicit Share rows so Balances, history, and future custom Share work have a durable model.

## Commands

```sh
npm install
npm run build
npm run build:client
npm run build:server
npm run dev
npm start
npm test
npm run test:coverage
npm run typecheck
npm run test:smoke
npm run validate:html
npm run verify
npm run deploy
```

Local runtime defaults:

```sh
SETTLEUP_DATABASE_PATH=.data/settleup.sqlite npm run dev
```

Migrations in `migrations/` are applied on Node server startup before the app accepts requests.

`npm run verify` is the full local confidence gate. It runs behavior tests, coverage, typecheck, Playwright smoke tests against the Node server, HTML validation, and the Node build/package check.

`npm run deploy` currently performs the same provider-neutral build as `npm run deploy:dry-run`; an external host can run `npm start` against the generated `dist/server.js` with `SETTLEUP_DATABASE_PATH` pointing at its SQLite database file.

## Runtime

- HTTP and JSON routes run through Hono on Node.
- Persistent data is stored in SQLite through `node:sqlite`.
- Realtime Event-change notifications use the Node WebSocket server and in-process token-scoped rooms.
- Expired Event cleanup runs on a Node interval and can also be called through `cleanupExpiredEvents`.

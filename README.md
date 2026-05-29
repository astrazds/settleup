SettleUp is a no-login expense splitter for one bounded shared-cost Event. People create an Event, share its Event Link, add people and Expenses, then use Balances to pay back what is owed.

Core docs:

- [PRODUCT.md](./PRODUCT.md): product scope, priorities, and rules.
- [CONTEXT.md](./CONTEXT.md): domain vocabulary.
- [DESIGN.md](./DESIGN.md): UI direction and interaction rules.
- [docs/DECISIONS.md](./docs/DECISIONS.md): durable architecture and product decisions.
- [docs/VERIFICATION.md](./docs/VERIFICATION.md): test, CI, and Cloudflare verification workflow.
- [AGENTS.md](./AGENTS.md): repo-local agent instructions.

## Architecture

- `src/index.ts`: Hono Worker routes and response shapes.
- `src/event-command-input.ts`: form and JSON command parsing, including Included Participant to equal Share derivation for Expense commands.
- `src/event-command-runtime.ts`: saved Event mutation lifecycle, validation mapping, and success-only realtime notification.
- `src/event-record.ts`: Event Record mutation rules for Participants, Expenses, stored Shares, and Settlement Payments.
- `src/d1-event-record-persistence.ts`: D1 row mapping and all-or-nothing Event Record persistence.
- `src/event-retention.ts`: short-lived Event retention policy.
- `src/store.ts`: `MemoryStore` for tests and `D1Store` for Cloudflare D1.
- `src/event-realtime-protocol.ts`: shared Event realtime message shape, route path, fallback interval, and reconnect policy.
- `src/event-realtime.ts`: Durable Object WebSocket notifications scoped by Event token.
- `src/money.ts`: two-decimal Currency parsing and formatting.
- `src/ui/client-expense-draft.ts`: DOM-free Expense Draft equal split composition.
- `src/ui/client-event-page-policy.ts`: DOM-free Event page state policy.
- `src/ui/react-client.tsx`: React Event page client served by the Worker as `/static/client.js`.
- `src/ui/generated-client.ts`: generated bundled browser asset. Regenerate with `npm run build:client`.
- `test/e2e/`: Playwright coverage for Event UI, realtime fallback behavior, and accessibility.

## Current UI

- Create page copy: "Create a shared expense Event", "Use it for a trip, dinner, or shared cost.", and the private Event Link note before Create Event.
- Event header: Event Title, copy-link icon, Currency note, and realtime status.
- Balances: net Balance rows, with a `Pay` action on rows where a Participant owes money.
- Add Expense: one-Participant onboarding, header acting-Participant selector once available, Description, Amount, Save expense, compact Participant rows, and a one-row Add Participant form. The payer is the current Participant default; selected Participants split the Expense equally.
- Record outside payment: folded form inside Balances for Who paid, Who received, Amount, Record payment, and Cancel.
- Event History: newest-first Expenses and payments with Edit and Delete controls.

## Runtime Scope

The UI and saved Event HTTP commands expose Expense capture as Description, Amount, Payer, and Included Participants. The Worker derives equal Shares from those Included Participants before saving the Event Record. D1 still stores explicit Share rows so Balances, history, and future custom Share work have a durable model.

## Commands

```sh
npm install
npm run build
npm run build:client
npm run dev
npm run db:migrations:apply:local
npm test
npm run test:coverage
npm run typecheck
npm run test:smoke
npm run validate:html
npm run verify
npm run deploy
```

Local D1 migrations:

```sh
npm run db:migrations:apply:local
```

`npm run verify` is the full local confidence gate. It runs behavior tests, coverage, typecheck, Playwright smoke tests, HTML validation, and a Wrangler deploy dry run, then cleans `dist-dry-run/`.

Forgejo Actions runs the same gate on pushes and pull requests. Pushes to `main` deploy production after verification passes, using the Cloudflare secrets documented in [docs/VERIFICATION.md](./docs/VERIFICATION.md).

Production is deployed by Forgejo Actions to:

- `https://settleup.pure-cake8631.workers.dev`

The first successful automated production deploy was Forgejo workflow run `#18` on 2026-05-28, deploying Worker version `bd697169-f462-4dd0-9e47-2cba164a7160`.

## Cloudflare

`wrangler.jsonc` is the repo-local configuration source. The Worker is `settleup`; current bindings are:

- `DB`: D1 database named `settleup`.
- `EVENT_REALTIME`: Durable Object namespace for Event-scoped WebSocket notifications.
- `VERSION_METADATA`: Worker version metadata used for deployment diagnostics.
- Cron Trigger: daily UTC Event cleanup for records older than five days.

Treat local config as intent, not proof of deployed state. Verify live Cloudflare resources before remote migrations, deployments, or production debugging.

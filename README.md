SettleUp is a no-login expense splitter for one bounded shared-cost Event. People create an Event, share its Event Link, record Expenses and Settlement Payments, then use Balances and Suggested Settlements to settle up.

Core docs:

- [PRODUCT.md](./PRODUCT.md): product scope, priorities, and rules.
- [CONTEXT.md](./CONTEXT.md): domain vocabulary.
- [DESIGN.md](./DESIGN.md): UI direction and interaction rules.
- [docs/DECISIONS.md](./docs/DECISIONS.md): durable architecture and product decisions.
- [docs/VERIFICATION.md](./docs/VERIFICATION.md): test, CI, and Cloudflare verification workflow.
- [AGENTS.md](./AGENTS.md): repo-local agent instructions.

## Architecture

- `src/index.ts`: Hono Worker routes and response shapes.
- `src/event-command-input.ts`: form and JSON command parsing.
- `src/event-record.ts`: Event Record mutation rules for Participants, Expenses, Shares, and Settlement Payments.
- `src/store.ts`: `MemoryStore` for tests and `D1Store` for Cloudflare D1.
- `src/event-realtime.ts`: Durable Object WebSocket notifications scoped by Event token.
- `src/money.ts`: two-decimal Currency parsing and formatting.
- `src/ui/client*.ts`: plain TypeScript browser client, bundled into `/static/client.js`.
- `test/e2e/`: Playwright coverage for Event UI, realtime fallback behavior, and accessibility.

## Commands

```sh
npm install
npm run dev
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
npx wrangler d1 migrations apply settleup --local
```

`npm run verify` is the full local confidence gate. It runs behavior tests, coverage, typecheck, Playwright smoke tests, HTML validation, and a Wrangler deploy dry run, then cleans `dist-dry-run/`.

## Cloudflare

`wrangler.jsonc` is the repo-local configuration source. The Worker is `settleup`; current bindings are:

- `DB`: D1 database named `settleup`.
- `EVENT_REALTIME`: Durable Object namespace for Event-scoped WebSocket notifications.

Treat local config as intent, not proof of deployed state. Verify live Cloudflare resources before remote migrations, deployments, or production debugging.

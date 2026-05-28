SettleUp is a no-login group expense splitter for one bounded shared-cost occasion. Current product scope is in [`PRODUCT.md`](./PRODUCT.md), product requirements are in [`docs/prd/`](./docs/prd/), domain language is in [`CONTEXT.md`](./CONTEXT.md), design direction is in [`DESIGN.md`](./DESIGN.md), and durable decisions are in [`docs/adr/`](./docs/adr/).

The frontend is served by the Hono Worker with plain TypeScript, JavaScript, and CSS. The current visual system is documented in [`docs/design/brandkit.md`](./docs/design/brandkit.md), with the standalone review artifact in [`docs/design/mockups.html`](./docs/design/mockups.html).

## Architecture

- `src/index.ts` owns the Hono routes and response shapes.
- `src/event-command-input.ts` parses raw form or JSON command input into typed Event commands.
- `src/event-record.ts` owns Event Record mutation rules for Participants, Expenses, Shares, and Settlement Payments.
- `src/store.ts` provides storage adapters: `MemoryStore` for route tests and `D1Store` for Cloudflare D1.
- `src/event-realtime.ts` owns Event-scoped realtime notifications through a Durable Object room per Event token.
- `src/money.ts` owns two-decimal Currency amount parsing/formatting rules used by server code and browser draft validation.
- `src/ui/client*.ts` keeps the browser Event screen as plain TypeScript modules that are concatenated into the single `/static/client.js` asset.

## Development

```txt
npm install
npm run dev
```

Local development uses the `DB` D1 binding declared in `wrangler.jsonc`. D1-backed multi-record Event mutations use D1 batch transactions so a failed write does not leave partial Event state. Apply local migrations before exercising database-backed routes:

```txt
npx wrangler d1 migrations apply settleup --local
```

## Cloudflare Resources

`wrangler.jsonc` is the source of truth for repo-local Cloudflare configuration. The Worker is named `settleup`, and the current bindings are `DB`, a D1 database named `settleup`, and `EVENT_REALTIME`, a Durable Object namespace for Event-scoped WebSocket notifications. The checked-in D1 `database_id` is for local/shared development; verify live account resources before deploying or applying remote migrations.

Use Wrangler for local development, migrations, type generation, dry runs, and deployment. Use the Cloudflare MCP tools for account inventory, current documentation, Worker build diagnostics, and observability before assuming a remote Worker, D1 database, KV namespace, or R2 bucket exists.

## Verification

```txt
npm test
npm run test:coverage
npm run typecheck
npm run test:smoke
npm run validate:html
npm run deploy:dry-run
```

`npm run verify` runs the full local confidence gate in that order and removes `dist-dry-run/` after the packaging check. The Forgejo Actions workflow in `.forgejo/workflows/verify.yml` runs the same gate on pushes to `main` and pull requests.

The coverage gate uses Vitest's V8 provider over runtime source in `src/**/*.ts`, excluding tests, generated binding declarations, dry-run output, and docs. The initial global thresholds are set to the current behavior-suite baseline: 84% statements, 62% branches, 87% functions, and 84% lines. Treat those thresholds as a regression signal for behavior coverage, not a demand to test implementation details; ratchet them upward when new behavior tests raise the baseline naturally.

The Playwright smoke suite exercises the main Event UI flow against local Wrangler dev and applies local D1 migrations through `pretest:smoke`. HTML validation checks the standalone design mockup. Remove `dist-dry-run/` after direct dry-run checks; it is generated output, and `npm run verify` plus the workflow remove it automatically.

## Deployment

```txt
npm run deploy
```

## Cloudflare Types

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

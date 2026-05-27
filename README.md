SettleUp is a no-login group expense splitter for one bounded shared-cost occasion. Current product scope is in [`PRODUCT.md`](./PRODUCT.md), domain language is in [`CONTEXT.md`](./CONTEXT.md), design direction is in [`DESIGN.md`](./DESIGN.md), and durable decisions are in [`docs/adr/`](./docs/adr/).

The frontend is served by the Hono Worker with plain TypeScript, JavaScript, and CSS. The current visual system is documented in [`docs/design/brandkit.md`](./docs/design/brandkit.md), with the standalone review artifact in [`docs/design/mockups.html`](./docs/design/mockups.html).

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

`wrangler.jsonc` is the source of truth for repo-local Cloudflare configuration. The Worker is named `settleup`, and the current binding is `DB`, a D1 database named `settleup`. The checked-in `database_id` is for local/shared development; verify the live account resource before deploying or applying remote migrations.

Use Wrangler for local development, migrations, type generation, dry runs, and deployment. Use the Cloudflare MCP tools for account inventory, current documentation, Worker build diagnostics, and observability before assuming a remote Worker, D1 database, KV namespace, or R2 bucket exists.

## Verification

```txt
npm test
npm run typecheck
npx --yes html-validate docs/design/mockups.html
npx wrangler deploy --dry-run --outdir dist-dry-run
```

Remove `dist-dry-run/` after dry-run checks; it is generated output.

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

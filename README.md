SettleUp is a no-login group expense splitter for one bounded shared-cost occasion. Current product scope is in [`PRODUCT.md`](./PRODUCT.md), domain language is in [`CONTEXT.md`](./CONTEXT.md), and durable decisions are in [`docs/adr/`](./docs/adr/).

## Development

```txt
npm install
npm run dev
```

Local development uses the `DB` D1 binding declared in `wrangler.jsonc`. Apply local migrations before exercising database-backed routes:

```txt
npx wrangler d1 migrations apply settleup --local
```

## Verification

```txt
npm test
npm run typecheck
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

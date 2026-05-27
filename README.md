SettleUp is a no-login group expense splitter for one bounded shared-cost occasion. Current product scope is in [`PRODUCT.md`](./PRODUCT.md), domain language is in [`CONTEXT.md`](./CONTEXT.md), and durable decisions are in [`docs/adr/`](./docs/adr/).

```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

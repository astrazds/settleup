# Cloudflare Resource Workflow

How agents should use Cloudflare resources and MCP tools in this repo.

## Local source of truth

- `wrangler.jsonc` defines the Worker name, compatibility date, bindings, and resource declarations.
- The current Worker name is `settleup`.
- The current bindings are `DB`, a D1 database named `settleup`, and `EVENT_REALTIME`, a Durable Object namespace for Event-scoped WebSocket notifications.
- `worker-configuration.d.ts` is generated from Wrangler configuration with `npm run cf-typegen`.

Treat local configuration as intent, not proof of deployed state. Verify remote resources before deployment, remote migrations, debugging production behavior, or changing resource declarations.

## MCP use

- Use Cloudflare docs MCP before citing current Workers, D1, binding, compatibility, or Wrangler behavior.
- Use Cloudflare bindings MCP to inspect account resources such as Workers, D1 databases, KV namespaces, and R2 buckets.
- Use Cloudflare builds MCP for Worker build and deploy failures.
- Use Cloudflare observability MCP for Worker logs, request failures, and runtime metrics.

If no Cloudflare account is active in the MCP session, list accounts and set the active account before resource inventory calls. Keep read-only discovery separate from mutating operations.

## Wrangler use

Use Wrangler for repo-local development commands:

```txt
npm run dev
npm run cf-typegen
npx wrangler d1 migrations apply settleup --local
npx wrangler deploy --dry-run --outdir dist-dry-run
npm run deploy
```

Before creating, deleting, or mutating remote Cloudflare resources, confirm the intended resource name, binding name, and environment match `wrangler.jsonc` and the task.

## D1 tests

D1 adapter behavior is tested with Miniflare and the checked-in SQL migrations instead of a hand-written SQL fake. When changing D1 schema or queries, update `migrations/`, keep `D1Store` aligned with the migrated schema, and run `npm test` so the migration-backed tests exercise the real D1 binding shape.

## Realtime

Event realtime uses the `EVENT_REALTIME` Durable Object binding. Treat D1 as the saved Event source of truth; the Durable Object only coordinates WebSocket clients and broadcasts Event-change notifications after successful mutations. Use WebSocket hibernation APIs for new realtime code and keep polling as a browser fallback, not the primary collaboration path.

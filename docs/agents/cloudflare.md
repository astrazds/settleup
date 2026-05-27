# Cloudflare Resource Workflow

How agents should use Cloudflare resources and MCP tools in this repo.

## Local source of truth

- `wrangler.jsonc` defines the Worker name, compatibility date, bindings, and resource declarations.
- The current Worker name is `settleup`.
- The current binding is `DB`, a D1 database named `settleup`.
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

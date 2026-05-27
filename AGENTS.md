# Repository Guidelines

## Project Structure & Module Organization

This is a Cloudflare Workers project using Hono, Cloudflare D1, and TypeScript. The Worker entrypoint is `src/index.ts`; Wrangler configuration is in `wrangler.jsonc` with worker name `settleup`. The current Cloudflare binding is `DB`, a D1 database named `settleup`; D1 migrations live in `migrations/`. TypeScript settings live in `tsconfig.json`, npm scripts live in `package.json`, and generated Cloudflare binding types live in `worker-configuration.d.ts`. Keep runtime source under `src/`. Place tests beside covered code as `*.test.ts` or in top-level `test/` for cross-module behavior.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start `wrangler dev` for local Worker development.
- `npm run deploy`: deploy the Worker with Wrangler using minification.
- `npm run cf-typegen`: generate or refresh Cloudflare binding types from `wrangler.jsonc`.
- `npm test`: run Vitest behavior tests.
- `npm run typecheck`: run strict TypeScript checking without emitting files.
- `npx wrangler d1 migrations apply settleup --local`: apply D1 migrations to the local development database.
- `npx wrangler deploy --dry-run --outdir dist-dry-run`: verify Worker packaging without deploying; remove `dist-dry-run/` afterwards.

## Coding Style & Naming Conventions

Use modern TypeScript modules and keep `strict` compatibility with `tsconfig.json`. Prefer small route handlers and extracted helpers once behavior grows beyond a simple endpoint. Use `camelCase` for variables and functions, `PascalCase` for types and classes, and uppercase names only for constants. Match `src/index.ts`: single quotes, no semicolons, and concise Hono handlers.

When Cloudflare bindings are introduced, run `npm run cf-typegen` and instantiate Hono with the generated binding type, for example:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Testing Guidelines

Vitest is configured for behavior tests. Prefer public interfaces: pure domain functions for deep modules and Hono `app.request()` route tests for Worker behavior. Name tests after the route or module under test, such as `index.test.ts` or `expenses.test.ts`. At minimum, run `npm test`, `npm run typecheck`, and a Wrangler dry run before deployment.

## Commit & Pull Request Guidelines

Use short, imperative commit messages such as `Add expense route` or `Configure worker bindings`. Pull requests should describe the change, list verification commands run, link related issues, and include request/response examples for API behavior changes.

## Security & Configuration Tips

Do not commit secrets or real Cloudflare resource IDs unless they are intended for shared development. Keep bindings, compatibility flags, and resource declarations in `wrangler.jsonc`, then regenerate types after configuration changes. Treat `wrangler.jsonc` as the local configuration source, but verify remote Cloudflare state with MCP or Wrangler before assuming a Worker, D1 database, KV namespace, or R2 bucket exists in the account.

## Agent skills

### Required skills

When working on TypeScript in this repository, use the `typescript-expert` skill and preserve the current strict, ESM, npm-based setup. For Hono-specific questions, check the official LLM documentation first: `https://hono.dev/llms.txt`, `https://hono.dev/llms-full.txt`, and `https://hono.dev/llms-small.txt`.

For Cloudflare Workers, Wrangler, D1, bindings, deployments, or account resources, use the `cloudflare` skill. Add `workers-best-practices` when authoring or reviewing Worker runtime behavior, and add `wrangler` before running Wrangler commands or changing `wrangler.jsonc`. Check Cloudflare documentation through the Cloudflare docs MCP before relying on specific limits, binding syntax, compatibility flags, or Wrangler command behavior.

For any frontend, creative, or design work, use the `impeccable` skill before shaping or editing UI. Apply it to product UI, layout, visual hierarchy, copy, accessibility, responsive behavior, theming, and interaction polish. Use `PRODUCT.md` and `DESIGN.md` as the product and design sources.

### Cloudflare MCP use

Use Cloudflare MCP tools for read-only discovery before editing Cloudflare configuration or diagnosing deployed behavior. See `docs/agents/cloudflare.md` for the repo workflow.

- Use the Cloudflare docs MCP for current Workers, D1, bindings, and Wrangler documentation.
- Use the Cloudflare bindings MCP to list or inspect account resources such as Workers, D1 databases, KV namespaces, and R2 buckets before assuming remote state from local files.
- Use the Cloudflare builds MCP when checking Worker build or deploy failures.
- Use the Cloudflare observability MCP when investigating Worker logs, request failures, or runtime metrics.

Prefer Wrangler for repo-local development commands and migrations. Prefer MCP for account inventory, observability, and documentation lookup. Before creating, deleting, or mutating remote Cloudflare resources, state the intended resource and confirm it matches `wrangler.jsonc` and the current task.

### Issue tracker

Issues are tracked in Forgejo at `https://repos.astrazds.net` using the `fj` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain-doc layout with root `CONTEXT.md` and ADRs under `docs/adr/`. See `docs/agents/domain.md`.

# Repository Guidelines

## Project Structure & Module Organization

This is a Cloudflare Workers project using Hono, Cloudflare D1, Durable Objects, and TypeScript. The Worker entrypoint is `src/index.ts`; Wrangler configuration is in `wrangler.jsonc` with worker name `settleup`. The current bindings are `DB`, a D1 database named `settleup`, and `EVENT_REALTIME`, a Durable Object namespace for Event-scoped WebSocket notifications. D1 migrations live in `migrations/`; Durable Object migrations live in `wrangler.jsonc`. TypeScript settings live in `tsconfig.json`, npm scripts live in `package.json`, and generated Cloudflare binding types live in `worker-configuration.d.ts`. Keep runtime source under `src/`. Place Vitest behavior tests beside covered code as `*.test.ts`; place cross-module helpers and Playwright suites under top-level `test/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start `wrangler dev` for local Worker development.
- `npm run deploy`: deploy the Worker with Wrangler using minification.
- `npm run cf-typegen`: generate or refresh Cloudflare binding types from `wrangler.jsonc`.
- `npm test`: run Vitest behavior tests.
- `npm run test:coverage`: run Vitest with V8 coverage thresholds over runtime source.
- `npm run test:smoke`: run the full Playwright browser gate against local Wrangler dev and local D1.
- `npm run test:smoke:critical`: run the critical Event UI browser project.
- `npm run test:smoke:extended`: run the extended realtime browser project.
- `npm run typecheck`: run strict TypeScript checking without emitting files.
- `npm run validate:html`: validate the standalone design mockup.
- `npm run verify`: run the full local confidence gate and clean `dist-dry-run/`.
- `npx wrangler d1 migrations apply settleup --local`: apply D1 migrations to the local development database.
- `npm run deploy:dry-run`: verify Worker packaging without deploying; remove `dist-dry-run/` afterwards when running it directly.

## Coding Style & Naming Conventions

Use modern TypeScript modules and keep `strict` compatibility with `tsconfig.json`. Prefer small route handlers and extracted helpers once behavior grows beyond a simple endpoint. Use `camelCase` for variables and functions, `PascalCase` for types and classes, and uppercase names only for constants. Match `src/index.ts`: single quotes, no semicolons, and concise Hono handlers.

When Cloudflare bindings are introduced, run `npm run cf-typegen` and instantiate Hono with the generated binding type, for example:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Testing Guidelines

Vitest is configured for behavior tests. Prefer public interfaces: pure domain functions for deep modules, Hono `app.request()` route tests for Worker behavior, Miniflare-backed D1 tests for storage behavior, and notifier seams for realtime behavior. Name tests after the route or module under test, such as `index.test.ts`, `store.test.ts`, or `event-realtime.test.ts`. For Event-page UI changes, also run `npm run test:smoke`; it protects against controls that exist in markup but fail the browser user flow. Use `npm run test:smoke:critical` while iterating on the core Event path and `npm run test:smoke:extended` for realtime browser behavior. At minimum, run `npm run verify` before merging broad runtime, UI, Worker configuration, or deployment packaging changes.

## Commit & Pull Request Guidelines

Use short, imperative commit messages such as `Add expense route` or `Configure worker bindings`. Pull requests should describe the change, list verification commands run, link related issues, and include request/response examples for API behavior changes.

## Security & Configuration Tips

Do not commit secrets or real Cloudflare resource IDs unless they are intended for shared development. Keep bindings, compatibility flags, and resource declarations in `wrangler.jsonc`, then regenerate types after configuration changes. Treat `wrangler.jsonc` as the local configuration source, but verify remote Cloudflare state with MCP or Wrangler before assuming a Worker, D1 database, KV namespace, or R2 bucket exists in the account.

## Agent skills

### Required skills

When working on TypeScript in this repository, use the `typescript-expert` skill and preserve the current strict, ESM, npm-based setup. For Hono-specific questions, check the official LLM documentation first: `https://hono.dev/llms.txt`, `https://hono.dev/llms-full.txt`, and `https://hono.dev/llms-small.txt`.

For Cloudflare Workers, Wrangler, D1, bindings, deployments, or account resources, use the `cloudflare` skill. Add `workers-best-practices` when authoring or reviewing Worker runtime behavior, and add `wrangler` before running Wrangler commands or changing `wrangler.jsonc`. Check Cloudflare documentation through the Cloudflare docs MCP before relying on specific limits, binding syntax, compatibility flags, or Wrangler command behavior.

For any frontend, creative, or design work, use the `impeccable` skill before shaping or editing UI. Apply it to product UI, layout, visual hierarchy, copy, accessibility, responsive behavior, theming, and interaction polish. Use `PRODUCT.md` and `DESIGN.md` as the product and design sources.

For Event-page UI changes, follow the smoke verification workflow in `docs/agents/event-ui-smoke.md`. Keep smoke coverage focused on the core Event path and prefer user-facing locators; add stable test identifiers only when dense panels make accessible selection ambiguous.

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

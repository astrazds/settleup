# Repository Guidelines

## Project Structure & Module Organization

This is a Cloudflare Workers project using Hono and TypeScript. The Worker entrypoint is `src/index.ts`; Wrangler configuration is in `wrangler.jsonc` with worker name `settleup`. TypeScript settings live in `tsconfig.json`, and npm scripts live in `package.json`. Keep runtime source under `src/`. If tests are added, place them beside covered code as `*.test.ts` or in top-level `test/` for cross-module behavior.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start `wrangler dev` for local Worker development.
- `npm run deploy`: deploy the Worker with Wrangler using minification.
- `npm run cf-typegen`: generate or refresh Cloudflare binding types from `wrangler.jsonc`.

There is no dedicated `build`, `lint`, or `test` script. Wire new tooling into `package.json` so contributors can run it consistently.

## Coding Style & Naming Conventions

Use modern TypeScript modules and keep `strict` compatibility with `tsconfig.json`. Prefer small route handlers and extracted helpers once behavior grows beyond a simple endpoint. Use `camelCase` for variables and functions, `PascalCase` for types and classes, and uppercase names only for constants. Match `src/index.ts`: single quotes, no semicolons, and concise Hono handlers.

When Cloudflare bindings are introduced, run `npm run cf-typegen` and instantiate Hono with the generated binding type, for example:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Testing Guidelines

No test framework is configured yet. For new behavior, add a test script and Worker-friendly runner before relying on manual checks. Name tests after the route or module under test, such as `index.test.ts` or `expenses.test.ts`. At minimum, verify changed routes locally with `npm run dev` before deployment.

## Commit & Pull Request Guidelines

No local Git history is available in this checkout to infer conventions. Use short, imperative commit messages such as `Add expense route` or `Configure worker bindings`. Pull requests should describe the change, list verification commands run, link related issues, and include request/response examples for API behavior changes.

## Security & Configuration Tips

Do not commit secrets or real Cloudflare resource IDs unless they are intended for shared development. Keep bindings, compatibility flags, and resource declarations in `wrangler.jsonc`, then regenerate types after configuration changes.

## Agent skills

### Required skills

When working on TypeScript in this repository, use the `typescript-expert` skill and preserve the current strict, ESM, npm-based setup. For Hono-specific questions, check the official LLM documentation first: `https://hono.dev/llms.txt`, `https://hono.dev/llms-full.txt`, and `https://hono.dev/llms-small.txt`.

For any frontend, creative, or design work, use the `impeccable` skill before shaping or editing UI. Apply it to product UI, layout, visual hierarchy, copy, accessibility, responsive behavior, theming, and interaction polish. Use `IDEA.md` as the product seed until dedicated `PRODUCT.md` and `DESIGN.md` files exist.

### Issue tracker

Issues are tracked in Forgejo at `https://repos.astrazds.net` using the `fj` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain-doc layout with root `CONTEXT.md` and ADRs under `docs/adr/`. See `docs/agents/domain.md`.

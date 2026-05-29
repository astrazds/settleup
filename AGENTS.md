# Repository Guidelines

## Project Shape

SettleUp is a Cloudflare Workers project using Hono, Cloudflare D1, Durable Objects, and TypeScript. Runtime source lives in `src/`; Vitest behavior tests live beside covered code as `*.test.ts`; cross-module helpers and Playwright suites live in `test/`.

Key files:

- `src/index.ts`: Worker entrypoint and Hono routes.
- `src/event-command-runtime.ts`: saved Event command execution, Included Participant equal Share derivation, and success-only realtime notification.
- `src/d1-event-record-persistence.ts`: D1 Event Record row mapping and persistence.
- `src/event-realtime-protocol.ts`: shared realtime protocol constants and browser helpers.
- `src/ui/client-expense-draft.ts`, `src/ui/client-event-page-policy.ts`: DOM-free browser behavior policy/composition modules for equal split draft behavior and Event page state.
- `src/ui/react-client.tsx`: React Event page client bundled into `/static/client.js`.
- `src/ui/generated-client.ts`: generated checked-in browser bundle; regenerate with `npm run build:client`.
- `wrangler.jsonc`: Worker name `settleup`, D1 binding `DB`, Durable Object binding `EVENT_REALTIME`, compatibility flags, and Durable Object migrations.
- `migrations/`: D1 migrations.
- `worker-configuration.d.ts`: generated Cloudflare binding types.
- `PRODUCT.md`, `CONTEXT.md`, `DESIGN.md`, `docs/DECISIONS.md`, `docs/VERIFICATION.md`: complete repo documentation set.

## Commands

- `npm install`: install dependencies.
- `npm run build:client`: bundle the React Event page client.
- `npm run dev`: start local Wrangler dev.
- `npm test`: run Vitest behavior tests.
- `npm run test:coverage`: run Vitest coverage thresholds.
- `npm run typecheck`: run strict TypeScript checking.
- `npm run test:smoke`: run the full Playwright browser gate.
- `npm run test:smoke:critical`: run critical Event UI browser tests.
- `npm run test:smoke:extended`: run realtime browser tests.
- `npm run validate:html`: validate `docs/design/mockups.html`.
- `npm run verify`: run the full local confidence gate.
- `npm run cf-typegen`: regenerate Cloudflare binding types.
- `npm run deploy:dry-run`: verify Worker packaging without deployment.
- `npm run deploy`: deploy with Wrangler.
- `npm run db:migrations:apply:local`: apply local D1 migrations through the `DB` binding.

## Style

Use strict modern TypeScript with ESM. Match existing source style: single quotes, no semicolons, concise Hono handlers, `camelCase` variables/functions, `PascalCase` types/classes, and uppercase only for constants. Prefer small route handlers and extracted helpers once behavior grows beyond a simple endpoint.

When Cloudflare bindings change, run `npm run cf-typegen` and instantiate Hono with generated bindings:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Testing

Prefer public behavior seams: domain functions, Hono `app.request()` route tests, Miniflare-backed D1 tests, realtime notifier seams, and Playwright-visible Event behavior. Do not add brittle tests around private implementation details just to raise coverage.

For broad runtime, UI, Worker configuration, or deployment changes, run `npm run verify`. For focused UI iteration, use `npm run test:smoke:critical`; for realtime browser behavior, use `npm run test:smoke:extended`.

## Agent Skills

- TypeScript work: use `typescript-expert`.
- Hono-specific questions: check official Hono LLM docs first: `https://hono.dev/llms.txt`, `https://hono.dev/llms-full.txt`, and `https://hono.dev/llms-small.txt`.
- Cloudflare Workers, D1, Durable Objects, Wrangler, bindings, deployment, or account resources: use `cloudflare`; add `workers-best-practices` when authoring or reviewing Worker runtime behavior; add `wrangler` before running Wrangler commands or changing `wrangler.jsonc`.
- Frontend, UI, design, accessibility, responsive behavior, copy, or interaction polish: use `impeccable` and read `PRODUCT.md` plus `DESIGN.md`.
- TDD or behavior changes: use `tdd` and keep tests behavior-first.

Use Cloudflare MCP tools for read-only discovery before editing Cloudflare configuration or diagnosing deployed behavior. Prefer Wrangler for repo-local development, migrations, type generation, dry runs, and deployment. Before mutating remote Cloudflare resources, confirm the intended resource name, binding name, and environment match `wrangler.jsonc` and the task.

## Issue Tracker

Issues are tracked in Forgejo at `https://repos.astrazds.net` using `fj`.

Use one category label: `bug` or `enhancement`.

Use one state label: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, or `wontfix`.

Search before creating issues. Make issue titles imperative and specific, and include problem, expected behavior, likely files, and verification steps.

## Docs Policy

Keep docs minimal and durable:

- `README.md`: project map and common commands.
- `PRODUCT.md`: product scope and rules.
- `CONTEXT.md`: domain vocabulary.
- `DESIGN.md`: UI direction.
- `docs/DECISIONS.md`: durable decisions only.
- `docs/VERIFICATION.md`: test, CI, and Cloudflare verification workflow.
- `AGENTS.md`: agent routing and repo-local operating rules.

Do not reintroduce PRD, ADR, or agent-doc folders unless the repo genuinely needs more structure again.

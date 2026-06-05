# Repository Guidelines

## Project Shape

SettleUp is a Node/Hono project using SQLite, WebSockets, React, and TypeScript. Runtime source lives in `src/`; Vitest behavior tests live beside covered code as `*.test.ts`; cross-module helpers and Playwright suites live in `test/`.

Key files:

- `src/index.ts`: Hono app routes.
- `src/server.ts`: Node HTTP/WebSocket server entrypoint.
- `src/node-sqlite.ts`: Node SQLite adapter and migration runner.
- `src/event-command-runtime.ts`: saved Event command execution, Included Participant equal Share derivation, and success-only realtime notification.
- `src/sqlite-event-record-persistence.ts`: SQLite Event Record row mapping and persistence.
- `src/event-realtime-protocol.ts`: shared realtime protocol constants and browser helpers.
- `src/ui/client-expense-draft.ts`, `src/ui/client-event-page-policy.ts`: DOM-free browser behavior policy/composition modules for equal split draft behavior and Event page state.
- `src/ui/react-client.tsx`: React Event page client bundled into `/static/client.js`.
- `src/ui/generated-client.ts`: generated checked-in browser bundle; regenerate with `npm run build:client`.
- `components.json`: shadcn/ui CLI, registry, alias, and Tailwind configuration.
- `src/ui/shadcn.css`: Tailwind v4 and shadcn theme input compiled by `npm run build:client`.
- `src/ui/generated-shadcn-styles.ts`: generated checked-in shadcn/Tailwind stylesheet module; regenerate with `npm run build:client`.
- `migrations/`: SQLite migrations.
- `PRODUCT.md`, `CONTEXT.md`, `DESIGN.md`, `docs/DECISIONS.md`, `docs/VERIFICATION.md`: complete repo documentation set.

## Commands

- `npm install`: install dependencies.
- `npm run build:client`: bundle the React Event page client.
- `npm run build:server`: bundle the Node server into `dist/server.js`.
- `npm run dev`: build and start the local Node server.
- `npm start`: start the built Node server.
- `npm test`: run Vitest behavior tests.
- `npm run test:coverage`: run Vitest coverage thresholds.
- `npm run typecheck`: run strict TypeScript checking.
- `npm run test:smoke`: run the full Playwright browser gate.
- `npm run test:smoke:critical`: run critical Event UI browser tests.
- `npm run test:smoke:extended`: run realtime browser tests.
- `npm run validate:html`: validate `docs/design/mockups.html`.
- `npm run verify`: run the full local confidence gate.
- `npm run deploy:dry-run`: verify provider-neutral Node packaging.
- `npm run deploy`: run the provider-neutral build for deployment packaging.
- `npx shadcn@latest info --json`: inspect this repo's shadcn/ui configuration.
- `npx shadcn@latest docs <component>`: fetch current shadcn component docs and examples.
- `npx shadcn@latest add <component> --dry-run`: preview generated component files before applying.

## Style

Use strict modern TypeScript with ESM. Match existing source style: single quotes, no semicolons, concise Hono handlers, `camelCase` variables/functions, `PascalCase` types/classes, and uppercase only for constants. Prefer small route handlers and extracted helpers once behavior grows beyond a simple endpoint.

## Testing

Prefer public behavior seams: domain functions, Hono `app.request()` route tests, migration-backed SQLite tests, realtime notifier seams, and Playwright-visible Event behavior. Do not add brittle tests around private implementation details just to raise coverage.

For broad runtime, UI, storage, realtime, or deployment packaging changes, run `npm run verify`. For focused UI iteration, use `npm run test:smoke:critical`; for realtime browser behavior, use `npm run test:smoke:extended`.

## Agent Skills

### Skill routing

- TypeScript work: use `typescript-expert`.
- Hono-specific questions: check official Hono LLM docs first: `https://hono.dev/llms.txt`, `https://hono.dev/llms-full.txt`, and `https://hono.dev/llms-small.txt`.
- Frontend, UI, design, accessibility, responsive behavior, copy, or interaction polish: use the repo shadcn workflow and read `PRODUCT.md` plus `DESIGN.md`.
- shadcn/ui work: use the project shadcn skill, run `npx shadcn@latest info --json`, fetch component docs with `npx shadcn@latest docs <component>`, and prefer `npx shadcn@latest add <component> --dry-run` before writing generated components.
- TDD or behavior changes: use `tdd` and keep tests behavior-first.

### Issue tracker

Issues are tracked in Forgejo at `https://repos.astrazds.net` using `fj`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use category labels `bug` or `enhancement`, plus one state label from the default triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with domain vocabulary in `CONTEXT.md` and durable decisions in `docs/DECISIONS.md`. See `docs/agents/domain.md`.

Runtime work should keep the app independent of provider-specific services and CLIs. Use `node:sqlite` for the durable local database unless a future product decision deliberately introduces a different provider-neutral storage adapter.

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
- `docs/VERIFICATION.md`: test, CI, and packaging verification workflow.
- `AGENTS.md`: agent routing and repo-local operating rules.

Do not reintroduce PRD, ADR, or agent-doc folders unless the repo genuinely needs more structure again.

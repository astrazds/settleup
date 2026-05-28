# Verification

Use this gate before merging changes that affect runtime behavior, Event UI behavior, Worker configuration, or deployment packaging.

```sh
npm run verify
```

Equivalent expanded sequence:

```sh
npm test
npm run test:coverage
npm run typecheck
npm run test:smoke
npm run validate:html
npm run deploy:dry-run
rm -rf dist-dry-run
```

## Layers

- `npm test`: Vitest behavior tests through domain functions, Hono requests, store adapters, realtime seams, and generated client syntax.
- `npm run test:coverage`: Vitest with V8 thresholds over runtime source.
- `npm run typecheck`: strict TypeScript check without output.
- `npm run test:smoke:critical`: Playwright critical Event UI project.
- `npm run test:smoke:extended`: Playwright realtime browser project.
- `npm run test:smoke`: both Playwright projects against local Wrangler dev and local D1.
- `npm run validate:html`: validates `docs/design/mockups.html`.
- `npm run deploy:dry-run`: Wrangler packaging check without deployment.

## Current Coverage

- Domain and routes: Event creation/access, saved command execution, Participant mutations, Expense mutations, Settlement Payment mutations, malformed input, Currency handling, Balances, and Suggested Settlements.
- Storage: migration-backed D1 setup, D1 Event Record persistence mapping, Event Record round trips through `D1Store`, and rollback coverage for multi-record Event mutations.
- Realtime: shared protocol parsing, Durable Object room broadcast, Event token isolation, connection routing, success-only mutation notifications, draft preservation, stale-draft warnings, and fallback polling.
- Browser: Event creation, Expense Draft Share composition, Event page policy, capture, correction, settlement, Event Link copy feedback, mobile layout, and focused accessibility coverage.

## Cloudflare Workflow

- `wrangler.jsonc` defines the Worker name, compatibility date, D1 binding, Durable Object binding, and Durable Object migration.
- D1 migrations live in `migrations/`.
- Run local D1 migrations with `npx wrangler d1 migrations apply settleup --local`.
- Run `npm run cf-typegen` after changing bindings or Wrangler configuration.
- Use Cloudflare MCP tools for account inventory, current docs, build diagnostics, and observability before assuming remote state.

Before creating, deleting, or mutating remote Cloudflare resources, confirm the intended resource name, binding name, and environment match `wrangler.jsonc` and the task.

## CI And Output

Forgejo Actions runs the full gate on pushes to `main` and pull requests. Use `fj actions tasks` from the repository root to confirm workflow state after pushing.

Generated output stays out of commits:

- `dist-dry-run/`
- `coverage/`
- `playwright-report/`
- `test-results/`
- `.wrangler/`

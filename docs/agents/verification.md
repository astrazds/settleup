# Verification Gate

Use this gate before merging changes that affect runtime behavior, Event UI behavior, Worker configuration, or deployment packaging.

```sh
npm test
npm run test:coverage
npm run typecheck
npm run test:smoke
npm run validate:html
npm run deploy:dry-run
rm -rf dist-dry-run
```

`npm run verify` runs the same command sequence locally and cleans `dist-dry-run/` with a shell trap after the packaging check. The Forgejo Actions workflow runs the sequence on pushes to `main` and pull requests, and also cleans `dist-dry-run/` with a shell trap.

## Verification Layers

- `npm test`: fast behavior tests through public TypeScript interfaces, Hono requests, store adapters, and generated client syntax.
- `npm run test:coverage`: the same behavior suite with V8 coverage thresholds over runtime source.
- `npm run typecheck`: strict ESM TypeScript checking without emitted files.
- `npm run test:smoke:critical`: Playwright's critical Event UI project against local Wrangler dev and local D1.
- `npm run test:smoke:extended`: Playwright's extended realtime browser project against local Wrangler dev and local D1.
- `npm run test:smoke`: the full browser gate, running both critical and extended Playwright projects.
- `npm run validate:html`: standalone validation for `docs/design/mockups.html`.
- `npm run deploy:dry-run`: Wrangler packaging verification without deploying.

## Coverage Policy

Coverage is a regression guard for behavior tests. It should confirm that existing domain, route, store, and generated-client behavior remains exercised; it should not drive tests against private implementation details.

The initial global thresholds are:

- Statements: 84%
- Branches: 62%
- Functions: 87%
- Lines: 84%

Raise thresholds when meaningful behavior coverage raises the baseline. Lower them only with a clear explanation in the change, such as moving code behind a boundary that is verified by smoke or deployment checks instead.

## Workflow Assumptions

Forgejo Actions workflows live under `.forgejo/workflows/`. This repo uses the `docker-node-runner` runner label, installs dependencies with `npm ci`, installs the Chromium Playwright browser and its Linux system dependencies before the smoke suite, and relies on `pretest:smoke` to apply local D1 migrations.

When Playwright fails in Forgejo Actions, the workflow uploads `playwright-report/` and `test-results/` as the `playwright-artifacts` artifact. Use those artifacts for traces, screenshots, and the HTML report before rerunning remotely.

## Generated Output Hygiene

Generated outputs should stay out of commits:

- `dist-dry-run/`: Wrangler packaging output; `npm run verify` and the workflow remove it automatically, but direct dry runs should remove it with `rm -rf dist-dry-run`.
- `playwright-report/`: Playwright HTML report.
- `test-results/`: Playwright traces, screenshots, videos, and per-test attachments.
- `coverage/`: Vitest coverage report.
- `.wrangler/`: local Wrangler and Miniflare state.

These paths are ignored by Git. If one appears in `git status`, remove it unless the task explicitly asks for generated diagnostic artifacts.

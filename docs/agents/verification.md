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

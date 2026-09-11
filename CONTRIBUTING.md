# Contributing to SettleUp

Keep changes focused and describe their observable effect. Start with the
[architecture map](docs/architecture.md) to find the module that owns a rule.

## Before opening a pull request

1. Open an issue for behavior changes or substantial new work so the scope can
   be agreed first.
2. Preserve SettleUp's product boundary. Changes must not add accounts, login,
   authenticated roles, banking, money transfer, telemetry, analytics, or
   persistent event history.
3. Keep splits equal and money as integer minor units. Do not introduce
   percentages, weights, itemization, or client-authored balances.
4. The event token remains the access credential. Do not add plaintext token
   storage or token logging. Preserve three-day access and cleanup eligibility
   after five days.
5. Do not commit generated output, SQLite databases, browser reports, local
   agent files, or editor state.
6. Complete the setup and verification steps below before handing off code.

## Set up the checkout

Run these commands from the repository root:

```sh
mise install
mise run install
mise run browsers:install
```

`mise.toml` pins Node.js and npm and defines the project tasks. Playwright also
needs platform libraries. On a supported Linux distribution, replace the last
command with `mise run browsers:install -- --with-deps` to install them.

Start the app with `mise run dev`, then open `http://127.0.0.1:5173`.
Development uses the API on port `8787`. The browser suite starts its own API
with an in-memory database and serves a production frontend build on port
`4173`.

## Verify the change

Run the full local gate:

```sh
mise run check
```

This runs lint, typecheck, unit tests, production builds, and browser tests in
order. Keep the gates sequential because several rebuild the same contracts
output. If a development watcher loses that output during verification,
restart `mise run dev` after the check finishes.

Frontend lint and typecheck each generate React Router types before using
them. A fresh checkout does not need a prior build to lint. Do not edit or
commit `.react-router`, `dist`, or `build` output.

For a focused check, use the task that covers the changed behavior:

```sh
mise run test:contracts
mise run test:server -- src/server/mutations.test.ts
mise run test:web -- app/lib/form-data.test.ts
mise run test:e2e -- draft-conflicts.spec.ts --project=mobile-chromium
```

API tests cover request validation, version preconditions, transactional
rollback, snapshot recomputation, and event isolation. Browser tests cover
workflows, draft conflicts, accessibility, and responsive states. Run the full
gate after focused checks when changing application code.

## Review visual changes

Local mobile and desktop Chromium runs compare screenshots in
`apps/web/tests/e2e/states.spec.ts-snapshots`. Firefox and WebKit run semantic
checks without pixel comparisons. CI skips pixel comparisons for all projects.
Keep `CI` unset when checking local visual baselines.

Event captures use `apps/web/tests/e2e/screenshot.css` to stabilize time labels
and the skip-link capture state. Desktop event captures allow a 1% pixel
difference. Mobile event captures require exact matches except for the expense
dialog, which allows 1,531 differing pixels for capture variation. These are
scoped tolerances, not permission to overlook a visible regression.

To record an intentional visual change, update the relevant project and inspect
the generated images before keeping the diff:

```sh
mise run test:e2e -- states.spec.ts --project=mobile-chromium --update-snapshots
mise run test:e2e -- states.spec.ts --project=desktop-chromium --update-snapshots
```

Review screenshots against [DESIGN.md](apps/web/DESIGN.md), then rerun the
affected tests without `--update-snapshots`. Do not widen a tolerance to accept
an unexplained failure.

## Pull requests

Use small, ordered commits. Explain the problem, resulting behavior, and
verification evidence in the PR description. Distinguish local pixel checks
from CI semantic checks, and name any check you could not complete.

Update the documentation that owns the changed behavior. Keep user-facing
rules in [PRODUCT.md](apps/web/PRODUCT.md), visual rules in
[DESIGN.md](apps/web/DESIGN.md), and module ownership in the architecture map.
Add or update a behavior-focused test for domain changes. By contributing, you
agree that your contribution is licensed under the repository's MIT license.

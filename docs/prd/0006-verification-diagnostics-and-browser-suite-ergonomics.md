# PRD: Verification Diagnostics and Browser Suite Ergonomics

## Problem Statement

The project had a growing verification stack, but agents needed clearer commands, faster browser-suite iteration, and better diagnostics when Playwright failed in Forgejo Actions.

## Solution

Document the verification layers, split browser tests into critical and extended Playwright projects, and upload Playwright reports and test results as Forgejo artifacts on failure. Keep `npm run verify` as the complete local confidence gate.

## User Stories

1. As a developer changing the Event UI, I want a critical browser command, so I can iterate on the core Event path quickly.
2. As a developer changing realtime behavior, I want an extended browser command, so I can target slower collaboration coverage.
3. As an agent debugging CI, I want Playwright artifacts from failed Forgejo runs, so I can inspect traces, screenshots, and reports before rerunning.
4. As a maintainer reviewing changes, I want documented verification layers, so test selection is deliberate and repeatable.

## Implementation Decisions

- Keep `npm run test:smoke` as the full browser gate.
- Add `npm run test:smoke:critical` for the Event UI flow project.
- Add `npm run test:smoke:extended` for the realtime browser project.
- Configure Playwright to write `test-results/` and `playwright-report/`.
- Upload browser artifacts from Forgejo Actions only when a workflow step fails.

## Testing Decisions

- Treat browser projects as ergonomic slices, not separate quality gates.
- Keep local D1 migrations as pre-scripts for every smoke command.
- Keep `npm run verify` aligned with the Forgejo workflow.
- Keep generated verification output ignored and out of commits.

## Out of Scope

- Replacing Forgejo Actions, adding deployment environments, adding visual snapshot testing, or publishing test reports on success.

## Implementation Status

Shipped for Forgejo issues `#71` and `#79` through `#81`.

- Split Event browser tests into critical and extended suites.
- Added Playwright failure artifact upload in Forgejo Actions.
- Documented verification layers and generated output hygiene.

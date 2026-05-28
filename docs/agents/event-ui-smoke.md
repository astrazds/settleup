# Event UI Smoke Verification

Use this workflow when changing the Event page, Event-page panels, browser form behavior, responsive layout, or user-facing copy that affects the core shared-cost path.

## Command

Run the smoke suite with:

```sh
npm run test:smoke
```

The intended smoke command runs Playwright against Wrangler's local Worker, not a mocked DOM or static HTML fixture. Keep it small enough for local pre-merge checks.

For narrower browser feedback, use:

```sh
npm run test:smoke:critical
npm run test:smoke:extended
```

`test:smoke:critical` runs the Event UI flow project. `test:smoke:extended` runs the realtime browser project. Both commands apply local D1 migrations before Playwright starts. Keep `npm run test:smoke` as the full browser gate; it runs both projects.

## Critical Smoke Path

The critical Event UI smoke path should prove that a browser user can:

1. Create an Event from the first screen.
2. Add Event Participants from the Event page.
3. Add an Expense with a payer, amount, and Included Participants.
4. Confirm Balances and Suggested Settlements update from the saved Event state.
5. Record a Suggested Settlement as a Settlement Payment.
6. Confirm Event History shows the saved Expense and Settlement Payment with correction actions still reachable.
7. Copy the Event Link and see feedback without disrupting the current form or page layout.
8. Complete the same create, capture, and settlement path on a mobile viewport without overlapping controls.

This protects against regressions where controls are present in markup but the Event flow is broken, hidden, confusing, or unusable.

## Extended Browser Path

The extended browser path should cover behavior that is important but slower or more focused than the critical Event path, including:

1. Realtime updates between browser contexts on the same Event Link.
2. Draft preservation and neutral review warnings after live refreshes.
3. Event-token scoping so unrelated Events do not receive each other's updates.
4. Deterministic fallback polling after a realtime reconnect starts.

## Locator Guidance

Smoke tests should prefer user-facing locators: labels, roles, visible text, and stable product copy. Add stable test identifiers only where repeated dense panels make accessible selection ambiguous. Test identifiers should support the user-facing assertion; they should not replace it.

## Verification Stack

Use each command for a distinct layer:

- `npm test`: domain logic, Hono route behavior, store behavior, and generated client syntax.
- `npm run test:coverage`: behavior-suite coverage over runtime source, with thresholds used as a regression signal rather than a target for implementation-detail tests.
- `npm run typecheck`: strict TypeScript compatibility.
- `npm run test:smoke:critical`: integrated Event page behavior through the browser and local Worker, including visible controls, form submission, client-side updates, toasts, responsive layout, and Event History visibility.
- `npm run test:smoke:extended`: realtime and browser-state behavior through the browser and local Worker.
- `npm run test:smoke`: the full browser gate, running both critical and extended Playwright projects.
- `npm run validate:html`: standalone design HTML validation for `docs/design/mockups.html`.
- `npm run deploy:dry-run`: Worker packaging and Cloudflare runtime compatibility before deployment; remove `dist-dry-run/` afterwards.

For Event-page UI changes, run `npm test`, `npm run test:coverage`, `npm run typecheck`, `npm run test:smoke`, `npm run validate:html`, and `npm run deploy:dry-run` before merging or deploying. `npm run verify` runs the full local sequence. Use `npm run test:smoke:critical` while iterating on the core Event flow, then run the full smoke suite before handoff. For non-UI changes, run the smoke suite when the change can affect rendered Event state, Event Snapshot shape, client-side update behavior, or the route responses used by the Event page.

## Browser Artifacts

Playwright writes failure diagnostics to `test-results/` and the HTML report to `playwright-report/`. Both directories are generated output and are ignored by Git. Forgejo Actions uploads those directories as the `playwright-artifacts` artifact when the browser suite fails.

Coverage thresholds should move upward only when user-facing or domain behavior tests raise the baseline. Do not add brittle tests solely to satisfy a number; prefer assertions through domain functions, Hono requests, or browser-visible Event behavior.

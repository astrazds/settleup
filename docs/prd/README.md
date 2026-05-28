# Product Requirements

PRDs capture resolved product direction before it is split into implementation issues. Use them with `PRODUCT.md`, `DESIGN.md`, `CONTEXT.md`, and `docs/adr/`.

- `0001-included-participants-expense-capture.md`: shipped Included Participants as the primary Expense capture control.
- `0002-settlement-focus-and-recording.md`: shipped settlement focus, inline Suggested Settlement confirmation, edited recording amounts, and copyable settlement summaries.
- `0003-realtime-collaboration-polish.md`: shipped neutral stale-draft warnings on realtime and polling refreshes without presence or edit attribution.
- `0004-d1-backed-persistence-and-migration-confidence.md`: shipped migration-backed D1 persistence and rollback confidence.
- `0005-realtime-protocol-and-fallback-confidence.md`: shipped Durable Object realtime protocol, token isolation, success-only notification, and fallback polling confidence.
- `0006-verification-diagnostics-and-browser-suite-ergonomics.md`: shipped browser-suite split, verification docs, and Forgejo Playwright failure artifacts.
- `0007-event-ui-accessibility-and-test-ergonomics.md`: shipped reusable Event UI test builders and focused accessibility coverage.

Published parent issues:

- Forgejo issue `#26`: Included Participants Expense Capture
- Forgejo issue `#27`: Realtime Collaboration Polish
- Forgejo issue `#28`: Settlement Focus and Recording
- Forgejo issue `#69`: Add D1-backed persistence and migration confidence
- Forgejo issue `#70`: Harden realtime protocol and fallback confidence
- Forgejo issue `#71`: Improve verification diagnostics and browser suite ergonomics
- Forgejo issue `#72`: Add Event UI accessibility and reusable test ergonomics

Implementation issues `#29` through `#38` were completed against the product PRDs in one pass, with generated browser-client behavior coverage in `src/ui/client.test.ts` plus the existing route, domain, and store tests.

Implementation issues `#73` through `#84` were completed against the test-confidence PRDs in one pass. The shipped suite now includes migration-backed D1 tests, all-or-nothing D1 mutation tests, Durable Object realtime tests, browser fallback polling tests, critical and extended Playwright projects, CI failure artifacts, and Event UI accessibility coverage.

Event UI flow smoke coverage was tracked in Forgejo issue `#46` and is documented in `docs/agents/event-ui-smoke.md`.

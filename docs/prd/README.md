# Product Requirements

PRDs capture resolved product direction before it is split into implementation issues. Use them with `PRODUCT.md`, `DESIGN.md`, `CONTEXT.md`, and `docs/adr/`.

- `0001-included-participants-expense-capture.md`: shipped Included Participants as the primary Expense capture control.
- `0002-settlement-focus-and-recording.md`: shipped settlement focus, inline Suggested Settlement confirmation, edited recording amounts, and copyable settlement summaries.
- `0003-realtime-collaboration-polish.md`: shipped neutral stale-draft warnings on realtime and polling refreshes without presence or edit attribution.

Published parent issues:

- Forgejo issue `#26`: Included Participants Expense Capture
- Forgejo issue `#27`: Realtime Collaboration Polish
- Forgejo issue `#28`: Settlement Focus and Recording

Implementation issues `#29` through `#38` were completed against these PRDs in one pass, with generated browser-client behavior coverage in `src/ui/client.test.ts` plus the existing route, domain, and store tests.

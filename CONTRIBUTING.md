# Contributing to SettleUp

Thanks for taking an interest in SettleUp. Small, focused changes are easiest
to review.

## Before opening a pull request

1. Open an issue for behavior changes or substantial new work so the scope can
   be agreed first.
2. Preserve SettleUp's product boundary. Changes must not add accounts, login,
   authenticated roles, banking, money transfer, telemetry, analytics, or
   persistent event history.
3. Keep splits equal and money as integer minor units. Do not introduce
   percentages, weights, itemization, or client-authored balances.
4. The event token remains the access credential. Do not persist or log it,
   and do not weaken the three-day access / five-day cleanup lifecycle.
5. Do not commit generated output, SQLite databases, browser reports, local
   agent files, or editor state.
6. Run the complete local check:

   ```sh
   npm run typecheck
   npm test
   npm run build:all
   ```

   Frontend lint is `npm run lint`. Real-browser coverage is
   `npm run test:e2e` and needs Playwright browsers
   (`npx playwright install --with-deps`).

## Pull requests

Explain the problem, the chosen approach, and how you verified it. Add or
update a behavior-focused test for domain changes. By contributing, you agree
that your contribution is licensed under the repository's MIT license.

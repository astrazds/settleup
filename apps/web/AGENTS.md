# AGENTS.md

## Product boundary

Build a fast, calm, mobile-first shared-expense interface. There are no
accounts, authenticated identities, bank transfers, event dashboards, charts,
or persistent event caches. Anyone with the private event link can edit.

The server snapshot is authoritative. Never calculate or optimistically change
ledger balances in the browser. Money crosses the API only as integer minor
units. Treat an event token as a credential: do not persist or log it.

## Frontend architecture

- Use React Router Framework Mode in SPA mode; the output is static.
- Keep API calls relative to `/api`. Do not import backend source files.
- Use `@settleup/contracts` for wire schemas and types.
- Use route loaders/actions/fetchers for server state and local React state for
  ephemeral form interaction. Do not add another server-state or global-state
  library.
- Read form event values synchronously before scheduling functional state
  updates; do not retain React event objects inside updater callbacks.
- Use CSS custom properties and CSS Modules. Prefer semantic HTML; Radix is
  limited to Dialog and AlertDialog behavior.
- Keep styles responsive down to 320px, keyboard operable, and WCAG 2.2 AA.
- Do not add standalone design-history documents. Tokens and tested components
  are the visual source of truth.

## Done

For frontend changes, run from the repository root:

```sh
npm run lint
npm run typecheck
npm test
npm run build:all
npm run test:e2e
```

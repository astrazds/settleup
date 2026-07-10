# AGENTS.md

## Project

SettleUp is a mobile-first, no-login shared expense app for short-lived private-by-link events. Keep the product focused on fast expense capture, exact and understandable splits, and confident settlement without introducing account, banking-dashboard, or spreadsheet-heavy patterns.

## Working Agreements

- Preserve the root create flow: event name, creator name, currency, truthful lifecycle preview, then `Start my event`.
- Keep newly created events empty apart from the creator participant.
- Treat private-link expiry, exact money amounts, shared mutations, and undo behavior as user-visible trust contracts.
- Reuse `src/components/design-system.jsx` and `src/components/event-ui.jsx` before adding one-off UI patterns.
- Preserve active expense drafts across refreshes and realtime updates.
- Keep mobile layouts usable at 320px and verify primary UI work at 390×844.
- Do not add decorative shadows, gradients, glass effects, fake urgency, vague progress, or sales-oriented financial language.

## Verification

Run the repository gates before handing off code changes:

```sh
npm run typecheck
npm test
npm run build:all
```

For browser-visible UI changes, run both `npm run dev:api` and `npm run dev`, then verify the create, expense, and settlement flows at a mobile viewport. Include an uneven-cent split such as `100.00 / 3` when split presentation changes.

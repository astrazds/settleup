# SettleUp verification map

This directory is the maintained source for verifying SettleUp's user-facing behavior. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `node skills/verify-settleup/bin/verify-settleup.mjs launch`.
- The UI is `http://127.0.0.1:5173`. The API is `http://127.0.0.1:8787` with a fresh `SETTLEUP_DB` under `/tmp/settleup-verify/`.
- Run `node skills/verify-settleup/bin/verify-settleup.mjs doctor` and require exit 0 before driving.
- Never drive an instance that this verification run did not start. Ports 8787 and 5173 cannot host a second instance.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal.
- Browser actions go through Playwright against the launched UI.
- The bundled drive is `node skills/verify-settleup/bin/verify-settleup.mjs drive record-expense`.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the event title visible.
- Mutation proof includes the saved snapshot's share or balance rows.
- Record the feature id and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with Playwright` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Create a private event](./create-event.md) covers the landing form, currency, and arrival on the empty expense page.
- [Record an expense](./record-expense.md) covers the exact-split preview and the saved shares.
- [Settle](./settle.md) covers balances, the suggested payment, and recording that payment.
- [People](./people.md) covers adding and renaming a participant.

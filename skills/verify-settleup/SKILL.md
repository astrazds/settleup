---
name: verify-settleup
description: "Drive the SettleUp web app through a real browser and prove a user journey. Use when changing event creation, expenses, settlement, or people, or when a pull request needs evidence from the running app."
---

# Verify SettleUp

SettleUp's primary surface is the web UI. The API on port 8787 is the ledger behind it. This skill launches a private instance, checks that it is the instance just started, and drives the UI with Playwright.

This copy lives at `skills/verify-settleup/` so a pull request can review it. `.cursor/skills/` and `.agents/skills/` are gitignored. Do not stop ignoring them, and do not copy this skill into those folders as the reviewed source.

A fresh clone needs `mise install`, `mise run install`, and `mise run browsers:install` before launch. Those installs are not repeated here.

## Launch

From the repository root:

```sh
node skills/verify-settleup/bin/verify-settleup.mjs launch
```

The helper builds `@settleup/contracts`, then starts two process groups:

- `npm run dev:api:watch` with `PORT=8787` and `SETTLEUP_DB` set to a new file under `/tmp/settleup-verify/`.
- `npm run dev:web:watch`, which serves the UI at `http://127.0.0.1:5173` and proxies `/api` to port 8787.

Ready means both of these are true:

- The API log contains `SettleUp server listening on http://127.0.0.1:8787`, and `GET /api/events/doctor-probe` returns 404.
- `GET http://127.0.0.1:5173/` returns the heading `Everyone pays. Every cent lands.`

The default database `data/settleup.sqlite` is not used. Launch refuses when port 8787 or 5173 is already taken, or when a verification instance is already recorded. Two instances cannot share those ports: the web proxy target is fixed at 8787.

`mise run dev` is the documented developer command. This helper starts the same two npm scripts as separate process groups so cleanup can signal the groups it spawned. It does not attach to an already running dev server.

## Doctor

```sh
node skills/verify-settleup/bin/verify-settleup.mjs doctor
```

Doctor is read-only. It exits 0 only when the recorded API and web process groups are alive, those processes own ports 8787 and 5173, the landing heading is served, and the API probe still returns 404. It prints the git commit that was current at launch. Run it before every drive and whenever the UI looks stale.

## Drive

```sh
node skills/verify-settleup/bin/verify-settleup.mjs drive record-expense
```

This runs the mapped **Record an expense** journey in headless Chromium against `http://127.0.0.1:5173`. It uses accessible names from the feature file. It does not call an internal setter or a test-only endpoint. The other feature files are the recipes for later runs; follow their Playwright steps against the launched URL. Do not mark those features verified because record-expense passed.

Playwright must be able to start Chromium. The helper sets `PLAYWRIGHT_BROWSERS_PATH` to `.scratch/playwright`, the same path `mise.toml` uses. If that directory has no Chromium build, install it with `mise run browsers:install` and run the drive again.

## Evidence

The record-expense drive writes proof to `skills/verify-settleup/evidence/record-expense/`:

- `preview.png` and `preview.aria.txt` show the exact-split preview before save.
- `saved.png` and `saved.aria.txt` show the saved expense after **See exact split** is opened.
- `snapshot.json` is the event snapshot returned by `GET /api/events/:token` after save, with the token redacted.
- `run.txt` records the feature id, entry point, amount, and share check.

Proof has to show the action and the resulting state. The preview screenshot is the action. The saved screenshot and the snapshot shares are the resulting state. The snapshot is the side effect: the stored share rows, not only the pixels. A landing-page illustration is not evidence for a saved expense.

## Cleanup

```sh
node skills/verify-settleup/bin/verify-settleup.mjs cleanup
```

Cleanup sends `SIGTERM`, then `SIGKILL` if needed, to the process groups recorded at launch. It deletes `/tmp/settleup-verify/`. It does not delete `skills/verify-settleup/evidence/`. After cleanup, the evidence files must still be present. Run cleanup after a failed launch or drive too, so a broken attempt does not keep the ports.

## Helpers

`skills/verify-settleup/bin/verify-settleup.mjs` is the only helper. It is executable. Subcommands are `launch`, `doctor`, `drive record-expense`, and `cleanup`.

Keep the map honest with `/maintain-verification-skill` when the UI changes. Do not guess a cadence.

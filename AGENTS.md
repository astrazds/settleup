# Working on SettleUp

Use [the architecture map](docs/architecture.md#find-the-owner) to find the
module that owns a change. The API manages the ledger, the web app renders
its snapshots, and the contracts package owns their shared schemas and equal
shares.

- Use mise for tools and repository tasks. Follow the [contributor guide](CONTRIBUTING.md)
  for setup, focused checks, the full gate, and pull requests.
- Read the [product rules](apps/web/PRODUCT.md) for behavior and the
  [design guide](apps/web/DESIGN.md) for visual changes.
- Use the [browser verification skill](skills/verify-settleup/SKILL.md)
  for the expense journey and other feature recipes.
- When working in Poteto mode, use the installed pstack skill. Keep personal
  model settings in your user configuration.

For contributors using Atmina, recall repository decisions before editing and
record findings in the configured CodeWiki KB. Pass the KB explicitly. Use
`repositories/settleup/wiki/` for durable knowledge and
`repositories/settleup/chronicle/` for working notes. Verify cited source
paths against the checkout before relying on a note.

## Rules these checks enforce

| Rule | What enforces it |
| --- | --- |
| `apps/web/DESIGN.md` does not copy `px`, `rem`, `em`, or `clamp` values. Put a measurement in the CSS module named in that file's Implementation owners table. | `npm run check:design-doc` |
| A pull request body does not contain the footer marker `CURSOR_AGENT_PR_BODY`. | `node scripts/check-pr-body.mjs` on pull requests, with `PR_BODY` set |
| A commit in the pull request does not contain `Co-authored-by: Cursor Agent <cursoragent@cursor.com>`. Commit as Andrejs Strazds. | `node scripts/check-pr-body.mjs` on pull requests, with `BASE_SHA` set to the base commit |
| `package-lock.json` does not resolve `minimatch` in `GHSA-g3hv-75wg-m249` (`>=7.0.0 <11.0.1`). Resolve `minimatch` 11.0.1 or later. | `npm run check:minimatch` |

`mise run check:code` runs the design doc check, the commit-signature tests, and the minimatch check. The pull request workflow runs `node scripts/check-pr-body.mjs` against the body and the commits.

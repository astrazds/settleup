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

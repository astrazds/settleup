# Issue Tracker

Issues for this repo are tracked in Forgejo at `https://repos.astrazds.net`.

Use the `fj` CLI for issue operations. Prefer repo-aware commands from the project root when available; otherwise pass the repository explicitly according to the current `fj` configuration.

## Expected workflow

- Search before creating: check for an existing issue that already covers the request.
- Create one issue per independently shippable change.
- Keep issue titles imperative and specific, for example `Add Event creation route`.
- Include enough context for an AFK agent to pick up the work: problem, expected behavior, files or modules likely involved, and verification steps.
- Apply the triage labels documented in `docs/agents/triage-labels.md`.

## Command examples

```sh
fj issue list
fj issue search "Event creation"
fj issue create
fj issue view <issue-number>
```

If `fj` syntax differs for this Forgejo instance, run `fj issue --help` and follow the configured local workflow.

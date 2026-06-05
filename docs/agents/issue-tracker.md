# Issue Tracker: Forgejo

Issues and PRDs for this repo live in Forgejo at `https://repos.astrazds.net`. Use the `fj` CLI for issue operations.

Infer the repo from `git remote -v`; this checkout's origin is `https://repos.astrazds.net/astrazds/settleup.git`.

## Conventions

- Search before creating issues.
- Use one category label: `bug` or `enhancement`.
- Use one state label from `docs/agents/triage-labels.md`.
- Make issue titles imperative and specific.
- Include the problem, expected behavior, likely files, and verification steps.

## Common Operations

- List or search issues: `fj issue search -R forgejo --state open`
- Read an issue: use the matching `fj issue` view command for the issue number.
- Create an issue: use the matching `fj issue` create command with title, body, and labels.
- Comment on an issue: use the matching `fj issue` comment command.
- Close an issue: comment with the resolution and verification first, then close it.

If a skill says "publish to the issue tracker", create a Forgejo issue through `fj`.

If a skill says "fetch the relevant ticket", read the Forgejo issue through `fj` and include comments when available.

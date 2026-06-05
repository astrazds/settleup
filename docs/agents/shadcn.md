# shadcn/ui Tooling

This repo is configured for shadcn/ui on the Worker-served React client without converting the app to Vite.

## Project Configuration

- `components.json` is the shadcn CLI source of truth.
- The repo uses Tailwind CSS v4 with CSS variables.
- shadcn components are generated under `src/components/ui`.
- Shared shadcn utilities live under `src/lib`.
- Hooks live under `src/hooks`.
- `npm run build:client` compiles both the React client bundle and `src/ui/generated-shadcn-styles.ts`.

## CLI Workflow

- Inspect configuration: `npx shadcn@latest info --json`
- Fetch component docs: `npx shadcn@latest docs <component>`
- Search registries: `npx shadcn@latest search @shadcn -q "<query>"`
- Preview additions: `npx shadcn@latest add <component> --dry-run`
- Apply additions: `npx shadcn@latest add <component>`
- Check registry updates: `npx shadcn@latest add <component> --diff`

Prefer docs/search/dry-run before applying new components so generated code is reviewed against this repo's React, accessibility, and visual conventions.

## AI Tooling

The project shadcn skill is installed through `skills-lock.json`. Restore project skills with:

```sh
npx -y skills experimental_install
```

The shadcn MCP server is configured for Codex only, in `~/.codex/config.toml`.

Codex needs a restart before the new `shadcn` MCP server is exposed in the current session.

## Registry Notes

Do not add an explicit `@shadcn` registry entry to `components.json`; the current CLI treats it as built in and rejects overrides. Add only extra third-party or private registries.

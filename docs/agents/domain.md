# Domain Docs

This is a single-context repo. Engineering skills should use the root documentation set before proposing or changing behavior.

## Before Exploring, Read These

- `CONTEXT.md` for domain vocabulary.
- `PRODUCT.md` for product scope and rules.
- `DESIGN.md` for UI direction when frontend behavior is involved.
- `docs/DECISIONS.md` for durable architectural decisions.
- `docs/VERIFICATION.md` for the verification workflow.

If a file is not relevant to the task, do not force it into the workflow. For example, backend-only work usually does not need `DESIGN.md`.

## Vocabulary

When output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term as defined in `CONTEXT.md`. Avoid drifting to synonyms the glossary explicitly avoids.

If the concept is missing from `CONTEXT.md`, either reconsider whether the project uses that concept or note the gap for a future documentation update.

## Decisions

Treat `docs/DECISIONS.md` as the durable decision log for this repo. The historical ADR directory is not the primary decision source unless the repo deliberately reintroduces ADRs later.

If a proposed change contradicts an existing durable decision, surface the conflict explicitly before implementation.

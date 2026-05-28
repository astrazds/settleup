# PRD: Event UI Accessibility and Test Ergonomics

## Problem Statement

The Event UI smoke suite covered core workflows, but dense panels and repeated controls made tests harder to maintain and left accessibility-sensitive correction controls under-specified.

## Solution

Introduce reusable Event UI test builders and focused accessibility assertions for the core Event workflow and correction controls. Keep coverage browser-visible and aligned with product copy, using stable helpers to reduce duplication without hiding user-facing behavior.

## User Stories

1. As a keyboard user, I want Event workflows and correction controls to expose clear labels and focus targets.
2. As a mobile user, I want correction actions to remain reachable without relying on hidden or ambiguous controls.
3. As a developer adding browser coverage, I want reusable Event setup helpers, so new tests stay focused on behavior instead of setup noise.
4. As a maintainer reviewing UI changes, I want tests that assert accessible section and control structure, so dense panels do not regress silently.

## Implementation Decisions

- Add a reusable Event UI builder for Event creation, Participants, Expenses, Shares, Settlement Payments, and common panels.
- Add accessibility assertion helpers for headings, labels, fieldsets, buttons, and focus behavior.
- Register accessibility coverage through the existing critical Event flow project.
- Prefer user-facing locators and stable product copy; add test identifiers only when dense repeated panels require disambiguation.

## Testing Decisions

- Cover core workflow accessibility in the critical browser project.
- Cover correction controls for Included Participants, payer-not-included warning, exact Shares, assign remaining, edit/delete actions, and Suggested Settlement confirmation.
- Keep assertions close to visible behavior and accessible names rather than implementation-specific DOM shape.

## Out of Scope

- Full WCAG audit, screen-reader transcript testing, visual regression testing, and a design-system rewrite.

## Implementation Status

Shipped for Forgejo issues `#72` and `#82` through `#84`.

- Added reusable Event UI test builders.
- Added accessibility checks for core Event workflows.
- Covered accessibility for Event correction controls.

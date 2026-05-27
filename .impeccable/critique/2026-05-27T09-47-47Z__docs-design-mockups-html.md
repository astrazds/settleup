---
target: docs/design/mockups.html critique
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-05-27T09-47-47Z
slug: docs-design-mockups-html
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Copied, validation, disabled, and settlement states exist, but loading/saving/polling states are absent. |
| 2 | Match System / Real World | 4 | Uses plain group-expense language and avoids finance-app jargon. |
| 3 | User Control and Freedom | 2 | Static mockups show save/switch/copy, but no edit/delete/cancel/undo escape paths. |
| 4 | Consistency and Standards | 3 | Strong token/component consistency; state coverage still uneven. |
| 5 | Error Prevention | 2 | Add Expense has custom shares but no visible sum check, defaults, or over/under-split prevention. |
| 6 | Recognition Rather Than Recall | 3 | Main sections are visible; mobile and share-entry affordances need more context. |
| 7 | Flexibility and Efficiency of Use | 2 | Power-user and repeat-entry paths are not represented. |
| 8 | Aesthetic and Minimalist Design | 4 | Calm, task-focused, product-register UI with purposeful color and density. |
| 9 | Error Recovery | 3 | Validation error pattern is plain and local, but only one error case is shown. |
| 10 | Help and Documentation | 3 | Inline privacy and empty-state copy is useful; complex share entry needs more inline assistance. |
| **Total** | | **29/40** | **Good foundation; interaction depth is the gap.** |

#### Anti-Patterns Verdict

This does not read as AI-generated. The direction avoids the usual traps: no hero-metric template, no purple-blue gradients, no glass cards, no decorative blobs, no generic money-app iconography, and no marketing page masquerading as product UI.

The deterministic detector returned clean output for `docs/design/mockups.html`: no findings. No ignored findings were applied.

Visual render evidence was captured as desktop and mobile screenshots, but live browser overlay injection was unavailable because Playwright/browser automation was not installed in this session.

#### Overall Impression

The mockup artifact is now a credible product review board. The biggest opportunity is not more visual styling; it is making the mockups prove the hard parts of the product: custom share entry, save/loading feedback, edit/delete paths, mobile identity, and recovery states.

#### What's Working

- The brand system is coherent: warm neutrals, ledger green, clay, and amber have specific semantic roles.
- The receipt-grid language fits the domain. Rows, dividers, aligned amounts, and subtotal bands make balances scannable.
- The Create Event state stays form-first and avoids marketing composition.

#### Priority Issues

**[P1] Mobile mockup underrepresents the real MVP workflow**

Why it matters: the MVP explicitly supports custom per-participant share amounts, current Participant identity, and Event Link sharing, but the mobile screen only shows Description, Amount, and Save Expense. That makes the hardest phone workflow look easier than it is.

Fix: expand Mobile Event Page to include compact current Participant, payer, share rows or an equal/custom split control, and a reachable Event Link action.

Suggested command: `$impeccable adapt docs/design/mockups.html`

**[P1] Interaction state coverage is not yet honest enough**

Why it matters: the required strip claims controls and money states, but the artifact does not show hover, active, loading/saving, polling refresh, delete confirmation, edit mode, copied timeout behavior, or disabled reason text. Developers implementing from this could miss essential state handling.

Fix: extend Interaction States with loading Save Expense, focused field, active/hover button, edit/delete row actions, share-sum error, and copied-feedback lifecycle.

Suggested command: `$impeccable harden docs/design/mockups.html`

**[P2] Custom Share entry needs better error-prevention scaffolding**

Why it matters: four separate share inputs create a sum-to-total task. The mockup has no visible total, remaining amount, equal split affordance, or imbalance state near the share list.

Fix: add a compact share-summary row: Expense total, Assigned, Remaining, and an equal-split reset. Show the error state beside that summary rather than only in the generic interaction strip.

Suggested command: `$impeccable clarify docs/design/mockups.html`

**[P2] Current Participant styling can imply permission**

Why it matters: the product rules say current Participant controls defaults only and must not imply permissions. The green identity strip is useful, but it risks reading as an active account/owner badge.

Fix: keep the strip, but pair it with copy like `Defaults as Sarah` or `Expense defaults`, and avoid over-emphasizing the green treatment in places where identity is not the main action.

Suggested command: `$impeccable clarify docs/design/mockups.html`

**[P3] Static artifact structure is harder to maintain than it needs to be**

Why it matters: many long one-line mockup rows make future critique and implementation extraction harder.

Fix: reformat repeated ledger rows and state boxes into multiline HTML blocks before the next large mockup pass.

Suggested command: `$impeccable polish docs/design/mockups.html`

#### Persona Red Flags

**Jordan (First-Timer)**: The Create Event flow is clear, but custom share entry in the populated event assumes Jordan understands that every Share must sum to the Expense amount. The generic interaction-strip error is too far from the real share form to teach the rule.

**Sam (Accessibility-Dependent User)**: Focus rings are visible and labels exist, but several state meanings lean on color tints. The mockup does include text like `owes` and `is owed`, which helps; the missing loading and copied-live feedback states remain a risk.

**Casey (Distracted Mobile User)**: The mobile mockup has tap-safe density, but the primary Save Expense action is still below text inputs, and the mobile flow omits payer/share complexity. Casey would discover extra work only after implementation.

#### Minor Observations

- `0 Expenses` is useful, but `0 Expenses` plus `Everyone is settled` may be redundant in the Empty Event state.
- The amber privacy note is semantically right, but it competes slightly with Suggested Settlement amber. Keep both, but the privacy note can be quieter.
- Settlement Payments only shows one recorded state. Add an empty state and a mistaken-payment recovery state later.

#### Questions to Consider

- What should the phone workflow hide until needed, and what must always be visible?
- Should custom Share entry feel like a receipt subtotal calculator instead of a plain list of inputs?
- What would convince a developer that every async action has a visible state?

---
name: SettleUp design system
description: A calm shared-expense workspace for quick capture and confident settlement.
colors:
  paper: "#f6f8fb"
  surface: "#ffffff"
  surface-2: "#f9fafc"
  ink: "#111827"
  muted: "#5f6878"
  faint: "#8a94a6"
  line: "#dfe4ec"
  line-strong: "#cbd5e1"
  blue: "#075be8"
  blue-2: "#0e69ff"
  blue-soft: "#eaf2ff"
  blue-line: "#c7dcff"
  green: "#06763a"
  green-soft: "#dff7e8"
  green-line: "#b6e4c4"
  green-line-strong: "#8ed6a8"
  coral: "#c51f35"
  coral-soft: "#ffe8eb"
  amber: "#8a4b00"
  amber-soft: "#fff2d6"
  event-mark: "#0a8f45"
  avatar-green-bg: "#dff7e8"
  avatar-green-fg: "#057b34"
  avatar-blue-bg: "#e8f0ff"
  avatar-blue-line: "#9cc2ff"
  avatar-blue-fg: "#0c60d4"
  avatar-violet-bg: "#f0e8ff"
  avatar-violet-line: "#cbb3ff"
  avatar-violet-fg: "#7147c7"
  avatar-orange-bg: "#fff0df"
  avatar-orange-line: "#ffc087"
  avatar-orange-fg: "#9d4206"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 820
    lineHeight: 1.12
    letterSpacing: "0"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 760
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "0"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0"
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "0"
rounded:
  checkbox: "4px"
  tag: "5px"
  control: "7px"
  panel: "8px"
  workspace: "10px"
  avatar: "50%"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.25rem"
  space-6: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 0.75rem"
    height: "2.9rem"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    rounded: "{rounded.control}"
    padding: "0 0.75rem"
    height: "2.9rem"
    typography: "{typography.label}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "0"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.75rem 0.85rem"
    height: "2.85rem"
    typography: "{typography.body}"
  participant-segment:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 0.55rem"
    height: "2.9rem"
    typography: "{typography.label}"
  participant-segment-selected:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 0.55rem"
    height: "2.9rem"
    typography: "{typography.label}"
  status-success:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
    rounded: "{rounded.panel}"
    padding: "0.75rem 1rem"
  status-warning:
    backgroundColor: "{colors.amber-soft}"
    textColor: "{colors.amber}"
    rounded: "{rounded.control}"
    padding: "0.75rem"
  status-danger:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1rem"
---

## Overview

**Creative North Star: "The Shared Table"**

SettleUp is a focused product interface for one small group expense event. It should feel fast, calm, and trustworthy: quick enough to use mid-conversation, quiet enough to trust with money details, and clear enough for anyone with the private link to understand what changed.

The visual system is restrained and task-led. A pale app background holds one white workspace with firm borders, compact panels, visible status states, and familiar controls. Capture comes first, balances explain what changed, and payment tools appear only when they are useful.

It explicitly rejects banking-heavy, playful-fintech, spreadsheet-dense, and gamified patterns. The product is not an account system or a financial dashboard; it is a short-lived shared table where people add expenses, see who pays what, and record that a payment happened.

**Key Characteristics:**
- Restrained light UI with one strong blue action color.
- Flat surfaces, firm borders, compact radii, and no decorative shadows.
- Human payment language: `gets back`, `pays`, `Record $33.33`, `Mark $33.33 paid`.
- Root create flow with no seeded event data.
- Mobile-first capture flow with secondary payer/split details folded until needed.
- Private-by-link clarity around shared changes and destructive actions.

## Colors

The palette is cool, quiet, and status-rich. Blue is reserved for action, focus, selection, and link-like affordances; semantic colors explain payment direction, success, warnings, and destructive risk.

### Primary
- **Action Blue** (`#075be8`): primary actions, secondary text buttons, link-like commands, and selected command emphasis.
- **Focus Blue** (`#0e69ff`): focused borders and the anchor hue for the focus ring.
- **Soft Blue** (`#eaf2ff`): selected participant segments and low-intensity payment icons.
- **Blue Line** (`#c7dcff`): subtle selected or informational borders.

### Secondary
- **Event Green** (`#0a8f45`): the event mark in the hero.
- **Success Green** (`#06763a`): settled or positive financial states, including `gets back`.
- **Soft Green** (`#dff7e8`): positive status backgrounds, success confirmations, and green avatars.
- **Coral Risk** (`#c51f35`): negative financial direction, destructive actions, and `pays`.
- **Soft Coral** (`#ffe8eb`): remove confirmations and destructive-risk surfaces.
- **Amber Review** (`#8a4b00`): validation errors, blocked settlement flows, and review-required states.
- **Soft Amber** (`#fff2d6`): warning and validation backgrounds.

### Neutral
- **App Paper** (`#f6f8fb`): the body background only.
- **Surface** (`#ffffff`): workspace, panels, controls, and action backgrounds.
- **Surface 2** (`#f9fafc`): passive summaries, totals, copy wells, capture defaults, and mobile previews.
- **Ink** (`#111827`): primary text and financial values.
- **Muted Text** (`#5f6878`): explanatory copy, row metadata, and low-priority controls.
- **Faint Text** (`#8a94a6`): lowest-priority helper copy only.
- **Line** (`#dfe4ec`) and **Strong Line** (`#cbd5e1`): normal dividers, panel borders, and the workspace shell.

### Named Rules
**The One Action Color Rule.** Blue is for action, focus, selection, and links only. Do not use blue as decoration.

**The Money Direction Rule.** Positive balances use green and say `gets back`; negative balances use coral and say `pays`; settled states use muted text. Do not rely on color alone.

## Typography

**Display Font:** Inter with system sans fallbacks.
**Body Font:** Inter with system sans fallbacks.
**Label/Mono Font:** Inter with system sans fallbacks.

**Character:** SettleUp uses one tuned product sans. Hierarchy comes from size, weight, line-height, spacing, and tabular numerals, not from decorative font pairing.

### Hierarchy
- **Display** (820, `2rem`, `1.12`): event title and brand-size text only. Do not use larger hero typography in the app.
- **Title** (760, `1.12rem`, `1.3`): section headings, important row titles, and settlement review values.
- **Body** (400, `1rem`, `1.35`): readable form copy, summaries, and prose. Cap explanatory copy around 65ch.
- **Label** (650, `0.875rem`, `1.3`): field labels, metadata, compact row descriptors, and status labels.
- **Caption** (650, `0.78rem`, `1.25`): balance direction labels and small supporting text.
- **Money Values** (820, `1.12rem`, `1.2`, tabular numerals): right-aligned values in balance rows and totals.

### Named Rules
**The Product Scale Rule.** Use fixed rem sizes. Do not use fluid typography for operational UI except the compact brand wordmark already in the topbar.

**The Concrete Label Rule.** Labels and buttons should name the action or state and include a known amount when it reduces uncertainty: `Save $100.00 expense`, `Review fields`, `Record $33.33`, `Mark $33.33 paid`, `Everyone's balances`.

## Elevation

SettleUp is flat by default. Depth comes from border strength, surface tone, row rhythm, and spacing. Panels, summaries, controls, and history rows should not float above the workspace.

### Shadow Vocabulary
- **Focus Ring** (`0 0 0 3px rgba(14, 105, 255, 0.16)`): keyboard and input focus only.
- **Mobile Action Bar** (`0 -6px 8px rgba(17, 24, 39, 0.08)`): used only for the fixed mobile form action bar while split controls are open.
- **Inset Selected Segment** (`inset 0 0 0 1px rgba(14, 105, 255, 0.2)`): reinforces selected participant segments without making them float.

### Named Rules
**The Flat-By-Default Rule.** If a surface can be separated with a border, tonal layer, or spacing, do that before adding shadow.

**The No Decorative Glow Rule.** Do not add card shadows, glows, glass effects, gradients, or ornamental backgrounds.

## Components

The reusable implementation is split between product primitives in `src/components/design-system.jsx` and event-specific patterns in `src/components/event-ui.jsx`. Keep business rules, calculations, and form state in the page layer unless a pattern repeats across surfaces.

### Workspace
- **Shape:** one white `.workspace` on `paper`, `10px` radius on desktop, square edges on mobile.
- **Width:** `min(100rem, calc(100% - 2rem))` on desktop, full-width on mobile.
- **Structure:** topbar, event hero, two-column desktop grid, single-column mobile flow.
- **Mobile behavior:** capture first, then settlement feedback, balances, history, and footer.

### Create Event
- **Role:** the default root view when no Event Link is present.
- **Fields:** event name, currency, and the creator's participant name.
- **Layout:** the create shell leads with the SettleUp wordmark and a compact `Create an event` hero. The form uses truthful required-field progress, a full-width event name, creator name beside a compact right-aligned currency selector, a three-step lifecycle, and the primary action aligned to the trailing edge on wide screens.
- **Wide hero:** use a `3rem` event mark, `1.5rem` title, `0.75rem` gap, and `1rem` vertical padding so the form remains visually primary at tablet and desktop widths.
- **Mobile hero:** vertically center the title against a `2.5rem` event mark, use a `1.3rem` title, and keep the gap to `0.625rem` so setup content remains dominant.
- **Copy:** let the field-progress block explain what remains. Use the lifecycle once to explain what opens now, what link holders can change, and the exact closing day; do not repeat that guidance in the hero or a summary callout.
- **Behavior:** create the event through the API, replace the URL with `/e/:token`, then enter the event workspace.
- **Primary action:** use `Start my event` without supporting copy; the lifecycle already explains the next state.
- **Empty state:** never seed sample participants, expenses, balances, or history rows.

### Panels
- **Shape:** `8px` radius, `1px` `line` border, white background.
- **Header:** `.section-header` with lucide icon, direct title, optional muted context, and optional compact action.
- **Internal rhythm:** row-based content with borders, not nested cards.

### Buttons
- **Primary:** filled `blue`, white text, `7px` radius, minimum height `2.9rem`, heavy label weight.
- **Primary review state:** soft amber background with amber text when required fields need review.
- **Secondary:** transparent or white, blue text, same control radius and weight.
- **Summary action:** filled blue for amount-aware actions such as `Mark $33.33 paid`; it shares the primary action vocabulary.
- **Focus:** all buttons use the shared blue focus ring.

### Inputs / Fields
- **Style:** white background, `1px` line border, `7px` radius, `2.85rem` to `3rem` height.
- **Focus:** border shifts to `blue-2` and receives the focus ring.
- **Error:** amber border and amber field copy that names the required fix.
- **Select shell:** `SelectShell` wraps native selects with avatar/icon affordances while preserving native behavior.

### Form Progress
- **Role:** make short setup and capture tasks feel started without inventing progress or extra steps.
- **Behavior:** count only real required inputs; valid smart defaults such as event currency, payer, and equal split count toward the starting state.
- **Style:** a compact labeled track using action blue while in progress, success green when ready, and review amber only after validation has been triggered.
- **Motion:** update the fill with a `180ms` transform transition and remove the transition when reduced motion is requested.

### Decision Confidence
- **Easy next question:** each surface asks for one concrete decision at a time and carries valid defaults forward instead of making people re-evaluate the whole workflow.
- **Specificity over reassurance:** show exact dates, exact split amounts, and the result of the next action. Avoid vague promises such as `quick`, `easy`, or `about` when the interface knows the real value.
- **Safety before commitment:** explain private-link expiry before event creation, distinguish recording a payment from transferring money, and keep undo paths visible where a shared record changes.
- **Outcome-led actions:** action labels may include the known amount or outcome, such as `Save A$48.00 expense` or `Mark A$16.00 paid`, so the button answers what will happen before it is pressed.

### Exact Split Preview
- **Source of truth:** derive preview rows with the same shared `deriveEqualShares` function used by persistence.
- **Collapsed summary:** group deterministic values as counts, for example `1 × $33.34 · 2 × $33.33`; never present an uncertain range.
- **Expanded detail:** show every included participant beside their exact share and repeat the expense total for comparison.
- **Minor-unit remainder:** assign remainder cents in selected-participant order exactly as the domain function does; do not round every row independently.

### Participant Segments
- **Style:** compact `2.9rem` controls with avatar initials, visible checkbox affordances for split membership, and full-surface clickable labels.
- **Selected state:** `blue-soft` background, `blue-2` border, and inset selected ring.
- **Accessibility:** checkbox inputs remain real form controls even when visually compact.

### People Control
- **Role:** inline event setup inside the capture panel, not a separate administration screen.
- **Style:** a quiet `surface-2` manager with compact participant rows and one `Add person` input/action pair.
- **Behavior:** adding a person updates event metadata, the identity selector, and the default split when the expense draft is still untouched.
- **Participant edits:** edit and delete icon actions stay low-emphasis and require accessible names and titles. Removing is blocked for the last remaining person and server-side deletion only succeeds for unreferenced people.

### Balance Rows
- **Layout:** person and paid/share metadata on the left, tabular net value on the right.
- **Semantics:** positive means `gets back`; negative means `pays`; settled uses muted copy.
- **Mobile:** the preview row should summarize the most important payment, while full details stay in `Everyone's balances`.

### Settlement and Feedback
- **Settlement prompt:** shows `Next payment` and an exact `Record $amount` action whenever saved balances are open and no expense draft blocks settlement.
- **Suggested payment:** `Mark $amount paid` stays the primary path for the recommended next payment, followed by visible undo reassurance.
- **Manual payment:** use the collapsed `Record a different payment` details row for payment amounts or directions that differ from the suggestion; editing an existing payment opens the same form.
- **Payment confirmation:** green status region with explicit `Undo payment`.
- **Remove confirmation:** coral-soft alert with `Keep expense` and `Remove expense`.
- **Undo toast:** sticky dark status with a single `Undo` action.
- **Disclaimer:** recording payment marks the event paid; it does not transfer money.

### History Rows
- **Role:** supporting evidence, lower priority than capture and balances.
- **Layout:** icon, description, metadata, amount, and restrained edit/remove actions.
- **Empty state:** show `No expenses yet` with a direct explanation that the first saved expense will appear there.
- **Payment history:** uses soft blue icon treatment to distinguish recorded payments from expenses, with restrained `Edit` and `Undo payment` actions.

## Do's and Don'ts

### Do:
- **Do** keep expense capture ahead of administration; payment tools appear once saved expenses create open balances or a recorded payment is being corrected.
- **Do** preserve private-by-link clarity anywhere a change affects everyone with the link.
- **Do** keep new events empty until a user explicitly adds people, expenses, or payments.
- **Do** keep labels short and concrete: `Save $amount expense`, `Record $amount`, `Mark $amount paid`, `Record a different payment`, `Everyone's balances`.
- **Do** use truthful progress and smart defaults to reduce blank-form effort; never count decorative or hidden steps.
- **Do** preserve an invested expense draft on the current device and identify restored work plainly.
- **Do** use semantic status roles and accessible names for icon-led controls.
- **Do** keep mobile controls stable at 320px and prevent horizontal overflow with `minmax(0, 1fr)` and `min-width: 0` where needed.
- **Do** use the shared components in `src/components/design-system.jsx` and `src/components/event-ui.jsx` before adding local copies.

### Don't:
- **Don't** make SettleUp banking-heavy, playful-fintech, spreadsheet-dense, or gamified.
- **Don't** introduce account-management patterns, financial-product language, investment-dashboard visuals, dense ledger tables, or power-user table controls.
- **Don't** reveal settlement controls while a draft expense is in progress.
- **Don't** add nested cards, decorative shadows, broad gradients, glassmorphism, or ornamental backgrounds.
- **Don't** use fake urgency, fake scarcity, fake progress, or loss-framed copy to pressure users.
- **Don't** use side-stripe alert borders, gradient text, large marketing heroes, or decorative card grids.
- **Don't** let mobile controls resize the layout or cover form fields without preserving scroll room.

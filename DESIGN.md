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

# Design System: SettleUp

## Overview

**Creative North Star: "The Shared Table"**

SettleUp is a focused product surface for one small group expense event. Like a shared table, it keeps the active work close: add a cost, see the exact split, understand who pays, and record settlement without stepping into account administration.

The visual system is restrained and task-led. A pale app background holds one white workspace with firm borders, compact radii, familiar controls, and visible semantic states. Expense capture remains primary; balances explain the result; settlement tools appear only when saved activity makes them useful.

The system explicitly rejects banking-heavy, playful-fintech, spreadsheet-dense, and gamified visual language. It must never resemble an account dashboard, financial product, investment interface, or power-user ledger.

**Key Characteristics:**
- Restrained light surfaces with one strong blue action color.
- Flat construction using borders, tonal layers, and row rhythm instead of decorative depth.
- Compact, mobile-first controls that remain usable at 320px.
- Exact, human money language: `gets back`, `pays`, and amount-aware actions.
- Private-by-link consequences and undo paths shown before or immediately after shared mutations.

## Colors

The palette is cool, quiet, and state-rich. Blue is operational; green, coral, and amber communicate outcomes without relying on color alone; neutrals carry most of every screen.

### Primary
- **Action Blue** (`#075be8`): Primary actions, focus, selection, and link-like commands only.
- **Focus Blue** (`#0e69ff`): Focus borders and the anchor hue of the shared focus ring.
- **Soft Blue** (`#eaf2ff`): Selected participant controls, payment-history icons, and exact-split previews.
- **Blue Line** (`#c7dcff`): Informational and selected-state borders.

### Secondary
- **Event Green** (`#0a8f45`): The circular event mark; never a second general action color.
- **Success Green** (`#06763a`): Positive balances and successful recorded-payment states.
- **Coral Risk** (`#c51f35`): Negative balance direction and destructive expense actions.
- **Review Amber** (`#8a4b00`): Required-field feedback and blocked or review-required states.

### Neutral
- **App Paper** (`#f6f8fb`): Body background only.
- **Surface** (`#ffffff`): Workspace, panels, controls, and action text on saturated backgrounds.
- **Quiet Surface** (`#f9fafc`): Passive summaries, totals, defaults, history distinctions, and mobile previews.
- **Ink** (`#111827`): Primary copy and financial values.
- **Muted Text** (`#5f6878`): Explanations, metadata, and low-priority controls.
- **Faint Text** (`#8a94a6`): Lowest-priority helper copy only; never body text.
- **Line / Strong Line** (`#dfe4ec` / `#cbd5e1`): Dividers, panel borders, and the workspace shell.

### Named Rules

**The One Action Color Rule.** Blue is reserved for actions, focus, selection, and links. It is never decoration.

**The Money Direction Rule.** Green says `gets back`, coral says `pays`, and muted says `settled`. Text always carries the meaning with the color.

**The Quiet Majority Rule.** Neutral surfaces and ink dominate every screen; semantic colors appear only where the state warrants them.

## Typography

**Display Font:** Inter with system sans fallbacks.
**Body Font:** Inter with system sans fallbacks.
**Label/Mono Font:** Inter with system sans fallbacks.

**Character:** One tuned product sans carries the complete interface. Hierarchy comes from fixed size, weight, spacing, and tabular numerals rather than decorative pairing.

### Hierarchy
- **Display** (820, `2rem`, 1.12): Event titles and brand-size text only.
- **Title** (760, `1.12rem`, 1.3): Section headings, settlement review values, and important row titles.
- **Body** (400, `1rem`, 1.35): Form copy, summaries, and prose, capped near 65ch.
- **Label** (650, `0.875rem`, 1.3): Field labels, compact metadata, commands, and status labels.
- **Caption** (650, `0.78rem`, 1.25): Balance directions and the lowest-priority supporting text.
- **Money Values** (820, `1.12rem`, 1.2): Right-aligned, tabular values in balance rows and totals.

### Named Rules

**The Product Scale Rule.** Operational type uses fixed rem sizes. Fluid type is restricted to the compact brand wordmark.

**The Concrete Label Rule.** Actions name the outcome and include a known amount when it reduces uncertainty: `Save A$100.00 expense`, `Record A$33.33`, `Mark A$33.33 paid`.

## Elevation

SettleUp is flat by default. Borders, tonal surfaces, spacing, and row separators establish hierarchy. Ordinary panels, controls, summaries, and history rows never float.

### Shadow Vocabulary
- **Focus Ring** (`0 0 0 3px rgba(14, 105, 255, 0.16)`): Keyboard focus and focused field shells only.
- **Mobile Action Bar** (`0 -6px 8px rgba(17, 24, 39, 0.08)`): The fixed mobile form action bar while expanded split controls are open.
- **Selected Inset** (`inset 0 0 0 1px rgba(14, 105, 255, 0.2)`): Selected participant segments only.

### Named Rules

**The Flat-by-Default Rule.** Separate a surface with a border, tonal layer, or spacing before considering shadow.

**The No Decorative Glow Rule.** Card shadows, glows, glass effects, gradients, and ornamental backgrounds are forbidden.

## Components

### Workspace and Navigation
- **Workspace:** One white shell with a firm strong-line border and 10px desktop radius on App Paper; full-width with square side edges below 700px.
- **Desktop structure:** Topbar, compact event hero, then a `1.35fr / 0.65fr` capture-and-summary grid with a `1.25rem` gap.
- **Mobile structure:** Capture first, followed by settlement feedback, balances, history, and footer.
- **Topbar:** Brand, identity, private-link sharing, and event context use one compact row and collapse structurally rather than shrinking type.

### Buttons
- **Shape:** Compact controls with 7px radius and a minimum height of 2.9rem.
- **Mobile target:** Visible compact actions, including share, participant edit/remove, and payment undo, retain at least a 44px touch target.
- **Primary:** Action Blue fill, white text, and a matching solid border; no decorative shadow.
- **Secondary:** Transparent surface with Action Blue text and the same typographic weight.
- **Review state:** Soft amber with amber text when required fields need attention.
- **Focus:** The shared Focus Ring is always visible for keyboard users.

### Panels and Rows
- **Panels:** White, 8px radius, one Line border, no shadow, and row-based internal structure.
- **Headers:** Lucide icon, direct title, optional muted context, and optional compact action.
- **Balance rows:** Participant and paid/share metadata left; exact tabular net value right; semantic direction is written as well as colored.
- **History rows:** Supporting evidence with restrained edit/remove or edit/undo actions; payment history uses Quiet Surface and Soft Blue icon treatment.

### Inputs and Fields
- **Style:** White native controls with one Line border, 7px radius, 2.85–3rem height, and readable Ink text.
- **Placeholder:** Muted Text at full opacity so example text retains WCAG AA contrast.
- **Focus:** Border shifts to Focus Blue and receives the shared Focus Ring.
- **Error:** Amber border plus specific amber copy naming the required fix; a failed create submission announces a summary and focuses the first invalid field.
- **Selects:** Native selection behavior remains intact inside a shared visual shell.

### Form Progress and Lifecycle
- **Progress:** Counts only real required inputs and valid smart defaults. The 180ms transform transition uses Action Blue, Success Green, or Review Amber and becomes effectively instant under reduced motion.
- **Create lifecycle:** One ordered three-step explanation covers what opens now, what link holders can change, and the exact closing day. Do not repeat the same guidance elsewhere.
- **Create draft:** Event name, creator name, and currency restore locally for up to 24 hours once the user has invested input. Expired, malformed, or unavailable storage never blocks creation, and successful creation clears the draft.

### Participant Segments and Exact Splits
- **Segments:** Compact 2.9rem controls with avatars or visible real checkboxes and full-surface labels.
- **Selected state:** Soft Blue surface, Focus Blue border, and Selected Inset.
- **Exact split preview:** Uses the same domain calculation as persistence, shows deterministic cent allocation, and repeats the expense total for comparison.

### Settlement and Feedback
- **Suggested payment:** Shows an exact next payment and amount-aware action before manual alternatives.
- **Manual payment:** Collapsed until a user records a different amount/direction or edits an existing payment.
- **Success:** Green status region with explicit `Undo payment`.
- **Destructive confirmation:** Soft Coral region with `Keep expense` and `Remove expense`.
- **Undo toast:** Sticky Ink status with one visible `Undo` action.
- **Disclaimer:** Recording a payment changes the shared record; it does not transfer money.

### App Icon
- **Canonical asset:** `public/icon-updated.png` at 1024×1024, with derived PWA, Apple touch, and favicon sizes.
- **Form:** A two-tone geometric three-part mark suggesting a small group reaching settlement.
- **Restrictions:** No text, letters, currency symbols, calculators, charts, spreadsheets, bank imagery, checkmarks, shadows, or presentation framing.

## Do's and Don'ts

### Do:
- **Do** keep expense capture ahead of administration and settlement tools.
- **Do** preserve the root create flow: event name, creator name, currency, truthful lifecycle preview, then `Start my event`.
- **Do** keep newly created events empty apart from the creator participant.
- **Do** show exact dates, amounts, split shares, lifecycle states, and reversible outcomes.
- **Do** preserve invested create-event and expense drafts across refreshes, and protect expense drafts from realtime updates.
- **Do** explain private-by-link consequences wherever a mutation changes shared state.
- **Do** use green `gets back`, coral `pays`, and muted `settled` without relying on color alone.
- **Do** retain native form behavior, visible focus, accessible icon labels, and reduced-motion handling.
- **Do** keep controls stable at 320px and verify primary flows at 390×844.
- **Do** reuse `src/components/design-system.jsx` and `src/components/event-ui.jsx` before adding local UI patterns.

### Don't:
- **Don't** make SettleUp banking-heavy, playful-fintech, spreadsheet-dense, or gamified.
- **Don't** introduce account-management patterns, financial-product language, investment dashboards, dense ledgers, or power-user tables.
- **Don't** reveal settlement controls while an expense draft is in progress.
- **Don't** seed fake participants, expenses, balances, history, urgency, scarcity, or progress.
- **Don't** add nested cards, decorative shadows, broad gradients, glassmorphism, glows, or ornamental backgrounds.
- **Don't** use side-stripe alerts, gradient text, large marketing heroes, decorative card grids, or vague sales language.
- **Don't** use blue as decoration or a second accent as a competing action color.
- **Don't** round panels beyond the documented 8–10px vocabulary.
- **Don't** let mobile controls resize the layout, create horizontal overflow, or cover fields without preserving scroll room.

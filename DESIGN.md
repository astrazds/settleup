---
name: SettleUp design system
description: A calm shared-expense workspace for quick capture and confident settlement.
colors:
  paper: "#f7f7f5"
  surface: "#ffffff"
  surface-2: "#f7f7f5"
  ink: "#37352f"
  muted: "#6f6e69"
  faint: "#9b9a97"
  line: "#e7e7e4"
  line-strong: "#d3d3cf"
  blue: "#2383e2"
  blue-2: "#0b6dca"
  blue-soft: "#e9f3fb"
  blue-line: "#bedcf3"
  green: "#0f7b3e"
  green-soft: "#edf6ee"
  green-line: "#c8dfcb"
  green-line-strong: "#9fc8a5"
  coral: "#b4232f"
  coral-soft: "#fbeff0"
  amber: "#855000"
  amber-soft: "#fbf3df"
  event-mark: "#f1f1ef"
  avatar-green-bg: "#edf6ee"
  avatar-green-fg: "#2f6f45"
  avatar-blue-bg: "#e9f3fb"
  avatar-blue-line: "#bedcf3"
  avatar-blue-fg: "#1f6fae"
  avatar-violet-bg: "#f2edf7"
  avatar-violet-line: "#d9cbe7"
  avatar-violet-fg: "#76558e"
  avatar-orange-bg: "#faeee2"
  avatar-orange-line: "#ead0b4"
  avatar-orange-fg: "#93623b"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.55rem, 2vw, 2rem)"
    fontWeight: 820
    lineHeight: 1.35
    letterSpacing: "0"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 760
    lineHeight: 1.3
    letterSpacing: "0"
  heading:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 820
    lineHeight: 1.2
    letterSpacing: "0"
  section:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
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
  tag: "3px"
  control: "4px"
  panel: "5px"
  workspace: "6px"
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

**Creative North Star: "The Working Document"**

SettleUp is a focused working document for one small group expense event. It keeps the active work close: add a cost, see the exact split, understand who pays, and record settlement without stepping into account administration.

The visual system uses a warm Notion-like paper canvas, white working surfaces, hairline separators, compact radii, familiar controls, and visible semantic states. Expense capture remains primary; balances explain the result; settlement tools appear only when saved activity makes them useful.

The root create landing page is the visual calibration surface for shared product chrome. Ready event workspaces inherit its text sizing, topbar and hero spacing, event-mark scale, icon scale, and compact section rhythm; event-specific controls may add function without creating a second visual hierarchy.

The system explicitly rejects banking-heavy, playful-fintech, spreadsheet-dense, and gamified visual language. It must never resemble an account dashboard, financial product, investment interface, or power-user ledger.

**Key Characteristics:**
- Warm document surfaces with one restrained blue action color.
- Flat construction using borders, tonal layers, and row rhythm instead of decorative depth.
- Landing-calibrated chrome and hierarchy across create and ready-event surfaces.
- Compact, mobile-first controls that remain usable at 320px.
- Exact, human money language: `gets back`, `pays`, and amount-aware actions.
- Private-by-link consequences and undo paths shown before or immediately after shared mutations.

## Colors

The palette is warm, quiet, and state-rich. Blue is operational; green, coral, and amber communicate outcomes without relying on color alone; warm neutrals carry most of every screen.

### Primary
- **Action Blue** (`#2383e2`): Primary actions, focus, selection, and link-like commands only.
- **Focus Blue** (`#0b6dca`): Focus borders and the anchor hue of the shared focus ring.
- **Soft Blue** (`#e9f3fb`): Selected participant controls, payment-history icons, and exact-split previews.
- **Blue Line** (`#bedcf3`): Informational and selected-state borders.

### Secondary
- **Event Mark** (`#f1f1ef`): A neutral document icon surface; never a second general action color.
- **Success Green** (`#0f7b3e`): Positive balances and successful recorded-payment states.
- **Coral Risk** (`#b4232f`): Negative balance direction and destructive expense actions.
- **Review Amber** (`#855000`): Required-field feedback and blocked or review-required states.

### Neutral
- **App Paper** (`#f7f7f5`): Body background and quiet document grouping.
- **Surface** (`#ffffff`): Workspace, panels, controls, and action text on saturated backgrounds.
- **Quiet Surface** (`#f7f7f5`): Passive summaries, totals, defaults, history distinctions, and mobile previews.
- **Ink** (`#37352f`): Primary copy and financial values.
- **Muted Text** (`#6f6e69`): Explanations, metadata, and low-priority controls.
- **Faint Text** (`#9b9a97`): Lowest-priority helper copy only; never body text.
- **Line / Strong Line** (`#e7e7e4` / `#d3d3cf`): Dividers, panel borders, and the workspace shell.

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
- **Display** (820, `clamp(1.55rem, 2vw, 2rem)`, 1.35): Compact SettleUp wordmark only.
- **Heading** (820, `1.5rem`, 1.2): Create-page task headings and ready-event titles at every supported size.
- **Section** (760, `1rem`, 1.3): Ready-event panel headings.
- **Title** (760, `1.12rem`, 1.3): Settlement review values and important row titles.
- **Body** (400, `1rem`, 1.35): Form copy, summaries, and prose, capped near 65ch.
- **Label** (650, `0.875rem`, 1.3): Field labels, compact metadata, commands, and status labels.
- **Caption** (650, `0.78rem`, 1.25): Balance directions and the lowest-priority supporting text.
- **Mobile caption** (650, `0.875rem`, 1.25): Caption roles step up to the label size below 700px for outdoor and handheld readability.
- **Money Values** (820, `1.12rem`, 1.2): Right-aligned, tabular values in balance rows and totals.

### Named Rules

**The Product Scale Rule.** Operational type uses fixed rem sizes. Fluid type is restricted to the compact brand wordmark.

**The Concrete Label Rule.** Actions name the outcome and include a known amount when it reduces uncertainty: `Save A$100.00 expense`, `Record A$33.33`, `Mark A$33.33 paid`.

## Layout

The root create landing page is the master calibration surface for shared chrome. Its ready-state proportions carry into event workspaces: topbars use `0.5rem` vertical padding, ready heroes use a `1.5rem` title, `0.75rem` desktop gap, `1rem` vertical padding, a `3rem` event mark, and a `1.35rem` mark icon. The private-link action stays in the topbar so event metadata receives the full hero copy width.

The create workspace is capped at `48rem`; the event workspace can grow to `100rem`. Both sit on App Paper with a `1.25rem` outer rhythm. The ready event body uses a `1.35fr / 0.65fr` capture-and-summary grid with a `1.25rem` gap, collapsing to one column at `980px`.

Below `700px`, workspaces become full-width with square side edges and `1rem` content gutters. The calibrated hero tightens to `0.5rem` vertical padding, a `0.625rem` gap, a `2.5rem` mark, and a `1.15rem` icon. Ready-event section headers use `0.5rem 0.75rem` padding and `0.5rem` title/icon spacing; only the expense header stacks its progress state. Panels stretch to the same width, visible controls remain at least `44px` tall, and the complete flow must remain usable at `320px` and be verified at `390×844`.

### Named Rules

**The Landing Calibration Rule.** When create and ready-event surfaces share a visual role, the root landing implementation sets the text size, spacing, mark scale, and icon scale. Event-specific variants may add necessary controls but must not enlarge or loosen the shared hierarchy.

## Elevation & Depth

SettleUp is flat by default. Borders, tonal surfaces, spacing, and row separators establish hierarchy. Ordinary panels, controls, summaries, and history rows never float.

### Shadow Vocabulary
- **Focus Ring** (`0 0 0 3px rgba(14, 105, 255, 0.72)`): Keyboard focus and focused field shells only.
- **Mobile Action Bar** (`0 -6px 8px rgba(17, 24, 39, 0.08)`): The fixed mobile form action bar while expanded split controls are open.
- **Selected Inset** (`inset 0 0 0 1px rgba(14, 105, 255, 0.2)`): Selected participant segments only.

### Named Rules

**The Flat-by-Default Rule.** Separate a surface with a border, tonal layer, or spacing before considering shadow.

**The No Decorative Glow Rule.** Card shadows, glows, glass effects, gradients, and ornamental backgrounds are forbidden.

## Shapes

SettleUp uses compact document rounding: `3px` for tags, `4px` for controls and checkboxes, `5px` for panels, and `6px` for the desktop workspace shell. Avatars are circular. Borders stay one pixel and structural; mobile workspaces drop side borders and shell rounding rather than nesting another rounded container.

## Components

### Workspace and Navigation
- **Workspace:** One white shell with a firm strong-line border and 6px desktop radius on App Paper; full-width with square side edges below 700px.
- **Desktop structure:** Topbar, compact event hero, then a `1.35fr / 0.65fr` capture-and-summary grid with a `1.25rem` gap.
- **Mobile structure:** Capture first, followed by the combined balances and settlement surface, compact history, and footer.
- **Topbar:** Brand and private-link sharing use the landing-calibrated compact row. A copy fallback may span the row without changing the hero width.
- **Ready-event hero:** Mirrors the create hero’s title, spacing, event-mark, and icon metrics. It holds event identity and metadata only; sharing remains in the topbar.

### Buttons
- **Shape:** Compact controls with 4px radius and a minimum height of 2.9rem.
- **Mobile target:** Visible compact actions, including share, participant edit/remove, and payment undo, retain at least a 44px touch target.
- **Primary:** Action Blue fill, white text, and a matching solid border; no decorative shadow.
- **Secondary:** Transparent surface with Action Blue text and the same typographic weight.
- **Review state:** Soft amber with amber text when required fields need attention.
- **Focus:** The shared Focus Ring is always visible for keyboard users.

### Panels and Rows
- **Panels:** White, 5px radius, one Line border, no shadow, and row-based internal structure.
- **Headers:** An 18px Lucide icon, direct 1rem ready-event title, optional muted context separated by 0.25rem, and an optional compact action.
- **Mobile expense header:** Stacks progress below the title while other section headers remain compact and action-aligned.
- **Balance rows:** Participant and paid/share metadata left; exact tabular net value right; semantic direction is written as well as colored.
- **History rows:** Keep the record identity, amount, and supporting evidence visible; place edit/remove or edit/undo actions behind a 44px-tall `Manage` disclosure. Payment history uses Quiet Surface and Soft Blue icon treatment.

### Inputs and Fields
- **Style:** White native controls with one Line border, 4px radius, 2.85–3rem height, and readable Ink text.
- **Placeholder:** Muted Text at full opacity so example text retains WCAG AA contrast.
- **Focus:** Border shifts to Focus Blue and receives the shared Focus Ring.
- **Error:** Amber border plus specific amber copy inside the affected description or amount shell; a failed submission announces a summary and focuses the first invalid field.
- **Selects:** Native selection behavior remains intact inside a shared visual shell.

### Form Progress and Lifecycle
- **Progress:** Counts only real required inputs and valid smart defaults. The 180ms transform transition uses Action Blue, Success Green, or Review Amber and becomes effectively instant under reduced motion.
- **Create lifecycle:** One ordered three-step explanation covers what opens now, what link holders can change, and the exact closing day. Do not repeat the same guidance elsewhere.
- **Create draft:** Event name, creator name, and currency restore locally for up to 24 hours once the user has invested input. Expired, malformed, or unavailable storage never blocks creation, and successful creation clears the draft.

### Participant Segments and Exact Splits
- **Segments:** Compact 2.9rem controls with avatars or visible real checkboxes and full-surface labels.
- **Selected state:** Soft Blue surface, Focus Blue border, and Selected Inset.
- **Exact split preview:** Uses the same domain calculation as persistence, shows deterministic cent allocation, and repeats the expense total for comparison.
- **Capture order:** Description, amount, and save lead. Configuration follows capture rather than interrupting it.
- **Participant administration:** Add, rename, and remove controls live behind a collapsed `Manage people` disclosure after the save action.
- **Payer and split defaults:** A second collapsed disclosure follows `Manage people` and combines the local person selector, payer default, split summary, Included Participant controls, and exact-share preview. Split validation opens this disclosure when attention is required.
- **Participant removal:** Confirmation names the participant, states that the shared change cannot be undone, and explains why a referenced participant may be protected.

### Settlement and Feedback
- **Balance hierarchy:** Lead with the single exact next payment, then the viewer's quieter personal balance; place the full participant ledger behind `Everyone's balances` on mobile.
- **Suggested payment:** Shows an exact next payment and amount-aware action before manual alternatives or the full ledger.
- **Manual payment:** Collapsed until a user records a different amount/direction or edits an existing payment.
- **Payment region:** Expands inside `Who pays what` with an internal divider instead of creating another panel.
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
- **Do** use the root landing page as the master reference for shared text sizing, header spacing, event-mark scale, and icon scale.
- **Do** keep description, amount, and save ahead of administration, payer/split configuration, and settlement tools.
- **Do** keep participant administration collapsed until someone explicitly opens `Manage people`.
- **Do** keep local person, payer, and split settings together behind `Payer and split defaults`.
- **Do** lead the balance surface with one actionable next payment and keep full balances available without competing for initial mobile attention.
- **Do** keep history evidence visible while placing secondary mutation actions behind `Manage`.
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
- **Don't** let a ready-event variant enlarge or loosen shared chrome beyond the landing calibration without an explicit product need.
- **Don't** make SettleUp banking-heavy, playful-fintech, spreadsheet-dense, or gamified.
- **Don't** introduce account-management patterns, financial-product language, investment dashboards, dense ledgers, or power-user tables.
- **Don't** reveal settlement controls while an expense draft is in progress.
- **Don't** place participant maintenance before the primary expense fields or save action.
- **Don't** show a second “most important” balance preview beside the settlement suggestion.
- **Don't** seed fake participants, expenses, balances, history, urgency, scarcity, or progress.
- **Don't** add nested cards, decorative shadows, broad gradients, glassmorphism, glows, or ornamental backgrounds.
- **Don't** use side-stripe alerts, gradient text, large marketing heroes, decorative card grids, or vague sales language.
- **Don't** use blue as decoration or a second accent as a competing action color.
- **Don't** round panels beyond the documented 5–6px vocabulary.
- **Don't** let mobile controls resize the layout, create horizontal overflow, or cover fields without preserving scroll room.

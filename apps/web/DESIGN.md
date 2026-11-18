---
name: SettleUp
description: A compact, private-by-link workspace for shared expenses.
colors:
  cream: "#f4f1e7"
  ink: "#233a31"
  teal: "#135747"
  teal-hover: "#104638"
  event-paper: "#f4f1e7"
  input-paper: "#fffcf5"
  muted-ink: "#546357"
  soft-teal: "#e8eee5"
  divider: "#c6ccbc"
  control-border: "#869582"
  brick: "#922b23"
typography:
  display:
    fontFamily: '"Session Display", sans-serif'
    fontWeight: 400
  body:
    fontFamily: '"Session Sans", Arial, sans-serif'
    fontWeight: 400
  label:
    fontFamily: '"Session Sans", Arial, sans-serif'
    fontWeight: 600
rounded:
  control: "4px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
  button-primary-hover:
    backgroundColor: "{colors.teal-hover}"
    textColor: "#ffffff"
  input:
    backgroundColor: "{colors.input-paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
---

# SettleUp design system

The approved direction is **Quick slip**. Green rules frame the primary task on warm paper. Keep amounts aligned and keep the surrounding ledger on the page canvas. Use the same surface for first entry, settlement and participant management. [PRODUCT.md](PRODUCT.md) owns behavior and exclusions.

## Implementation owners

| Concern | Source |
| --- | --- |
| Palette, themes, fonts, focus, browser controls | [global.css](app/styles/global.css) |
| Create-event page | [home.tsx](app/routes/home.tsx), [home.module.css](app/styles/home.module.css) |
| Event header, lists, forms, dialogs | [app.module.css](app/styles/app.module.css) |
| Brand | [brand.module.css](app/styles/brand.module.css), [favicon.svg](public/favicon.svg) |
| Loading and errors | [root.module.css](app/styles/root.module.css) |
| Browser checks and reference images | [states.spec.ts](tests/e2e/states.spec.ts), [snapshots](tests/e2e/states.spec.ts-snapshots/) |

## Palette and type

Use the shared semantic tokens for paper, ink, rules and controls. Forest green marks the primary action and active tab. Brick identifies errors and destructive actions. State changes also have text labels.

Use self-hosted League Gothic for the event name, landing promise and settlement amount. Use Barlow for form headings, labels, body copy and controls. Display monetary values with tabular numerals.

## Brand

In light mode, Carbon Copy has an outlined cream receipt with a second sheet
peeking out along the upper left. In dark mode, Reverse Print fills the front
receipt with lighter green, uses dark ledger bars, and moves the second sheet
to the upper right. Both use a mustard block for the remainder. The mark follows
the browser color scheme and uses system colors in forced-colors mode.

## Layout

The 1100px workspace has a ruled masthead, event title, metadata and three peer tabs. On Expenses, total spent sits alongside the event title. Event metadata wraps, and long names can span multiple lines. Keep native document scrolling.

On the landing page, the promise sits beside the create-event slip on desktop. On phones the form follows the short introduction. Place the private-link and three-day availability information beneath the submit button.

## Expenses

Show the expense form immediately, including on an empty ledger. Description comes first, followed by amount and payer, included people, the exact split disclosure and Save expense. Use the event’s participant preference for the payer and include everyone in a new expense by default.

Place recent expenses alongside the slip on wide screens and below it on phones. Ruled rows show the description, payer, included-person count, date and amount. Keep edit and delete actions accessible. **See exact split** reveals the stored shares in order.

## Settle and people

Place the next payment on a ruled slip beside current balances on wide screens. Name both participants, show the exact amount and explain that payment happens outside SettleUp. Payment history follows. At zero balance, show **Everyone is settled**.

The People slip holds the participant count, add action and roster. Keep names and edit or removal actions legible at narrow widths.

## Forms and dialogs

Inputs use 4px corners, a 1px border, and a 48px minimum height. Primary
buttons use a solid teal rectangle with a white label. Destructive confirmation
buttons use brick. Secondary actions use text or a plain outlined button.
Controls retain a 44px minimum target and visible focus.

Expense forms retain payer choice, included-person checkboxes, exact split
preview, remainder explanation, validation, and version-conflict handling.
Checkbox labels wrap into rows and keep an explicit checked indicator. Money
is never rounded or abbreviated for display.

Direct-link and edit forms use Radix dialogs. On desktop they are centered sheets. On
phones they attach to the bottom with a fixed submit footer while the form
body scrolls. The brief sheet entrance is removed with reduced motion.
Dismissal returns to the immediate parent route and restores the launcher
focus, or falls back to the workspace main region for a deep link.

Destructive confirmations remain separate AlertDialogs. Their body scrolls
inside safe-area-adjusted viewport bounds. Keep and Delete remain reachable
with enlarged text and short landscape viewports.

## States and accessibility

The server `EventSnapshot` and existing command and draft contracts remain
authoritative.
Live changes preserve open drafts, pause saving, and expose **Load latest**.
The status node remains atomic and polite. The longer offline or reconnect
notice is not another live region. Sharing retains native, clipboard, and
manual-copy fallbacks.

Dark mode applies to the landing form and all event pages. Semantic paper,
ink, divider, banner, error, and positive-balance tokens adapt together.
Forced colors use platform colors for active tabs, primary and destructive
buttons, the brand mark, and checked controls. Keyboard focus, form labels,
error announcements, reduced motion, 320px layouts, enlarged text, and short
viewports remain part of the browser verification contract.

Use [CONTRIBUTING.md](../../CONTRIBUTING.md#review-visual-changes) for browser
checks and screenshot commands. Inspect changed reference images alongside
behavior and accessibility results.

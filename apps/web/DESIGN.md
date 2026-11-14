---
name: SettleUp
description: A compact, private-by-link workspace for shared expenses.
colors:
  cream: "#faf8f1"
  ink: "#202521"
  teal: "#086766"
  teal-hover: "#075553"
  event-paper: "#efe5c9"
  input-paper: "#fffef9"
  muted-ink: "#535b50"
  soft-teal: "#e8eee5"
  divider: "#d0d5cb"
  control-border: "#a9afa3"
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
  square: "0"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
  button-primary-hover:
    backgroundColor: "{colors.teal-hover}"
    textColor: "#ffffff"
  input:
    backgroundColor: "{colors.input-paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
---

# SettleUp design system

The approved direction is **Compact original**. Cream paper, teal actions,
Barlow copy, League Gothic titles, and the Settle Cut mark preserve the existing
identity. Shorter headers, plain tabs, and simple rows give the shared costs
more space. [PRODUCT.md](PRODUCT.md) owns behavior and exclusions.

## Implementation owners

| Concern | Source |
| --- | --- |
| Palette, themes, fonts, focus, browser controls | [global.css](app/styles/global.css) |
| Create-event page | [home.tsx](app/routes/home.tsx), [home.module.css](app/styles/home.module.css) |
| Event header, lists, forms, dialogs | [app.module.css](app/styles/app.module.css) |
| Brand | [brand.module.css](app/styles/brand.module.css), [icons.tsx](app/components/icons.tsx) |
| Loading and errors | [root.module.css](app/styles/root.module.css) |
| Browser checks and reference images | [states.spec.ts](tests/e2e/states.spec.ts), [snapshots](tests/e2e/states.spec.ts-snapshots/) |

## Palette and type

Semantic custom properties in `global.css` own the palette. Light pages use
cream with dark green ink. A warm event banner groups the title, currency,
expiry, live state, and navigation. Teal identifies actions, the active tab,
and positive balances. Brick identifies errors and destructive commitments.
Text also states every balance and connection state so hue carries no meaning
alone.

League Gothic is self-hosted as `Session Display`. Use it for the landing
promise, event title, dialog titles, and the suggested payment amount. Barlow
is self-hosted as `Session Sans` at weights 400, 600, and 700. Body copy,
controls, participant names, and list amounts use Barlow. Money uses tabular
figures. Labels use sentence case.

The event title is 42px on desktop and 36px on phones. The landing promise is
64px on desktop and 54px on phones. Avoid oversized route titles, numbered
section markers, decorative text, clipped button edges, and background texture.

## Layout

Event pages share a centered 960px container. The compact top bar holds the
brand and **Share link**. The event banner follows with metadata and three peer
tabs, **Expenses**, **Settle**, and **People**. An underline and text color
identify the current tab. Navigation has no numbered index or descriptive
subtitles.

The main document uses 32px padding on desktop and 20px on phones. At narrow
widths metadata wraps, list actions move below content when necessary, and
names wrap while amounts remain readable. The page keeps native document
scrolling rather than a separate sidebar scroll area.

The landing page has a single 520px content column. It contains the short
promise, create-event form, link-access and three-day availability statements,
and a note that SettleUp records payments made elsewhere. The example expense,
numbered story panels, and repeated trust notes have been removed.

## Expenses

One inline **total spent** value sits beside **Add expense**. Currency and live
state appear once in the event banner. Expense count is not repeated in a
summary panel. The Expenses route heading and Recent activity section heading
remain available to assistive technology without duplicating the active tab.

Simple ruled rows show description, payer, included-person count, date, and
amount. **See exact split** expands the actual participant shares with native
`details` and `summary`. Edit and Delete remain visible with complete accessible
names at every width. Receipt plates and outer list boxes are removed.

The empty state has one **Add the first expense** action. The header action
appears after the first expense exists.

## Settle and people

The next suggested payment appears on one muted teal surface. Its heading
contains both participant names and the exact amount. A short instruction
states that payment happens outside SettleUp. The primary action opens the
existing payment form.

Balances use simple rows with **Gets**, **Owes**, or **Settled** labels. Recorded
payments retain their Add another, Edit, and Delete actions. The zero-balance
state explicitly says everyone is settled.

People shows the participant count, **Add person**, names, and existing edit
and removal controls. Balances live in Settle rather than appearing again in
People. Participant initials and decorative row icons are removed.

## Forms and dialogs

Inputs use square corners, a 1px border, and a 48px minimum height. Primary
buttons use a solid teal rectangle with a white label. Destructive confirmation
buttons use brick. Secondary actions use text or a plain outlined button.
Controls retain a 44px minimum target and visible focus.

Expense forms retain payer choice, included-person checkboxes, exact split
preview, remainder explanation, validation, and version-conflict handling.
Checkbox labels wrap into rows and keep an explicit checked indicator. Money
is never rounded or abbreviated for display.

Route forms remain Radix dialogs. On desktop they are centered sheets. On
phones they attach to the bottom with a fixed submit footer while the form
body scrolls. The brief sheet entrance is removed with reduced motion.
Dismissal returns to the immediate parent route and restores the launcher
focus, or falls back to the workspace main region for a deep link.

Destructive confirmations remain separate AlertDialogs. Their body scrolls
inside safe-area-adjusted viewport bounds. Keep and Delete remain reachable
with enlarged text and short landscape viewports.

## States and accessibility

The server `EventSnapshot` and existing command and draft contracts remain
authoritative. This visual change introduces no new application state model.
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

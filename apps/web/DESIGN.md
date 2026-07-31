---
name: SettleUp
description: A quick, private-by-link way to split shared expenses and settle up.
colors:
  session-mustard: "#e0b12e"
  ink-black: "#0b0b0b"
  cut-teal: "#0e7c7b"
  field-teal: "#075f5e"
  brick-beat: "#b23a2e"
  poster-cream: "#f2e8d1"
  paper-bright: "#fff9e8"
  paper-hover: "#fffdf5"
  muted-ink: "#655e50"
  muted-on-ink: "#d7cab0"
  spine-hover: "#25231e"
  ink-on-mustard: "#3f370f"
  dialog-scrim: "rgb(11 11 11 / 78%)"
typography:
  display:
    fontFamily: '"Session Display", Impact, sans-serif'
    fontSize: "clamp(4.8rem, 8vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.82
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Session Display", Impact, sans-serif'
    fontSize: "clamp(3.2rem, 5vw, 5rem)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  title:
    fontFamily: '"Session Display", Impact, sans-serif'
    fontSize: "clamp(2rem, 3vw, 2.7rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  body:
    fontFamily: '"Session Sans", Arial, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: '"Session Sans", Arial, sans-serif'
    fontSize: "0.74rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.115em"
rounded:
  square: "0"
  control: "2px"
spacing:
  tight: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.brick-beat}"
    textColor: "{colors.poster-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "11px 22px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.session-mustard}"
    textColor: "{colors.ink-black}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "11px 22px"
    height: "56px"
  input:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink-black}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "48px"
  chapter-marker:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.session-mustard}"
    typography: "{typography.title}"
    rounded: "{rounded.square}"
    height: "38px"
    width: "38px"
---

# Design System: SettleUp

This file is the current visual contract for the frontend, not a redesign
history. `PRODUCT.md` owns product truth and exclusions; CSS tokens, semantic
components, and tested browser snapshots are the implementation source of
truth when this prose needs verification.

## Overview

**Creative North Star: "The Shared Session"**

SettleUp treats each short-lived occasion as a vivid shared session: several
people arrive with different costs, the product brings those lines into exact
alignment, and the group leaves with one clear next move. The visual world draws
from screen-printed gig posters and jazz-session title cards without borrowing
character art or entertainment-brand imagery.

The landing surface uses this world at full volume. Flat color fields,
deliberate type collisions, numbered chapter markers, and hard asymmetric cuts
give it social energy that ordinary finance software avoids. Operational
screens translate the same grammar into calmer strips, strong number alignment,
decisive state blocks, and sparse color cuts so expression never obscures a
task.

**Key Characteristics:**

- Mustard, brick, teal, cream, and ink-black used as large committed fields
- Oversized condensed display type paired with a plain, highly legible sans
- Numbered session markers and hard bars that make sequence instantly visible
- A hard-edged Settle Cut stamp that resolves two ledger bands into one S-channel
- Flat screen-print depth: overlapping fields and rules instead of soft shadows
- Exact money shown in crisp tabular figures, never distressed or ornamental
- One orchestrated hard-cut entrance with a complete reduced-motion state

## Colors

The palette behaves like a five-ink screen-print set. One color owns each major
field; the others create cuts, contrast, or state.

### Primary

- **Session Mustard** (`#e0b12e`): leading expressive field, primary call to
  action on ink, and large chapter plate.
- **Ink Black** (`#0b0b0b`): grounding field, primary text, hard rules, and
  control edges.

### Secondary

- **Cut Teal** (`#0e7c7b`): directional bars, connection, focus, and exact
  figures on cream.
- **Field Teal** (`#075f5e`): the darker accessible teal field used behind
  cream navigation labels and other small reversed text.
- **Brick Beat** (`#b23a2e`): sequence markers, the primary create action, and
  urgent emphasis when its meaning is also stated in text.

### Neutral

- **Poster Cream** (`#f2e8d1`): readable paper field, form panel, and reversed
  text on ink.
- **Paper Bright** (`#fff9e8`): input fill on cream.
- **Paper Hover** (`#fffdf5`): the small interactive lift for light inputs.
- **Muted Ink** (`#655e50`): secondary copy on light paper only.
- **Muted on Ink** (`#d7cab0`): secondary reversed copy on the dark landing
  field.
- **Spine Hover** (`#25231e`): the event-register hover field.
- **Ink on Mustard** (`#3f370f`): accessible secondary copy on the settlement
  field.
- **Dialog Scrim** (`rgb(11 11 11 / 78%)`): the route-sheet and confirmation
  backdrop.

**The Field Before Accent Rule.** Color owns complete regions. Do not scatter
mustard, teal, and brick across neutral cards as small decorative accents.

**The Ledger Meaning Rule.** Product states stay understandable without hue.
Brick and teal may reinforce a state only after text, structure, or an
accessible label establishes its meaning.

**The Token Ownership Rule.** Authored palette literals belong in the global
token layer. Brand, landing, root, and event CSS consume semantic custom
properties; forced-colors adaptations use platform system colors.

## Typography

**Display Font:** League Gothic, self-hosted as `Session Display` (with Impact
and sans-serif fallbacks)

**Body Font:** Barlow, self-hosted as `Session Sans` (with Arial and sans-serif
fallbacks)

**Character:** League Gothic supplies compressed title-card force. Barlow keeps
instructions, form controls, names, and money familiar and exceptionally
readable.

### Hierarchy

- **Display** (400, `clamp(4.8rem, 8vw, 6rem)`, 0.82): one landing promise,
  uppercase, with deliberate line breaks.
- **Headline** (400, `clamp(3.2rem, 5vw, 5rem)`, 0.86): major story chapters.
- **Title** (400, `clamp(2rem, 3vw, 2.7rem)`, 0.95): forms and singular next
  steps.
- **Body** (400, `1rem`, 1.45): primary copy, normally limited to 54–70
  characters.
- **Label** (700, `0.74rem`, `0.115em`, uppercase): field labels, metadata, and
  short directional notes.
- **Money** (League Gothic or Barlow with tabular figures): exact values with
  stable alignment and no texture.

**The Sharp Figures Rule.** Grain and distressed edges never touch inputs,
labels, errors, names, or money.

**The One Collision Rule.** One expressive title collision may lead a surface.
Utility copy never competes with it.

## Layout

The landing page is a full-width sequence of color plates divided by one-pixel
rules. Its first viewport is an asymmetric split frame: a flexible promise
panel beside a creation panel with a `390px` minimum desktop width. An exact
split rail then crosses the page as the proof point. Content padding scales from
`18px` on mobile to `64–76px` on large screens.

At `1120px`, nonessential masthead copy and the split cue collapse. At `860px`,
the hero becomes one column and the split rail reflows to four columns. At
`620px`, it becomes a two-column ledger, the story steps stack, and the title
scale relaxes. Every control remains at least `44px` high and the composition is
complete at `320px`.

### Operational Split Spine

Event routes use a compact side-car register rather than the landing page’s
persuasive split frame. At `820px` and above, a `224–272px` ink spine stays in
view while the active route occupies a flexible cream document up to `1180px`.
The spine holds only event identity, sharing, expiry/live state, and the three
peer sections. Its `01–03` labels behave as a document index, never as a
required sequence.

Below `820px`, the spine becomes a short stacked folio: ink masthead, mustard
event identity, lifecycle strip, then a sticky three-cell section index. The
active document begins immediately afterward. Expenses use a four-cell data
ribbon that becomes `2 × 2`; ledger rows move secondary actions onto a second
line before they ever force horizontal scrolling.

The spine keeps the physical five-ink palette in both themes. In dark mode the
working paper inverts to near-black with cream type and rules, while mustard,
teal, and brick retain their established meanings.

**The Hard-Cut Rhythm Rule.** A major change in topic earns a field cut, rule,
or numbered plate. Empty whitespace alone does not carry the hierarchy.

## Elevation & Depth

The system is flat by design. Depth comes from one field crossing another,
clipped diagonal bars, hard rules, and a subtle generated print-grain layer on
large backgrounds. Routine surfaces use no ambient or diffuse shadow. Focus
rings may lift through a crisp offset outline because they communicate active
interaction.

**The Printed-Flat Rule.** Surfaces are flat at rest. Use field contrast,
borders, and offset geometry before adding elevation.

## Shapes

Forms are rectangular and cut like poster plates: square corners by default,
`2px` rounding on native inputs, and a pointed clipped edge on the primary
action. The brand stamp clips its top-left and bottom-right corners to carry the
same cut-paper silhouette at icon scale. Chapter markers are square. Circles
remain reserved for people and status; the system avoids finance-app pills and
soft floating panels.

## Components

### Primary Button

- **Landing shape:** square (`0`) with a `20px` pointed right edge and `56px`
  minimum height, compacting to `52px` below `620px`.
- **Operational shape:** square (`0`) with a `12px` pointed right edge at the
  `44px` touch floor.
- **Default:** Brick Beat field and Poster Cream uppercase label.
- **Hover:** Session Mustard with Ink Black text.
- **Focus:** landing uses a `4px` Cut Teal outline; operational actions use the
  shared `3px` focus token, which becomes Session Mustard in dark mode.
- **Active:** a `2px` downward press.
- **Disabled:** retains its structure at `0.65` opacity with a wait cursor.

### Inputs and Selects

- **Shape:** `1px` Ink Black border and `2px` radius. Operational controls and
  default landing controls are `48px` high; the landing form compacts to `46px`
  below `620px`, remaining above the `44px` interaction floor.
- **Fill:** Paper Bright, warming to near-white on hover.
- **Focus:** landing inputs use a crisp cream separation ring inside a Cut Teal
  outer ring. Operational inputs use the shared `3px` theme focus outline with
  a `2px` offset, becoming Session Mustard in dark mode. Neither uses ambient
  glow.
- **Error:** Brick Beat rectangular message with Poster Cream copy and a live
  region.

### Landing Masthead

- **Style:** Ink Black bar with the Settle Cut stamp, cream wordmark, and compact
  uppercase trust notes.
- **Responsive:** secondary trust notes progressively disappear; product
  identity and “No accounts” remain.

### Brand Mark

- **Geometry:** a stroke-free `32 × 32` poster plate with opposing clipped
  corners. Two cream ledger bands lock into an S-shaped channel.
- **Color:** Cut Teal field, Poster Cream bands, and one nonessential Session
  Mustard remainder block.
- **Meaning:** two sides resolve into one aligned settlement; the remainder
  block recalls the deterministic extra cent without implying money transfer.
- **Sizing:** use the complete mark at `29–32px`; the same silhouette remains
  legible as a `16px` favicon.
- **Lockup:** pair with the Barlow `SettleUp` wordmark and preserve the `44px`
  brand-link target.
- **Accessibility:** the SVG is decorative inside the labelled home link.
  Forced-colors mode remaps the three inks to system colors.

### Exact Split Rail

- **Style:** a ruled Poster Cream ledger that shows a total, four tabular share
  figures, and the deterministic remainder rule.
- **Responsive:** seven desktop tracks become four at tablet width and two at
  mobile width without hiding the arithmetic.

### Chapter Marker

- **Style:** `38px` Ink Black square with a Session Mustard League Gothic
  numeral.
- **Use:** makes a short, real sequence explicit; never implies saved history.

### Event Register

- **Style:** sticky ink spine, mustard event folio, cream lifecycle rows, and
  one full-field Field Teal current section with a mustard inset marker.
- **Content:** Settle Cut lockup, Share, title, currency, expiry/live state,
  and Expenses/Settle/People only. No owner, role, archive, or invitation
  controls.
- **Live state:** Connected, reconnecting, and offline changes reuse one stable
  atomic status node. The longer reconnect notice remains non-live so the same
  transition is not announced twice.
- **Responsive:** persistent on desktop; stacked above a sticky peer-section
  index below `820px`.

### Operational Data Ribbon

- **Style:** one ruled register, never separate cards. Labels use Barlow;
  values use sharp League Gothic tabular figures.
- **Use:** exposes exact section-level facts such as total spent, expense
  count, currency, and current connection state.
- **Responsive:** four desktop cells become two rows of two without hiding or
  abbreviating values.

### Ledger Rows

- **Style:** one square outer rule and continuous row dividers. Descriptions
  and names wrap; money owns a stable tabular column; edit/delete controls stay
  explicit.
- **Actions:** below `820px`, Edit and Delete labels stay visible beside their
  icons. Desktop keeps compact icon actions with complete accessible names and
  title text.
- **Disclosure:** exact expense shares remain native `details`/`summary`
  content, not a chevron to a nonexistent detail page.
- **People:** circles are reserved for participant initials and live status;
  expense/payment glyphs use square ink plates.

### Empty Expenses

- **Action:** the empty document contains one “Add the first expense” action.
  The page-header action appears only after at least one expense exists, so the
  first-use state never presents duplicate commitments.

### Route Sheet

- **Style:** square paper sheet with a mustard top rule, hard title divider,
  and no blur, ambient shadow, pill handle, or rounded bottom-sheet chrome.
- **Behavior:** Radix focus trapping remains authoritative. Dismissal resolves
  to the sheet’s immediate Expenses, Settle, or People parent rather than the
  event index. A launcher-opened sheet returns focus to that launcher; a direct
  deep link falls back to the event workspace main region.
- **Mobile:** the submit commitment remains visible in a fixed ruled footer
  while the form body scrolls behind it.
- **Loading boundary:** route sheets and destructive confirmations remain
  separate implementations. The lightweight delete trigger keeps AlertDialog
  out of the initial list-route graph, preloads it on pointer or keyboard
  intent, and mounts it only when confirmation is requested.

### Destructive Confirmation

- **Containment:** the square AlertDialog remains inside safe-area-adjusted
  viewport bounds and scrolls internally when content or text scaling exceeds
  the available height.
- **Commitments:** Keep and Delete stay reachable at 200% text and in short
  landscape viewports. Closing returns focus to the triggering delete control.

## Accessibility and State Adaptation

- **Responsive floor:** compositions must remain complete at `320px` without
  horizontal scrolling. Labels and primary actions stay visible; secondary
  ledger metadata wraps or moves to another row. Portable `200%` zoom,
  `200%` text, and short landscape viewports keep their primary controls and
  dialog commitments usable.
- **Dark mode:** the operational paper inverts while the five-ink identity
  remains recognizable. Contrast is rechecked rather than assumed from the
  light palette.
- **Forced colors:** brand inks, the event register, active navigation,
  settlement fields, buttons, and checked controls map to system colors. State
  and current location remain visible without relying on authored hue.
- **Reduced motion:** remove the hard-cut entrance and route transitions while
  preserving the final composition and focus movement.
- **Visual verification:** Chromium snapshots cover landing, root-error, and
  event-route states at mobile and desktop sizes. The same semantic flows,
  overflow checks, Axe checks, responsive stress cases, dark mode, and
  forced-colors behavior run in mobile and desktop Chromium, desktop Firefox,
  and mobile WebKit.

## Do's and Don'ts

### Do:

- **Do** let one saturated field dominate each major composition.
- **Do** demonstrate exact splitting with real arithmetic and clearly identify
  it as illustrative.
- **Do** keep form controls, financial figures, and utility copy sharp.
- **Do** preserve semantic controls, native select behavior, `44px` touch
  targets, visible focus, reduced motion, and WCAG 2.2 AA contrast.
- **Do** use the complete Settle Cut mark and Barlow wordmark as one consistent
  lockup across persuasive and operational surfaces.
- **Do** translate the world more quietly on operational routes while keeping
  its rules, numbering, and color-field logic recognizable.

### Don't:

- **Don't** use anime characters, instruments, or borrowed entertainment
  imagery; the title-card grammar is the system, not the subject matter.
- **Don't** distress core UI text, financial figures, or control edges.
- **Don't** turn every section into a rounded, shadowed card.
- **Don't** introduce gradients, glass, neon glow, confetti, or generic fintech
  dashboard chrome.
- **Don't** redraw the mark as exchange arrows, currency, a wallet, a chain
  link, or a rounded fintech-app tile.
- **Don't** use chapter numbers in a way that implies unsupported workflow steps
  or persistent event history.

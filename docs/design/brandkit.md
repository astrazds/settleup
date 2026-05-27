# SettleUp Product Brandkit

SettleUp helps people settle the shared cost without turning it into admin.

This is a product brandkit. It defines the working identity, UI tokens, copy voice, and mockup direction for the app experience. It is not a marketing campaign system.

## Brand Position

SettleUp is for short-lived shared-cost Events: dinners, weekend trips, parties, and errands. The brand should feel quick, calm, and socially comfortable. It should make money state clear without making the Event feel like accounting software.

## Scene

Three friends are standing outside a restaurant at night. One person is entering the last receipt on a phone while the group chat is still active and everyone wants to leave.

Design consequences:

- Clear light surface with controlled brightness.
- Warm paper neutrals instead of sterile white.
- Ledger green for action and resolved state, not fintech green.
- Compact scanning, not dashboard ceremony.
- Copy that is blunt about link access and calm about money.

## Logo

Primary lockup: code-native mark plus `SettleUp`.

Compact lockup: mark only.

Fallback: text-only `SettleUp`.

The mark uses two aligned horizontal strokes. It suggests settling without using generic money imagery.

Avoid:

- coins
- dollar signs
- wallets
- bank symbols
- calculators
- receipt mascots
- taglines inside the lockup
- AI-generated bitmap assets

## Color Tokens

Use OKLCH tokens.

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `oklch(97.5% 0.008 82)` | Page background |
| `sheet` | `oklch(99% 0.005 82)` | Main panels and form surfaces |
| `wash` | `oklch(94.5% 0.012 82)` | Subtle bands and secondary surfaces |
| `ink` | `oklch(22% 0.018 70)` | Primary text |
| `muted` | `oklch(49% 0.02 70)` | Secondary text |
| `rule` | `oklch(84.5% 0.014 82)` | Dividers and borders |
| `ledger` | `oklch(46% 0.12 157)` | Primary action, positive state |
| `ledgerDeep` | `oklch(35% 0.11 157)` | Action hover, strong positive text |
| `clay` | `oklch(49% 0.13 31)` | Error and owes state |
| `amber` | `oklch(67% 0.12 78)` | Pending or warning state |
| `focus` | `oklch(62% 0.16 157)` | Focus ring |

Avoid blue/purple gradients, neon money cues, beige SaaS wash, and finance-app navy.

## Typography

Use system sans-serif:

```css
-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
```

Scale:

- Page title: `28px / 1.15`, 750 weight
- Section title: `17px / 1.2`, 720 weight
- Body: `15px / 1.45`, 400 weight
- Label: `12px / 1.2`, 700 weight
- Amount: tabular numeric, 720 weight

Use fixed sizes, not viewport-scaled type.

## Shape And Layout

Use a receipt-grid shape language:

- rows
- dividers
- subtotal-like bands
- aligned amount columns
- compact grouped forms

Use panels only for true task regions. Repeated records should read as ledger rows, not floating cards.

Spacing scale:

| Token | Value | Use |
| --- | --- | --- |
| `spaceSm` | `10px` | Tight component groups and compact metadata |
| `spaceMd` | `14px` | Form fields, ledger stacks, and nearby panels |
| `spaceLg` | `20px` | Screen padding and major form grouping |
| `spaceXl` | `28px` | Mockup rows and state comparison gaps |
| `space2xl` | `40px` | Page-level separation |
| `space3xl` | `56px` | Bottom breathing room and artifact endings |

Radius:

- panels and controls: `8px`
- small tags, compact marks, and state chips: `4px`

Mockup layout:

- Create Event and Populated Event are full-width anchor states.
- Empty Event pairs with Settle Up State so starting and resolving an Event can be compared.
- Mobile Event pairs with Interaction States so responsive behavior and component states can be reviewed together.
- The create surface is centered on the form. Brand copy stays compact and does not turn into a marketing hero.

## Copy Voice

Concise, practical, low-drama.

Use:

- `Alex owes $24.00`
- `Sarah is owed $24.00`
- `Record Settlement Payment`
- `Everyone is settled.`
- `Anyone with this link can view and edit.`

Avoid:

- `debt`
- `pay back`
- `tab`
- `split squad`
- cute group-money phrasing
- guilt or shame language

## Component Rules

- Buttons use familiar product UI affordances.
- Primary buttons use ledger green.
- Secondary buttons are neutral with full borders.
- Destructive buttons use clay text and quiet clay border.
- Form controls have visible labels and stable 40px minimum height.
- Validation errors appear near the relevant form.
- Focus rings are visible and use the focus token.
- Empty states teach the next action, not just absence.
- Motion is optional and should only communicate state.

## Mockup Coverage

The canonical mockup set is in [mockups.html](./mockups.html):

- Create Event
- Empty Event after creation
- Populated Event with Expenses and Balances
- Settle Up state with Suggested Settlements
- Mobile Event page
- Interaction state strip

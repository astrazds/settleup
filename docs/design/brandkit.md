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
| `ledgerWash` | `oklch(94.5% 0.035 157)` | Positive row tint and current Participant tint |
| `ledgerRule` | `oklch(78% 0.055 157)` | Positive/current hairline border |
| `clay` | `oklch(49% 0.13 31)` | Error and owes state |
| `clayDeep` | `oklch(38% 0.12 31)` | Strong error and owes text |
| `clayWash` | `oklch(95% 0.028 31)` | Error and owes row tint |
| `clayRule` | `oklch(78% 0.055 31)` | Error hairline border |
| `amber` | `oklch(67% 0.12 78)` | Pending or warning state |
| `amberDeep` | `oklch(43% 0.095 78)` | Strong warning and pending text |
| `amberWash` | `oklch(94.5% 0.035 78)` | Privacy note and Suggested Settlement tint |
| `amberRule` | `oklch(80% 0.065 78)` | Warning hairline border |
| `focus` | `oklch(62% 0.16 157)` | Focus ring |

Avoid blue/purple gradients, neon money cues, beige SaaS wash, and finance-app navy.

## Typography

Use system sans-serif:

```css
-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
```

Type scale:

| Token | Value | Use |
| --- | --- | --- |
| `textCaption` | `0.75rem` | Labels, chips, and eyebrows |
| `textSmall` | `0.875rem` | Secondary copy, captions, and row details |
| `textBody` | `1rem` | Body text, controls, and ledger rows |
| `textSubheading` | `1.125rem` | Section headings |
| `textHeading` | `1.5rem` | Event titles and screen headings |
| `textDisplay` | `1.875rem` | Artifact title and create-flow promise |

Use fixed `rem` sizes, not viewport-scaled type.

Weight roles:

- `400`: body text
- `700`: headings, labels, and row names
- `750`: brand, display headings, and amounts

Use tabular numerals for money amounts so columns align.

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
- Current Participant indicators use ledger wash and ledger text.
- Owed rows use ledger wash; owes rows use clay wash and clay text.
- Suggested Settlement rows use amber wash until a Settlement Payment is recorded.
- Private-by-link notes use amber wash because they are cautionary, not decorative.
- Current Participant copy should say `Expense defaults` or `defaults`, not account or permission language.
- Share forms should include a summary for total, assigned, and remaining amounts, plus an Equal split recovery action.
- Interaction state mockups should include saving, active, hover, disabled with reason, validation recovery, edit, delete confirmation, copied feedback, and refresh feedback.
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

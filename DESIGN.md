# SettleUp Design Notes

SettleUp is product UI. Design serves fast group expense entry at a table, in a group chat context, or on a phone during a trip. The interface should feel quiet, trustworthy, and direct.

## Register

Product.

## Brandkit Scope

SettleUp uses a product brandkit, not a campaign or marketing brandkit. The brandkit should define design tokens, wordmark direction, icon/shape language, UX copy tone, and product mockups for the create Event flow, empty Event, populated Event, mobile Event, and settled state.

The brandkit should not include marketing hero systems, social media assets, brand manifestos, or ad-style illustrations until the product needs a public marketing surface.

## Brand Promise

SettleUp helps people settle the shared cost without turning it into admin.

This promise should keep the interface fast, low-ceremony, socially comfortable, and clear about money without feeling like accounting software.

## Wordmark Direction

Use a plainspoken text-first wordmark: `SettleUp`.

Avoid coin icons, dollar signs, wallets, bank symbols, calculators, receipt mascots, and other generic money-app imagery. If a symbol is needed, use a subtle settling cue such as two short horizontal strokes aligning or a balanced pair of simple blocks.

The wordmark must work as small app navigation text and as inspiration for a future app icon.

Do not use AI-generated bitmap assets for the product brandkit. Use a code-native mark in CSS or SVG so the identity remains small, inspectable, and easy to reuse as a favicon or app icon later.

Logo lockups:

- Primary: code-native mark plus `SettleUp`
- Compact: mark only
- Fallback: text-only `SettleUp`

Do not include a tagline inside the lockup.

## Copy Voice

Use concise, practical, low-drama copy. Money between friends is socially sensitive, so the interface should sound calm and direct.

Avoid shame/debt language and cute group-money phrasing. Do not use terms like "split squad", "tab", "debt", or "pay back" in product UI. Prefer glossary language such as "Alex owes $24", "Sarah is owed $24", "Record Settlement Payment", and "settled".

Privacy copy should be blunt: "Anyone with this link can view and edit."

## Visual System

Scene: three friends are standing outside a restaurant at night, one person is entering the last receipt on a phone while the group chat is still active and everyone wants to leave.

The theme should use a clear light surface with controlled brightness, warm tinted paper neutrals, and quiet contrast. Do not make the app dark-mode-first, sterile white, or finance-blue by default.

- Use system sans-serif typography for native platform feel.
- Use a restrained light theme with warm tinted neutrals and ledger green, not fintech green, for primary actions and positive state.
- Use ink-like dark brown or charcoal for text, clay red for negative/error state, and muted amber for warning or pending state.
- Avoid blue or purple gradients, neon money cues, and beige SaaS wash.
- Use a receipt-grid shape language: rows, dividers, subtotal-like bands, and compact grouped forms rather than repeated floating cards.
- Use alignment as a brand cue. Money amounts should line up, and settlement rows should visually resolve left-to-right.
- Use explicit semantic state classes for money rows when implementing the UI, such as positive and negative row states. Do not depend on CSS parent selectors for core money-state styling if simple classes are clearer.
- Keep cards to actual panels and repeated records; do not nest cards.
- Use 8px border radii for panels, buttons, and controls.
- Keep body copy compact and task-focused.
- Avoid decorative motion, decorative gradients, glass effects, and marketing hero treatment.

## Layout

- The first screen is the create Event form.
- The create Event page is form-first with a brand header. Do not use a hero section, feature grid, stock imagery, or marketing composition. Use a compact brand lockup, one sentence promise, and a privacy note below the form.
- The Event page uses a top summary and two-column desktop layout.
- On mobile, the Event page collapses to a single column.
- Separate sections are used for Balances, Suggested Settlements, Expenses, Settlement Payments, Participants, and Event Link sharing.
- Balance wording should say "is owed", "owes", or "is settled" instead of relying on signed numbers.
- Use medium product density. Desktop should use compact rows, aligned amounts, and fewer large empty panels. Mobile should keep generous tap targets without marketing-scale spacing. Forms should be dense but legible, with progressive sections. Records should be scan-first and row-based, not card-heavy.
- On the Event page, Balances are visually dominant and Add Expense is the close second. Suggested Settlements become prominent when Balances are non-zero and the group is ready to settle.
- In an empty Event with only one Participant, make adding Participants the clearest next action before the first shared Expense. Keep this as contextual guidance, not an onboarding wizard.
- When the group is ready to settle, Suggested Settlements should shift from secondary explanation to primary action. The UI must still make clear that a Suggested Settlement is only recorded history after someone records a Settlement Payment.
- Settlement focus should be a user-controlled mode or action, not an automatic state. It should emphasize Suggested Settlements without implying the Event is locked or that the current Participant has special permission.
- Settlement focus should stay on the Event page. Use layout and action emphasis to bring Suggested Settlements forward while keeping Expense capture and Event context reachable.
- Recording a Suggested Settlement should expand or reveal inline confirmation with sender, recipient, amount, and a final "Record Settlement Payment" action. Avoid one-click saved history and avoid forcing users back through the generic form for the common settlement path.
- Suggested Settlement confirmation should keep the suggested amount visible and make the recorded amount editable. Partial payments and overpayments should feel deliberate, not hidden behind the generic Settlement Payment form.
- After recording a Settlement Payment, refresh the visible Balances and Suggested Settlements instead of showing progress on the old suggestion. Suggested Settlements are current recommendations, not checklist items.
- A future copyable settlement summary should be plain and group-chat-friendly. It should not look like a report, receipt, export center, or print workflow.
- Use a named spacing scale for product rhythm. Related controls should group tightly, while distinct states and mockup frames should have visibly larger gaps.
- Touch and narrow-screen controls should use at least 44px hit areas. Desktop controls may stay denser where pointer input and repeated data entry benefit from compactness.
- In design artifacts, use full-width anchor states for Create Event and Populated Event, then pair smaller state comparisons such as Empty Event with Settle Up and Mobile Event with Interaction States.
- On narrow screens, mockup headers stack title and description. Do not force secondary explanatory text into the same row when it causes cramped wrapping.
- The create Event mockup should stay centered on the form surface. Supporting brand copy may sit above the form, but it must not become a split hero or feature pitch.

## Mockup Set

Create one canonical visual direction and vary by product state rather than exploring unrelated aesthetics.

Required mockups:

- Create Event
- Empty Event after creation
- Populated Event with Expenses and Balances
- Settle Up state with Suggested Settlements
- Mobile Event page
- Interaction state strip covering default, hover, focus, disabled, validation error, settled success row, owes row, and copied Event Link feedback

Mockups should be built as a standalone HTML artifact before redesigning the live app. Use `docs/design/mockups.html` for state mockups and `docs/design/brandkit.md` for the product brandkit. The mockup page should reuse tokens that can later be moved into the live UI.

The mockup artifact should be laid out as a product review board, not a marketing page. It should make the main task states easy to compare, keep secondary states paired, and preserve the receipt-grid rhythm through rows, dividers, and aligned amounts.

Use realistic sample data in mockups. Default scenario: Event Title "Sydney weekend", Currency AUD, Participants Sarah, Alex, Priya, and Marco, with realistic Expenses such as Dinner, Ferry tickets, Groceries, and Petrol. Avoid placeholder-only mockups.

## Interaction Rules

- Draft forms must survive realtime and fallback polling refreshes.
- Realtime refreshes should feel quiet and useful: show connection status compactly, refresh saved Event state in place, and preserve draft forms. Polling fallback should use the same refresh feedback rather than a second visual system.
- Do not show named presence or viewer counts for now. Realtime status should communicate connection and update behavior, not who is currently viewing the Event.
- If realtime updates arrive while a draft or edit form is open, show a calm review warning near the active form. Do not block saving or introduce lock language.
- Realtime update copy should be neutral, such as "Event updated." Do not say which Participant made a change.
- Event Link sharing should be available, but the full token should not be prominent.
- User-provided text is rendered as plain text.
- Validation errors appear near the relevant form.
- Current Participant selection controls defaults only; it must not imply permissions.
- Current Participant UI should use defaults language such as "Expense defaults" or "defaults" rather than account, owner, or permission language.
- Return visits should make the remembered current Participant obvious before actions that create Expenses or Settlement Payments. The UI should support fast switching on shared devices without introducing account-like language.
- Use persistent current Participant context near money-changing forms rather than blocking confirmations. A shared-device user should be able to see and change the defaults quickly before saving.
- Custom Share entry should show total, assigned, and remaining amounts near the share inputs. Equal split should remain available as a recovery action.
- Uneven Share entry should start with Included Participants before exact Share amounts. The default flow is: choose who is included, equal-split among them, then override individual Share amounts only when needed.
- When a payer is selected for an Expense, that payer should be included by default. Removing the payer from Included Participants is an explicit correction, not the normal path.
- If the payer is not included in an Expense, show a calm warning near the Included Participants or Share summary. Do not block saving solely for this state.
- Use direct checkbox-style controls for Included Participants. Avoid making inclusion depend on removable Share rows alone; exact Share amount controls should follow the inclusion decision.
- The Included Participants control may allow a temporary empty draft state, but the form should clearly disable or block saving until at least one Participant is included.
- When editing an Expense, initialize Included Participants from the saved Shares for that Expense. New-Expense defaults should not overwrite saved inclusion.
- Keep exact Share amount inputs hidden until the user chooses to adjust Shares. The default included-Participant flow should show the equal Share result and a clear adjustment action instead of exposing per-person amount fields immediately.
- When exact Share amounts are visible, keep total, assigned, and remaining amounts prominent. Provide explicit helper actions for assigning remaining money to an Included Participant; do not silently redistribute adjusted Shares.
- Remaining-amount helpers should use generic, literal copy until stronger real-world patterns emerge. Avoid overloaded helper phrases that could blur Expense Shares with Settlement Payments.
- On mobile and in compact validation states, the total, assigned, and remaining summary should use separated label/value rows with dividers instead of a cramped multi-column grid.
- Interaction state mockups should include saving/loading, validation recovery, edit mode, delete confirmation, copied feedback, and refresh feedback.
- Mobile interaction states should stack as a single column. Button state examples may use a two-column grid, but edit and delete rows should stack copy above controls so labels and actions do not crowd each other.
- Product HTML should use explicit button and input types, visible or programmatic group labels, and valid ARIA only where it adds semantics.

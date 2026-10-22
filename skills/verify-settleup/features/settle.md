# Settle

Settle lets a person read who should pay whom next, record a payment that happened outside SettleUp, and see the balances change.

## Sub-features

- `settle-suggestion` shows the next payment from the saved expenses.
- `settle-record` records that payment from the suggestion.
- `settle-settled` shows that everyone is settled when the payment covers the suggestion.

## How to get to it (user POV)

- Open the event and choose **Settle**.
- Choose **Record payment** on the suggestion.
- Submit **Record payment** in the sheet.

## Driving it with Playwright

Preconditions:

- Doctor exits 0 for `http://127.0.0.1:5173`.
- The event `Verify weekend` exists with Mia and Noah.
- Dinner of `20.01` AUD is saved, paid by Mia, split between Mia and Noah. Mia's share is `$10.01` and Noah's share is `$10.00`, so Noah owes Mia `$10.00`.
- If that expense is missing, stop and say so. Do not invent a balance.

- **Open Settle.** Choose **Settle**. Run `page.getByRole("link", { name: "Settle", exact: true }).click()`. The heading reads `Noah pays Mia $10.00`.
- **Open the payment sheet.** Choose **Record payment**. Run `page.getByRole("link", { name: "Record payment" }).click()`. **From**, **To**, and **Amount** are filled. **Amount** reads `10.00`.
- **Record the payment.** Choose **Record payment**. Run `page.getByRole("button", { name: "Record payment" }).click()`. The heading **Everyone is settled** is visible.
- **Proof.** Capture the settled state. Run `page.screenshot({ path: "skills/verify-settleup/evidence/settle/settled.png" })` and write `page.locator("body").ariaSnapshot()` to `settled.aria.txt`. Read `GET /api/events/<token>` and keep the payment row in `snapshot.json` with the token redacted.

## Gotchas

- The suggestion amount depends on who paid. If Noah paid the dinner, the heading names Mia as the payer. Assert the heading that matches the saved expense.
- **Record payment** is both the link and the submit button. The link opens the sheet. The button inside the dialog saves it.
- Recording a payment does not move money. The proof is the settled heading and the stored payment row.

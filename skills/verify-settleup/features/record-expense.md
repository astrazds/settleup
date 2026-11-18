# Record an expense

Record an expense lets a person enter a cost, see the exact equal split before saving, and then see those same shares on the saved expense. Reloading and editing the description preserve the split.

## Sub-features

- `expense-open` shows the inline expense form in the ledger.
- `expense-preview` shows the exact split, including a remainder cent, before save.
- `expense-save` stores the expense and shows it in Recent activity.
- `expense-saved-split` opens the saved exact split.

## How to get to it (user POV)

- Create an event, add a second person from **People**, then open **Expenses**.
- Use the expense form above or beside recent activity.

## Driving it with Playwright

Preconditions:

- Doctor exits 0 for `http://127.0.0.1:5173`.
- The fresh database has no event titled `Verify weekend`.
- The bundled command is `node skills/verify-settleup/bin/verify-settleup.mjs drive record-expense`.

- **Create the event.** From `/`, enter the title, name, and currency. Run `page.getByLabel("What are you splitting?").fill("Verify weekend")`, `page.getByLabel("Your name").fill("Mia")`, `page.getByLabel("Currency").selectOption("AUD")`, and `page.getByRole("button", { name: "Create private event" }).click()`. The heading reads `Verify weekend`.
- **Add Noah.** Open **People**, then **Add person**. Run `page.getByRole("link", { name: "People" }).click()`, `page.getByRole("link", { name: "Add person" }).click()`, `page.getByLabel("Name").fill("Noah")`, and `page.getByRole("button", { name: "Add person" }).click()`. The text `Noah` is visible.
- **Open the expense form.** Go to **Expenses**. The form is already visible.
- **Enter the cost.** Type the description and amount. Run `page.getByLabel("What was it?").fill("Dinner")` and `page.getByLabel("Amount").fill("20.01")`. Open **Preview exact split** to see Mia with `$10.01` and then Noah with `$10.00`.
- **Save.** Choose **Save expense**. Run `page.getByRole("button", { name: "Save expense" }).click()`. **Recent activity** shows `Dinner`.
- **Open the saved split.** Choose **See exact split**. Run `page.getByText("See exact split", { exact: true }).click()`. The split matches the preview in names, amounts, and order.
- **Confirm the stored shares.** Read the event snapshot. Run `page.request.get("/api/events/<token>")` using the token from the expense URL. The shares list Mia with 1001 cents and then Noah with 1000 cents.
- **Reload and edit.** Reload the page and open the saved split. Open **Edit Dinner** and check that the preview still matches. Change the description to `Dinner and dessert` and select **Save changes**. Confirm that both the saved split and API response still list Mia and Noah in the same order with the same amounts.
- **Proof.** The drive prints the fresh output directory and writes `preview.png`, `preview.aria.txt`, `saved.png`, `saved.aria.txt`, `snapshot.json`, and `run.txt`.

## Gotchas

- The amount preview appears only after the amount parses. Assert **Exact split** after filling `20.01`, not before.
- Both people are included by default. The extra cent is shown on the first person in the list, Mia, as `$10.01`.
- A preview without the saved snapshot does not prove the ledger stored the shares.

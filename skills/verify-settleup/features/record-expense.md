# Record an expense

Record an expense lets a person enter a cost, see the exact equal split before saving, and then see those same shares on the saved expense.

## Sub-features

- `expense-open` opens the new-expense sheet from the empty state.
- `expense-preview` shows the exact split, including a remainder cent, before save.
- `expense-save` stores the expense and shows it in Recent activity.
- `expense-saved-split` opens the saved exact split.

## How to get to it (user POV)

- Create an event, add a second person from **People**, then open **Expenses**.
- Choose **Add the first expense**.
- On an event that already has an expense, choose **Add expense**.

## Driving it with Playwright

Preconditions:

- Doctor exits 0 for `http://127.0.0.1:5173`.
- The fresh database has no event titled `Verify weekend`.
- The bundled command is `node skills/verify-settleup/bin/verify-settleup.mjs drive record-expense`.

- **Create the event.** From `/`, enter the title, name, and currency. Run `page.getByLabel("What are you splitting?").fill("Verify weekend")`, `page.getByLabel("Your name").fill("Mia")`, `page.getByLabel("Currency").selectOption("AUD")`, and `page.getByRole("button", { name: "Create private event" }).click()`. The heading reads `Verify weekend`.
- **Add Noah.** Open **People**, then **Add person**. Run `page.getByRole("link", { name: "People" }).click()`, `page.getByRole("link", { name: "Add person" }).click()`, `page.getByLabel("Name").fill("Noah")`, and `page.getByRole("button", { name: "Add person" }).click()`. The text `Noah` is visible.
- **Open the first expense.** Go to **Expenses** and choose **Add the first expense**. Run `page.getByRole("link", { name: "Expenses" }).click()` and `page.getByRole("link", { name: "Add the first expense" }).click()`. A dialog is visible.
- **Enter the cost.** Type the description and amount. Run `page.getByLabel("What was it?").fill("Dinner")` and `page.getByLabel("Amount").fill("20.01")`. The dialog heading **Exact split** is visible, with `$10.01` and `$10.00`.
- **Save.** Choose **Add expense**. Run `page.getByRole("button", { name: "Add expense" }).click()`. **Recent activity** shows `Dinner`.
- **Open the saved split.** Choose **See exact split**. Run `page.getByText("See exact split", { exact: true }).click()`. **Recent activity** shows `$10.01` and `$10.00`.
- **Confirm the stored shares.** Read the event snapshot. Run `page.request.get("/api/events/<token>")` using the token from the expense URL. The shares sum to 2001 cents and include 1001 cents.
- **Proof.** The drive writes `skills/verify-settleup/evidence/record-expense/preview.png`, `preview.aria.txt`, `saved.png`, `saved.aria.txt`, `snapshot.json`, and `run.txt`.

## Gotchas

- The amount preview appears only after the amount parses. Assert **Exact split** after filling `20.01`, not before.
- Both people are included by default. The extra cent is shown on the first person in the list, Mia, as `$10.01`.
- The landing page also shows an illustrative dinner total. Scope the preview assertion to the dialog.
- **Add expense** in the page header is absent until the first expense exists. The empty state entry is **Add the first expense**.
- A preview without the saved snapshot does not prove the ledger stored the shares.

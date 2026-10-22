# Create a private event

Create a private event lets a person start a shared ledger with a title, their name, and a currency, then land on that event's expense page.

## Sub-features

- `create-open` shows the landing form.
- `create-save` creates the event and opens it.
- `create-currency` stores the currency the user chose.

## How to get to it (user POV)

- Open `http://127.0.0.1:5173/`.
- Fill **What are you splitting?**, **Your name**, and **Currency**, then choose **Create private event**.

## Driving it with Playwright

Preconditions:

- Doctor exits 0 for `http://127.0.0.1:5173`.
- The fresh database has no event titled `Verify weekend`.

- **Open the landing page.** Go to `/`. Run `page.goto("http://127.0.0.1:5173/")`. The heading **Everyone pays. Every cent lands.** is visible.
- **Enter the event.** Fill the form. Run `page.getByLabel("What are you splitting?").fill("Verify weekend")`, `page.getByLabel("Your name").fill("Mia")`, and `page.getByLabel("Currency").selectOption("AUD")`. **Create private event** is enabled.
- **Create the event.** Choose **Create private event**. Run `page.getByRole("button", { name: "Create private event" }).click()`. The URL matches `/e/…/expenses` and the level-1 heading reads `Verify weekend`.
- **Confirm the empty ledger.** Stay on the expense page. The link **Add the first expense** is visible.
- **Proof.** Capture the empty event. Run `page.screenshot({ path: "skills/verify-settleup/evidence/create-event/created.png" })` and `page.locator("body").ariaSnapshot({ timeout: 5000 })` into `created.aria.txt`. Both show `Verify weekend`.

## Gotchas

- The currency select defaults from the browser locale. Select `AUD` instead of trusting the default.
- The illustrative dinner total on the landing page is not an event. Proof starts after the URL is an event expense page.
- A second create with the same title is a second event. Use a fresh database when the title must be unique.

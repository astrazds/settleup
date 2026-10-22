# People

People lets a person add someone to the event and rename them. The new name shows on later expenses and settlement.

## Sub-features

- `people-add` adds a participant from the people page.
- `people-rename` changes that participant's name.

## How to get to it (user POV)

- Open the event and choose **People**.
- Choose **Add person**.
- Choose **Edit** next to a person's name.

## Driving it with Playwright

Preconditions:

- Doctor exits 0 for `http://127.0.0.1:5173`.
- The event `Verify weekend` exists and Mia is the only participant.
- No participant is named `Noah`.

- **Open People.** Choose **People**. Run `page.getByRole("link", { name: "People" }).click()`. The people section is visible and shows `Mia`.
- **Add Noah.** Choose **Add person**, enter the name, and save. Run `page.getByRole("link", { name: "Add person" }).click()`, `page.getByLabel("Name").fill("Noah")`, and `page.getByRole("button", { name: "Add person" }).click()`. The text `Noah` is visible and the dialog is gone.
- **Rename Noah.** Choose **Edit Noah**, change the name, and save. Run `page.getByRole("link", { name: "Edit Noah" }).click()`, `page.getByLabel("Name").fill("Noah K")`, and `page.getByRole("button", { name: "Save changes" }).click()`. The text `Noah K` is visible and `Noah` as an exact name is gone.
- **Proof.** Capture the people list. Run `page.screenshot({ path: "skills/verify-settleup/evidence/people/renamed.png" })` and write the ARIA snapshot to `renamed.aria.txt`. Read `GET /api/events/<token>` and keep the participant names in `snapshot.json` with the token redacted.

## Gotchas

- **Add person** is both the link and the submit button. The link opens the sheet. The button saves it.
- A person who is on an expense or payment cannot be removed. This recipe does not delete anyone.
- Renaming after an expense exists changes the displayed name of that person on the expense. Assert the name on the people page, then re-open the expense if the journey needs the updated label.

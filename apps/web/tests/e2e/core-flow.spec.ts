import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createEventResponseSchema, eventSnapshotSchema } from "@settleup/contracts";

test("creates, edits, settles, and cleans up a shared event", async ({
  browserName,
  hasTouch,
  page,
}) => {
  const suffix = Date.now().toString().slice(-6);
  const eventTitle = `Coast weekend ${suffix}`;

  if (browserName !== "chromium") {
    await page.addInitScript(() => {
      let clipboardText = "";

      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(navigator, "canShare", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          readText: () => Promise.resolve(clipboardText),
          writeText: (value: string) => {
            clipboardText = value;
            return Promise.resolve();
          },
        },
      });
    });
  }

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Everyone pays. Every cent lands.",
  );

  await page.getByLabel("What are you splitting?").fill(eventTitle);
  await page.getByLabel("Your name").fill("Mia");
  await page.getByRole("button", { name: "Create private event" }).click();

  await expect(page).toHaveURL(/\/e\/[^/]+\/expenses$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(eventTitle);
  const eventBasePath = new URL(page.url()).pathname.replace(/\/expenses$/, "");

  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByText("Private link copied.")).toBeAttached();
  await expect(page.evaluate(() => navigator.clipboard.readText())).resolves.toMatch(
    /\/e\/[^/]+$/,
  );

  await page.goto(`${eventBasePath}/people/new`);
  const directDialog = page.getByRole("dialog");
  await expect(directDialog).toBeVisible();
  await expect(directDialog.locator(":focus")).toHaveCount(1);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator("#main-content")).toBeFocused();

  await page.getByRole("link", { name: "People" }).click();
  const addPersonLink = page.getByRole("link", { name: "Add person" });
  if (hasTouch) {
    await addPersonLink.tap();
  } else {
    await addPersonLink.click();
  }
  await expect(page.getByRole("dialog")).toBeVisible();
  const closeDialogButton = page.getByRole("button", { name: "Close" });
  if (hasTouch) {
    await closeDialogButton.tap();
  } else {
    await closeDialogButton.click();
  }
  await expect(addPersonLink).toBeFocused();
  await addPersonLink.click();
  await page.getByLabel("Name").fill("Noah");
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByText("Noah", { exact: true })).toBeVisible();

  const editNoahLink = page.getByRole("link", { name: "Edit Noah" });
  await editNoahLink.press("Enter");
  await expect(page).toHaveURL(/\/people\/[^/]+\/edit$/);
  await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/people$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(editNoahLink).toBeFocused();

  await editNoahLink.click();
  await page.getByLabel("Name").fill("Noah K");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Noah K", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Expenses" }).click();
  await page.getByLabel("What was it?").fill("Dinner");
  await page.getByLabel("Amount").fill("40.00");
  const newExpense = page.getByRole("form", { name: "Add expense" });
  await newExpense.getByText("Preview exact split").click();
  await expect(
    newExpense.getByRole("heading", { name: "Exact split" }),
  ).toBeVisible();
  await expect(
    newExpense.getByText("$20.00", { exact: true }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Save expense" }).click();

  await expect(page.getByText("Dinner", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Recent activity").getByText("$40.00", { exact: true }),
  ).toBeVisible();
  await page.getByText("See exact split", { exact: true }).click();
  await expect(
    page.getByLabel("Recent activity").getByText("$20.00", { exact: true }),
  ).toHaveCount(2);

  await page.getByRole("link", { name: "Edit Dinner" }).click();
  await page.getByRole("dialog").getByLabel("What was it?").fill("Dinner and dessert");
  await page.getByRole("dialog").getByLabel("Amount").fill("50.00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Dinner and dessert", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Settle", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Noah K pays Mia $25.00",
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Record payment" }).click();
  await expect(page.getByLabel("From")).toHaveValue(/.+/);
  await expect(page.getByLabel("To")).toHaveValue(/.+/);
  await expect(page.getByLabel("Amount")).toHaveValue("25.00");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("heading", { name: "Everyone is settled" })).toBeVisible();

  const editPaymentLink = page.getByRole("link", {
    name: "Edit payment from Noah K to Mia",
  });
  const deletePaymentButton = page.getByRole("button", {
    name: "Delete payment from Noah K to Mia",
  });
  await expect(editPaymentLink.getByText("Edit", { exact: true })).toBeVisible();
  await expect(deletePaymentButton.getByText("Delete", { exact: true })).toBeVisible();

  await editPaymentLink.click();
  await expect(page).toHaveURL(/\/settle\/[^/]+\/edit$/);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/settle$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(editPaymentLink).toBeFocused();

  await editPaymentLink.click();
  await page.getByLabel("Amount").fill("20.00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Noah K pays Mia $5.00",
    }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Delete payment from Noah K to Mia" })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Noah K pays Mia $25.00",
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Expenses" }).click();
  await page
    .getByRole("button", { name: "Delete Dinner and dessert" })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nothing to split yet" })).toBeVisible();

  await page.getByRole("link", { name: "People" }).click();
  await page.getByRole("button", { name: "Delete Noah K" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Noah K", { exact: true })).toHaveCount(0);

  expect(page.url()).toContain(eventBasePath);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("adds a new participant to an existing expense", async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);

  await page.goto("/");
  await page
    .getByLabel("What are you splitting?")
    .fill(`Late participant ${suffix}`);
  await page.getByLabel("Your name").fill("Mia");
  await page.getByRole("button", { name: "Create private event" }).click();

  await page.getByLabel("What was it?").fill("Dinner");
  await page.getByLabel("Amount").fill("10.00");
  await page.getByRole("button", { name: "Save expense" }).click();

  await page.getByRole("link", { name: "People" }).click();
  await page.getByRole("link", { name: "Add person" }).click();
  await page.getByLabel("Name").fill("Noah");
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByText("Noah", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Expenses" }).click();
  await page.getByRole("link", { name: "Edit Dinner" }).click();

  const expenseDialog = page.getByRole("dialog");
  const noahCheckbox = expenseDialog.getByLabel("Noah", { exact: true });
  await expect(noahCheckbox).not.toBeChecked();
  await noahCheckbox.locator("xpath=following-sibling::label").click();
  await expect(noahCheckbox).toBeChecked();
  await expect(
    expenseDialog.getByRole("heading", { name: "Exact split" }),
  ).toBeVisible();
  await expect(
    expenseDialog.getByText("$5.00", { exact: true }),
  ).toHaveCount(2);

  await expenseDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/expenses$/);

  const recentActivity = page.getByLabel("Recent activity");
  await expect(
    recentActivity.getByText("split with 2 people", { exact: false }),
  ).toBeVisible();
  await recentActivity.getByText("See exact split", { exact: true }).click();
  await expect(
    recentActivity.getByText("$5.00", { exact: true }),
  ).toHaveCount(2);
});

test("reuses the quick slip and protects a draft through edits and live changes", async ({ page }) => {
  const created = await page.request.post("/api/events", {
    data: { title: "Trip lunches", currency: "AUD", firstParticipantName: "Mia" },
  });
  const { token } = createEventResponseSchema.parse(await created.json());
  await page.goto(`/e/${token}/expenses`);

  const slip = page.getByRole("form", { name: "Add expense" });
  const description = slip.getByLabel("What was it?");
  const amount = slip.getByLabel("Amount");
  const save = slip.getByRole("button", { name: "Save expense" });
  const ledger = page.getByRole("region", { name: "Recent activity" });
  await description.fill("Breakfast");
  await amount.fill("12.00");
  await save.click();
  await expect(ledger.getByText("Breakfast", { exact: true })).toBeVisible();
  await expect(description).toHaveValue("");

  await description.fill("Lunch");
  await amount.fill("20.01");
  await page.getByRole("link", { name: "Edit Breakfast" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(description).toHaveValue("Lunch");
  await expect(amount).toHaveValue("20.01");

  const changed = await page.request.post(`/api/events/${token}/participants`, {
    data: { name: "Noah" },
  });
  expect(changed.status()).toBe(201);
  await expect(save).toBeDisabled();
  await expect(description).toHaveValue("Lunch");
  await slip.getByRole("button", { name: "Load latest" }).click();
  await expect(description).toHaveValue("");
  await expect(slip.getByLabel("Noah", { exact: true })).toBeChecked();
  await description.fill("Lunch");
  await amount.fill("20.01");
  await save.click();
  await expect(ledger.getByText("Lunch", { exact: true })).toBeVisible();
  await expect(description).toHaveValue("");
  await expect(ledger.getByText("Breakfast", { exact: true })).toBeVisible();
});

test("receives event changes in another browser tab", async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);
  await page.goto("/");
  await page.getByLabel("What are you splitting?").fill(`Realtime ${suffix}`);
  await page.getByLabel("Your name").fill("Ari");
  await page.getByRole("button", { name: "Create private event" }).click();
  await page.getByRole("link", { name: "People" }).click();
  await expect(page).toHaveURL(/\/people$/);

  const secondPage = await page.context().newPage();
  await secondPage.goto(page.url());
  await secondPage.getByRole("link", { name: "Add person" }).click();
  await secondPage.getByLabel("Name").fill("Luca");
  await secondPage.getByRole("button", { name: "Add person" }).click();

  await expect(page.getByText("Luca", { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("link", { name: "Edit Ari" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await secondPage.getByRole("link", { name: "Edit Ari" }).click();
  await secondPage.getByLabel("Name").fill("Ari updated");
  await secondPage.getByRole("button", { name: "Save changes" }).click();

  await expect(
    page.getByText(
      "These details changed somewhere else while this form was open.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Load latest" }).click();
  await expect(page.getByLabel("Name")).toHaveValue("Ari updated");
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeEnabled();

  await secondPage.close();
});

test("keeps the exact split in saved order through reload and a description edit", async ({ page }) => {
  const created = await page.request.post("/api/events", {
    data: { title: "Dinner split", currency: "AUD", firstParticipantName: "Mia" },
  });
  expect(created.status()).toBe(201);
  const { token } = createEventResponseSchema.parse(await created.json());
  const eventPath = `/api/events/${token}`;
  const added = await page.request.post(`${eventPath}/participants`, { data: { name: "Noah" } });
  expect(added.status()).toBe(201);
  const { participants } = eventSnapshotSchema.parse(await added.json());
  const [mia, noah] = participants;
  if (!mia || !noah) throw new Error("Missing fixture participants.");

  const saved = await page.request.post(`${eventPath}/expenses`, {
    data: {
      description: "Dinner",
      amountMinor: 2001,
      payerId: mia.id,
      includedParticipantIds: [noah.id, mia.id],
    },
  });
  expect(saved.status()).toBe(201);
  const expectedShares = [
    { participantId: noah.id, amountMinor: 1001 },
    { participantId: mia.id, amountMinor: 1000 },
  ];
  const savedSnapshot = eventSnapshotSchema.parse(await saved.json());
  expect(savedSnapshot.expenses[0]?.shares).toEqual(expectedShares);

  const recentActivity = page.getByLabel("Recent activity");
  const expenseSplit = recentActivity.locator("details");
  const expectedDisplay = [/^Noah\s*\$10\.01$/, /^Mia\s*\$10\.00$/];
  await page.goto(`/e/${token}/expenses`);
  await expenseSplit.getByText("See exact split", { exact: true }).click();
  await expect(expenseSplit.getByRole("listitem")).toHaveText(expectedDisplay);
  await page.reload();
  await expenseSplit.getByText("See exact split", { exact: true }).click();
  await expect(expenseSplit.getByRole("listitem")).toHaveText(expectedDisplay);

  await page.getByRole("link", { name: "Edit Dinner" }).click();
  await expect(page.getByRole("region", { name: "Exact split preview" }).getByRole("listitem"))
    .toHaveText(expectedDisplay);
  await page.getByRole("dialog").getByLabel("What was it?").fill("Dinner and dessert");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(recentActivity.getByText("Dinner and dessert", { exact: true })).toBeVisible();
  await expect(expenseSplit.getByRole("listitem")).toHaveText(expectedDisplay);

  const reloaded = await page.request.get(eventPath);
  expect(reloaded.status()).toBe(200);
  const snapshot = eventSnapshotSchema.parse(await reloaded.json());
  expect(snapshot.expenses[0]?.shares).toEqual(expectedShares);
});

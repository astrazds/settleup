import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("creates, edits, settles, and cleans up a shared event", async ({
  browserName,
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
  await addPersonLink.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(addPersonLink).toBeFocused();
  await addPersonLink.click();
  await page.getByLabel("Name").fill("Noah");
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByText("Noah", { exact: true })).toBeVisible();

  const editNoahLink = page.getByRole("link", { name: "Edit Noah" });
  await editNoahLink.click();
  await expect(page).toHaveURL(/\/people\/[^/]+\/edit$/);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/people$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(editNoahLink).toBeFocused();

  await editNoahLink.click();
  await page.getByLabel("Name").fill("Noah K");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Noah K", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Expenses" }).click();
  await page.getByRole("link", { name: "Add the first expense" }).click();
  await page.getByLabel("What was it?").fill("Dinner");
  await page.getByLabel("Amount").fill("40.00");
  const expenseDialog = page.getByRole("dialog");
  await expect(
    expenseDialog.getByRole("heading", { name: "Exact split" }),
  ).toBeVisible();
  await expect(
    expenseDialog.getByText("$20.00", { exact: true }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Add expense" }).click();

  await expect(page.getByText("Dinner", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Recent activity").getByText("$40.00", { exact: true }),
  ).toBeVisible();
  await page.getByText("See exact split", { exact: true }).click();
  await expect(
    page.getByLabel("Recent activity").getByText("$20.00", { exact: true }),
  ).toHaveCount(2);

  await page.getByRole("link", { name: "Edit Dinner" }).click();
  await page.getByLabel("What was it?").fill("Dinner and dessert");
  await page.getByLabel("Amount").fill("50.00");
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
  const mobileActionsAreVisible = (page.viewportSize()?.width ?? 0) <= 819;
  const editPaymentLabel = editPaymentLink.getByText("Edit", { exact: true });
  const deletePaymentLabel = deletePaymentButton.getByText("Delete", {
    exact: true,
  });
  if (mobileActionsAreVisible) {
    await expect(editPaymentLabel).toBeVisible();
    await expect(deletePaymentLabel).toBeVisible();
  } else {
    await expect(editPaymentLabel).toBeHidden();
    await expect(deletePaymentLabel).toBeHidden();
  }

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

  await page.getByRole("link", { name: "Add the first expense" }).click();
  await page.getByLabel("What was it?").fill("Dinner");
  await page.getByLabel("Amount").fill("10.00");
  await page.getByRole("button", { name: "Add expense" }).click();

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

import { expect, test } from "@playwright/test";
import { createEventResponseSchema, eventSnapshotSchema } from "@settleup/contracts";

test("shows balances from a recorded payment after deleting the only expense", async ({ page }) => {
  const response = await page.request.post("/api/events", {
    data: { title: "Shared dinner", currency: "AUD", firstParticipantName: "Mia" },
  });
  expect(response.status()).toBe(201);
  const { token } = createEventResponseSchema.parse(await response.json());
  const eventApi = `/api/events/${token}`;
  const settle = `/e/${token}/settle`;
  await page.goto(settle);

  const empty = page.getByRole("heading", { name: "Add expenses first" });
  await expect(empty).toBeVisible();
  await expect(page.getByRole("region", { name: "Current balances" })).toHaveCount(0);

  const people = await page.request.post(`${eventApi}/participants`, { data: { name: "Noah" } });
  const { participants } = eventSnapshotSchema.parse(await people.json());
  const [mia, noah] = participants;
  if (!mia || !noah) throw new Error("Missing fixture participants.");
  const expense = await page.request.post(`${eventApi}/expenses`, {
    data: {
      description: "Dinner",
      amountMinor: 3000,
      payerId: mia.id,
      includedParticipantIds: [mia.id, noah.id],
    },
  });
  expect(expense.status()).toBe(201);

  await expect(page.getByRole("heading", { name: "Noah pays Mia $15.00" })).toBeVisible();
  await page.getByRole("link", { name: "Record payment" }).click();
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("heading", { name: "Everyone is settled" })).toBeVisible();

  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await page.getByRole("button", { name: "Delete Dinner" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nothing to split yet" })).toBeVisible();

  await page.getByRole("link", { name: "Settle", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mia pays Noah $15.00" })).toBeVisible();
  const balances = page.getByRole("region", { name: "Current balances" });
  await expect(balances.getByRole("listitem", { name: "Mia owes $15.00" })).toBeVisible();
  await expect(balances.getByRole("listitem", { name: "Noah gets back $15.00" })).toBeVisible();

  await page.getByRole("button", { name: "Delete payment from Noah to Mia" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(empty).toBeVisible();
  await expect(balances).toHaveCount(0);
});

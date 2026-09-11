import { createEventResponseSchema, eventSnapshotSchema } from "@settleup/contracts";
import { expect, test } from "@playwright/test";

for (const editor of ["expense", "payment"] as const) {
  test(`${editor} keeps the draft until the user accepts the latest event`, async ({ page }) => {
    const create = await page.request.post("/api/events", {
      data: { title: "Shared dinner", currency: "AUD", firstParticipantName: "Mia" },
    });
    expect(create.status()).toBe(201);
    const { token } = createEventResponseSchema.parse(await create.json());
    const people = await page.request.post(`/api/events/${token}/participants`, {
      data: { name: "Noah" },
    });
    const { participants } = eventSnapshotSchema.parse(await people.json());
    const [mia, noah] = participants;
    if (!mia || !noah) throw new Error("Missing fixture participants.");
    const command = {
      description: "Dinner",
      amountMinor: 1001,
      payerId: mia.id,
      includedParticipantIds: [mia.id, noah.id],
    };
    const saved = await page.request.post(`/api/events/${token}/expenses`, { data: command });
    const before = eventSnapshotSchema.parse(await saved.json());
    const [expense] = before.expenses;
    if (!expense) throw new Error("Missing fixture expense.");

    await page.goto(`/e/${token}/${editor === "expense" ? `expenses/${expense.id}/edit` : "settle/new"}`);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTitle("Live updates connected")).toBeVisible();
    await page.getByLabel("Amount", { exact: true }).fill("12.34");
    if (editor === "expense") {
      await page.getByLabel("What was it?").fill("My unsaved description");
      await page.getByLabel("Noah", { exact: true }).focus();
      await page.getByLabel("Noah", { exact: true }).press("Space");
    }

    const changed = await page.request.patch(`/api/events/${token}/expenses/${expense.id}`, {
      data: { ...command, description: "Dinner updated", amountMinor: 2001, payerId: noah.id },
      headers: { "If-Match": `"v${before.event.version}"` },
    });
    expect(changed.status()).toBe(200);
    const after = eventSnapshotSchema.parse(await changed.json());
    const submit = page.getByRole("button", { name: editor === "expense" ? "Save changes" : "Record payment" });
    const reload = page.getByRole("button", { name: "Load latest" });
    await expect(reload).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("12.34");
    await expect(page.locator('input[name="eventVersion"]')).toHaveValue(String(before.event.version));

    if (editor === "expense") {
      await expect(page.getByLabel("What was it?")).toHaveValue("My unsaved description");
      await expect(page.getByLabel("Noah", { exact: true })).not.toBeChecked();
    }

    await reload.click();
    await expect(reload).not.toBeVisible();
    await expect(submit).toBeEnabled();
    await expect(page.locator('input[name="eventVersion"]')).toHaveValue(String(after.event.version));
    if (editor === "expense") {
      await expect(page.getByLabel("What was it?")).toHaveValue("Dinner updated");
      await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("20.01");
      await expect(page.getByLabel("Paid by")).toHaveValue(noah.id);
      await expect(page.getByLabel("Noah", { exact: true })).toBeChecked();
    } else {
      await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("10.01");
      await expect(page.getByLabel("From", { exact: true })).toHaveValue(mia.id);
      await expect(page.getByLabel("To", { exact: true })).toHaveValue(noah.id);
    }
    await submit.click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
}

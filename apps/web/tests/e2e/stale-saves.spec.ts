import { expect, test, type Page } from "@playwright/test";
import { createEventResponseSchema, eventSnapshotSchema } from "@settleup/contracts";

const editors = ["person", "expense", "payment"] as const;
const modes = ["create", "edit"] as const;
const staleMessage = "This event changed before your update was saved. Load the latest version and try again.";

async function createFixture(page: Page) {
  const created = await page.request.post("/api/events", {
    data: { title: "Weekend away", currency: "AUD", firstParticipantName: "Mia" },
  });
  expect(created.status()).toBe(201);
  const { token } = createEventResponseSchema.parse(await created.json());
  const eventApi = `/api/events/${token}`;
  const people = await page.request.post(`${eventApi}/participants`, { data: { name: "Noah" } });
  expect(people.status()).toBe(201);
  const { participants } = eventSnapshotSchema.parse(await people.json());
  const [mia, noah] = participants;
  if (!mia || !noah) throw new Error("Missing fixture participants.");
  const dinner = await page.request.post(`${eventApi}/expenses`, {
    data: {
      description: "Dinner",
      amountMinor: 1000,
      payerId: mia.id,
      includedParticipantIds: [mia.id, noah.id],
    },
  });
  expect(dinner.status()).toBe(201);
  const recorded = await page.request.post(`${eventApi}/payments`, {
    data: { amountMinor: 100, from: noah.id, to: mia.id },
  });
  expect(recorded.status()).toBe(201);
  const before = eventSnapshotSchema.parse(await recorded.json());
  const [expense] = before.expenses;
  const [payment] = before.payments;
  if (!expense || !payment) throw new Error("Missing fixture transactions.");

  return { token, eventApi, before, mia, expense, payment };
}

for (const editor of editors) {
  for (const mode of modes) {
    test(`${editor} ${mode} recovers from a stale save`, async ({ page }) => {
      const { token, eventApi, before, mia, expense, payment } = await createFixture(page);
      const edit = mode === "edit";
      const { section, collection, id, submitLabel, fieldLabel, draftValue, latestValue } = {
        person: {
          section: "people",
          collection: "participants",
          id: mia.id,
          submitLabel: "Add person",
          fieldLabel: "Name",
          draftValue: "My draft",
          latestValue: "",
        },
        expense: {
          section: "expenses",
          collection: "expenses",
          id: expense.id,
          submitLabel: "Add expense",
          fieldLabel: "Amount",
          draftValue: "12.34",
          latestValue: edit ? "10.00" : "",
        },
        payment: {
          section: "settle",
          collection: "payments",
          id: payment.id,
          submitLabel: "Record payment",
          fieldLabel: "Amount",
          draftValue: "12.34",
          latestValue: edit ? "1.00" : "4.00",
        },
      }[editor];
      const editorPath = edit ? `${id}/edit` : "new";
      const mutationPath = `${eventApi}/${collection}${edit ? `/${id}` : ""}`;

      await page.route(`**${eventApi}/stream`, (route) => route.abort());
      await page.goto(`/e/${token}/${section}/${editorPath}`);
      const dialog = page.getByRole("dialog");
      const field = dialog.getByLabel(fieldLabel, { exact: true });
      const submit = dialog.getByRole("button", { name: edit ? "Save changes" : submitLabel });
      const loadLatest = dialog.getByRole("button", { name: "Load latest" });
      const acceptedVersion = dialog.locator('input[name="eventVersion"]');

      async function fillDraft() {
        if (editor === "expense" && !edit) {
          await dialog.getByLabel("What was it?").fill("Train tickets");
        }
        await field.fill(draftValue);
      }

      const personEdit = editor === "person" && edit;
      const names = personEdit ? ["Mia updated", "Mia renamed again"] : ["Mia updated"];
      const eventRequest = `**${eventApi}`;
      let version = before.event.version;

      for (const name of names) {
        await fillDraft();
        const failRefresh = personEdit && name === names[0];
        if (failRefresh) await page.route(eventRequest, (route) => route.abort("failed"));

        const changed = await page.request.patch(`${eventApi}/participants/${mia.id}`, {
          data: { name },
          headers: { "If-Match": `"v${version}"` },
        });
        expect(changed.status()).toBe(200);
        const latest = eventSnapshotSchema.parse(await changed.json());

        const rejection = page.waitForResponse((response) =>
          new URL(response.url()).pathname === mutationPath && response.status() === 412,
        );
        await submit.click();
        await rejection;

        if (failRefresh) {
          await expect(page.getByTitle("Event refresh failed")).toBeVisible();
        }
        await expect(loadLatest).toBeVisible();
        await expect(submit).toBeDisabled();
        await expect(field).toHaveValue(draftValue);
        await expect(acceptedVersion).toHaveValue(String(version));
        await expect(dialog.getByText(staleMessage)).toHaveCount(0);

        if (failRefresh) {
          await loadLatest.click();
          await expect(loadLatest).toBeEnabled();
          await expect(field).toHaveValue(draftValue);
          await expect(submit).toBeDisabled();
          await page.unroute(eventRequest);
        }

        await loadLatest.click();
        await expect(loadLatest).toHaveCount(0);
        await expect(dialog.getByText(staleMessage)).toHaveCount(0);
        await expect(field).toHaveValue(personEdit ? name : latestValue);
        version = latest.event.version;
        await expect(acceptedVersion).toHaveValue(String(version));
      }

      await fillDraft();
      const saved = page.waitForResponse((response) =>
        new URL(response.url()).pathname === mutationPath && response.status() === (edit ? 200 : 201),
      );
      await submit.click();
      await saved;
      await expect(dialog).toHaveCount(0);
    });
  }
}

test("keeps a save error when an expense payer has been removed", async ({ page }) => {
  const { token, eventApi } = await createFixture(page);
  const added = await page.request.post(`${eventApi}/participants`, { data: { name: "Ivy" } });
  expect(added.status()).toBe(201);
  const { participants } = eventSnapshotSchema.parse(await added.json());
  const ivy = participants.find((participant) => participant.name === "Ivy");
  if (!ivy) throw new Error("Missing fixture participant Ivy.");

  await page.route(`**${eventApi}/stream`, (route) => route.abort());
  await page.goto(`/e/${token}/expenses/new`);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What was it?").fill("Train tickets");
  await dialog.getByLabel("Amount", { exact: true }).fill("12.34");
  await dialog.getByLabel("Paid by").selectOption(ivy.id);

  const removed = await page.request.delete(`${eventApi}/participants/${ivy.id}`);
  expect(removed.status()).toBe(200);

  const response = page.waitForResponse((result) =>
    new URL(result.url()).pathname === `${eventApi}/expenses` && result.status() === 400,
  );
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await response;

  await expect(dialog.getByRole("alert")).toHaveText("Participant does not belong to this event.");
  await expect(dialog.getByLabel("What was it?")).toHaveValue("Train tickets");
});

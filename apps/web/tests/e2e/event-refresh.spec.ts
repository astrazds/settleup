import { expect, test, type Page } from "@playwright/test";
import { createEventResponseSchema, eventSnapshotSchema } from "@settleup/contracts";

async function createEvent(page: Page) {
  const response = await page.request.post("/api/events", {
    data: { title: "Weekend away", currency: "AUD", firstParticipantName: "Mia" },
  });
  expect(response.status()).toBe(201);
  return createEventResponseSchema.parse(await response.json());
}

async function refreshOnFocus(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
}

test("preserves the expense draft when a refresh fails and checks its version after retry", async ({ page }) => {
  const { token } = await createEvent(page);
  const eventApi = `/api/events/${token}`;
  const people = await page.request.post(`${eventApi}/participants`, { data: { name: "Noah" } });
  const before = eventSnapshotSchema.parse(await people.json());
  const [, noah] = before.participants;
  if (!noah) throw new Error("Missing fixture participant.");

  await page.goto(`/e/${token}/expenses/new`);
  await expect(page.getByTitle("Live updates connected")).toBeVisible();
  const dialog = page.getByRole("dialog");
  const description = dialog.getByLabel("What was it?");
  const amount = dialog.getByLabel("Amount", { exact: true });
  const payer = dialog.getByLabel("Paid by");
  const included = dialog.getByLabel("Noah", { exact: true });
  const submit = dialog.getByRole("button", { name: "Add expense" });
  const acceptedVersion = dialog.locator('input[name="eventVersion"]');
  await description.fill("Train tickets");
  await amount.fill("12.34");
  await payer.selectOption(noah.id);
  await included.focus();
  await included.press("Space");

  const eventRequest = `**${eventApi}`;
  await page.route(eventRequest, (route) => route.abort("failed"));
  await refreshOnFocus(page);
  const failed = page.getByText("Couldn’t refresh this event. Showing the last loaded details.");
  await expect(failed).toBeVisible();
  await expect(description).toHaveValue("Train tickets");
  await expect(amount).toHaveValue("12.34");
  await expect(payer).toHaveValue(noah.id);
  await expect(included).not.toBeChecked();
  await expect(acceptedVersion).toHaveValue(String(before.event.version));

  const changed = await page.request.post(`${eventApi}/participants`, { data: { name: "Ivy" } });
  const after = eventSnapshotSchema.parse(await changed.json());
  await page.unroute(eventRequest);
  await refreshOnFocus(page);

  await expect(failed).toHaveCount(0);
  const loadLatest = dialog.getByRole("button", { name: "Load latest" });
  await expect(loadLatest).toBeVisible();
  await expect(submit).toBeDisabled();
  await expect(description).toHaveValue("Train tickets");
  await expect(amount).toHaveValue("12.34");
  await expect(payer).toHaveValue(noah.id);
  await expect(included).not.toBeChecked();
  await expect(acceptedVersion).toHaveValue(String(before.event.version));

  await loadLatest.click();
  await expect(loadLatest).toHaveCount(0);
  await expect(description).toHaveValue("");
  await expect(amount).toHaveValue("");
  await expect(acceptedVersion).toHaveValue(String(after.event.version));
  await expect(dialog.getByLabel("Ivy", { exact: true })).toBeChecked();
});

test("cancels a pending refresh on navigation and does not reuse the departed event", async ({ page }) => {
  const { token } = await createEvent(page);
  await page.goto(`/e/${token}/expenses`);
  const firstEvent = page.getByRole("heading", { name: "Weekend away" });
  await expect(firstEvent).toBeVisible();
  await expect(page.getByTitle("Live updates connected")).toBeVisible();

  const eventRequest = `**/api/events/${token}`;
  await page.route(eventRequest, () => {
    // Leave the refresh pending to observe what navigation does to it.
  });
  const pendingRefresh = page.waitForRequest(eventRequest);
  await refreshOnFocus(page);
  const request = await pendingRefresh;
  const canceledRefresh = page.waitForEvent("requestfailed", (failed) => failed === request);

  await page.getByRole("link", { name: "SettleUp home" }).click();
  await canceledRefresh;
  await page.unroute(eventRequest);
  const title = page.getByLabel("What are you splitting?");
  await title.fill("Another weekend");
  await page.getByLabel("Your name").fill("Ivy");
  await page.route(/\/api\/events\/[^/]+$/, (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Create private event" }).click();

  const loadError = page.getByRole("heading", { name: "SettleUp is out of reach" });
  await expect(page).toHaveURL(/\/e\/[^/]+$/);
  expect(new URL(page.url()).pathname).not.toContain(token);
  await expect(loadError).toBeVisible();
  await expect(firstEvent).toHaveCount(0);

  await page.goBack();
  await expect(title).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(`/e/${token}/expenses`);
  await expect(loadError).toBeVisible();
  await expect(firstEvent).toHaveCount(0);
});

for (const [status, heading] of [
  [404, "We can’t find that event"],
  [410, "This event has wrapped up"],
] as const) {
  test(`shows the ${status} link error when refreshing an open event`, async ({ page }) => {
    const { token } = await createEvent(page);
    await page.goto(`/e/${token}/expenses/new`);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTitle("Live updates connected")).toBeVisible();

    await page.route(`**/api/events/${token}`, (route) =>
      route.fulfill({ status, json: { error: heading } }),
    );
    await refreshOnFocus(page);

    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

test("home is responsive and accessible", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveScreenshot("home.png", {
    animations: "disabled",
    fullPage: true,
  });

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("dark color scheme remains accessible", async ({ page }) => {
  await page.emulateMedia({
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await page.goto("/");

  await expect(page).toHaveScreenshot("home-dark.png", {
    animations: "disabled",
    fullPage: true,
  });

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("event workspace stays legible across every section", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("What are you splitting?").fill("Ledger weekend");
  await page.getByLabel("Your name").fill("Mia");
  await page.getByRole("button", { name: "Create private event" }).click();

  await expect(page).toHaveURL(/\/expenses$/);
  await expect(page.getByTitle("Live updates connected")).toBeVisible();
  await expectEventScreenshot(page, "event-expenses-empty.png");

  await page.getByRole("link", { name: "People", exact: true }).click();
  await page.getByRole("link", { name: "Add person" }).click();
  await page.getByLabel("Name").fill("Noah");
  await page.getByRole("button", { name: "Add person" }).click();

  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await page.getByRole("link", { name: "Add expense" }).click();
  await page.getByLabel("What was it?").fill("Dinner");
  await page.getByLabel("Amount").fill("40.00");
  await expect(page.getByRole("dialog", { name: "Add expense" })).toBeVisible();
  await expectEventScreenshot(
    page,
    "event-expense-dialog.png",
    false,
    [],
    false,
  );
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page.getByText("Dinner", { exact: true })).toBeVisible();
  await expectEventScreenshot(page, "event-expenses.png", true, [
    page.getByText(/Mia paid · split with 2 people/),
  ]);

  await page.getByRole("link", { name: "Settle", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Noah pays Mia $20.00" }),
  ).toBeVisible();
  await expectEventScreenshot(page, "event-settle.png");

  await page.getByRole("link", { name: "People", exact: true }).click();
  await expect(page.getByText("Noah", { exact: true })).toBeVisible();
  await expectEventScreenshot(page, "event-people.png");

  await page.emulateMedia({
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await page.goto(page.url().replace(/\/people$/, "/settle"));
  await expect(
    page.getByRole("heading", { name: "Noah pays Mia $20.00" }),
  ).toBeVisible();
  await expectEventScreenshot(page, "event-settle-dark.png");

  const darkAccessibility = await new AxeBuilder({ page }).analyze();
  expect(darkAccessibility.violations).toEqual([]);

  await page.emulateMedia({
    colorScheme: "light",
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Noah pays Mia $20.00" }),
  ).toBeVisible();
  const forcedColorAccessibility = await new AxeBuilder({ page }).analyze();
  expect(forcedColorAccessibility.violations).toEqual([]);
});

test("shows dedicated invalid and expired private-link states", async ({
  page,
}) => {
  await page.goto("/e/not-a-real-token");
  await expect(
    page.getByRole("heading", { name: "We can’t find that event" }),
  ).toBeVisible();

  await page.route("**/api/events/expired-token", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ error: "This event has expired." }),
      contentType: "application/json",
      status: 410,
    });
  });
  await page.goto("/e/expired-token");
  await expect(
    page.getByRole("heading", { name: "This event has wrapped up" }),
  ).toBeVisible();
});

async function expectEventScreenshot(
  page: Page,
  name: string,
  fullPage = true,
  extraMasks: Locator[] = [],
  maskExpiry = true,
) {
  await page.evaluate(async () => document.fonts.ready);

  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    fullPage,
    mask: [
      ...(maskExpiry ? [page.getByText(/^Available until /)] : []),
      ...extraMasks,
    ],
    maskColor: "#f2e8d1",
  });

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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

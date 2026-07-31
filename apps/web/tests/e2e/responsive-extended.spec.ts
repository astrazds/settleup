import { expect, test, type Locator, type Page } from "@playwright/test";

const longDescription =
  "Market supplies for the campsite, breakfast, snacks, and the long train ride home after everyone packed their bags and checked the cabin twice";

test("reflows at the portable 200 percent zoom equivalent", async ({
  page,
}) => {
  const browserErrors = watchForBrowserErrors(page);
  await page.setViewportSize({ height: 720, width: 640 });
  await page.goto("/");

  const landingHeading = page.getByRole("heading", { level: 1 });
  const createButton = page.getByRole("button", {
    name: "Create private event",
  });
  await expectContained(landingHeading);
  await expectTapTarget(createButton);
  await expectNoHorizontalOverflow(page);

  await page
    .getByLabel("What are you splitting?")
    .fill("A deliberately long shared weekend title");
  await page.getByLabel("Your name").fill("Mia");
  await createButton.click();

  await expect(page).toHaveURL(/\/expenses$/);
  await expectContained(
    page.getByRole("heading", {
      level: 1,
      name: "A deliberately long shared weekend title",
    }),
  );
  for (const name of ["Expenses", "Settle", "People"]) {
    await expectTapTarget(page.getByRole("link", { name, exact: true }));
  }
  await expectNoHorizontalOverflow(page);
  expect(browserErrors).toEqual([]);
});

test("keeps key event and dialog controls usable at 200 percent text", async ({
  page,
}) => {
  const browserErrors = watchForBrowserErrors(page);
  await page.setViewportSize({ height: 800, width: 320 });
  await page.goto("/");
  await applyDoubleTextSize(page);

  const landingHeading = page.getByRole("heading", { level: 1 });
  await expectContained(landingHeading);
  await expectNoHorizontalOverflow(page);

  await page
    .getByLabel("What are you splitting?")
    .fill("Community garden planning weekend");
  await page.getByLabel("Your name").fill("Mia");
  await page.getByRole("button", { name: "Create private event" }).click();

  await expect(page).toHaveURL(/\/expenses$/);
  const eventHeading = page.getByRole("heading", {
    level: 1,
    name: "Community garden planning weekend",
  });
  const addExpense = page.getByRole("link", {
    name: "Add the first expense",
  });
  await expectContained(eventHeading);
  await expectTapTarget(addExpense);
  await expectNoHorizontalOverflow(page);

  await addExpense.click();
  const dialog = page.getByRole("dialog", { name: "Add expense" });
  const closeButton = dialog.getByRole("button", { name: "Close" });
  const submitButton = dialog.getByRole("button", { name: "Add expense" });
  await expect(dialog).toBeVisible();
  await expectContained(dialog);
  await expectContained(closeButton);
  await expectContained(submitButton);
  await expectTapTarget(closeButton);
  await expectTapTarget(submitButton);
  await expectNoHorizontalOverflow(page);

  const dialogMetrics = await dialog.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dialogMetrics.scrollHeight).toBeGreaterThan(
    dialogMetrics.clientHeight,
  );
  expect(browserErrors).toEqual([]);
});

test("keeps destructive confirmation usable in landscape at 200 percent text", async ({
  page,
}) => {
  const browserErrors = watchForBrowserErrors(page);
  await page.setViewportSize({ height: 640, width: 568 });
  await createEvent(page, "Landscape campsite");
  await page.getByRole("link", { name: "Add the first expense" }).click();
  await page.getByLabel("What was it?").fill(longDescription);
  await page.getByLabel("Amount").fill("20.00");
  await page.getByRole("button", { name: "Add expense" }).click();

  await page.setViewportSize({ height: 320, width: 568 });
  await applyDoubleTextSize(page);
  expect(
    await page.evaluate(() =>
      window.matchMedia("(orientation: landscape)").matches,
    ),
  ).toBe(true);

  const trigger = page.getByRole("button", {
    name: `Delete ${longDescription}`,
  });
  await expectTapTarget(trigger);
  await trigger.click();

  const alert = page.getByRole("alertdialog");
  await expect(alert).toBeVisible();
  const metrics = await alert.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      clientHeight: element.clientHeight,
      left: rect.left,
      right: rect.right,
      scrollHeight: element.scrollHeight,
      top: rect.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  expect(metrics.top).toBeGreaterThanOrEqual(-1);
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  expect(metrics.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

  const keepButton = alert.getByRole("button", { name: "Keep it" });
  const deleteButton = alert.getByRole("button", {
    name: "Delete",
    exact: true,
  });
  await expect(keepButton).toBeFocused();
  await expectTapTarget(keepButton);
  await page.keyboard.press("Tab");
  await expect(deleteButton).toBeFocused();
  await expect(deleteButton).toBeInViewport();
  await expectTapTarget(deleteButton);
  await expectNoHorizontalOverflow(page);
  expect(browserErrors).toEqual([]);
});

async function applyDoubleTextSize(page: Page) {
  await page.addStyleTag({
    content: "html { font-size: 200% !important; }",
  });
}

async function createEvent(page: Page, title: string) {
  await page.goto("/");
  await page.getByLabel("What are you splitting?").fill(title);
  await page.getByLabel("Your name").fill("Mia");
  await page.getByRole("button", { name: "Create private event" }).click();
  await expect(page).toHaveURL(/\/expenses$/);
}

async function expectContained(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () =>
      locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left >= -1 &&
          rect.right <= window.innerWidth + 1 &&
          rect.top >= -1 &&
          rect.bottom <= window.innerHeight + 1
        );
      }),
    )
    .toBe(true);
}

async function expectNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className: element.className,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          tagName: element.tagName,
          text: element.textContent?.trim().slice(0, 80),
        };
      })
      .filter(
        ({ left, right }) => left < -1 || right > viewportWidth + 1,
      )
      .slice(0, 8);

    return {
      offenders,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  expect(
    result.overflow,
    `Horizontal overflow offenders: ${JSON.stringify(result.offenders)}`,
  ).toBeLessThanOrEqual(1);
}

async function expectTapTarget(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
}

function watchForBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  return errors;
}

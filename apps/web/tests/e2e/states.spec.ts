import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { fileURLToPath } from "node:url";

const screenshotStylePath = fileURLToPath(
  new URL("./screenshot.css", import.meta.url),
);

test("home is responsive and accessible", async ({ page }, testInfo) => {
  await page.goto("/");

  if (capturesVisualSnapshots(testInfo)) {
    await expect(page).toHaveScreenshot("home.png", {
      animations: "disabled",
      fullPage: true,
    });
  }

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("dark color scheme remains accessible", async ({ page }, testInfo) => {
  await page.emulateMedia({
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await page.goto("/");

  const eventTitle = page.getByLabel("What are you splitting?");
  await expect(eventTitle).toHaveCSS(
    "background-color",
    "rgb(255, 249, 232)",
  );
  await expect(eventTitle).toHaveCSS("color", "rgb(11, 11, 11)");

  if (capturesVisualSnapshots(testInfo)) {
    await expect(page).toHaveScreenshot("home-dark.png", {
      animations: "disabled",
      fullPage: true,
    });
  }

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("forced colors preserves visible landing-form focus", async ({ page }) => {
  await page.emulateMedia({
    colorScheme: "light",
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  await page.goto("/");

  const eventTitle = page.getByLabel("What are you splitting?");
  await eventTitle.focus();
  await expect(eventTitle).toBeFocused();

  const focusStyle = await eventTitle.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(3);
});

test("announces every connection state from one stable status node", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class TestEventSource extends EventTarget {
      constructor() {
        super();
        Object.defineProperty(window, "__settleupTestEventSource", {
          configurable: true,
          value: this,
        });
        setTimeout(() => this.dispatchEvent(new Event("connected")), 0);
      }

      close() {}
    }

    Object.defineProperty(window, "EventSource", {
      configurable: true,
      value: TestEventSource,
    });
  });
  await page.goto("/");
  await page.getByLabel("What are you splitting?").fill("Connection states");
  await page.getByLabel("Your name").fill("Mia");
  await page.getByRole("button", { name: "Create private event" }).click();

  await expect(page).toHaveURL(/\/expenses$/);
  const connectionStatus = page.getByTitle("Live updates connected");
  await expect(connectionStatus).toBeVisible();
  await expect(connectionStatus).toHaveAttribute("aria-atomic", "true");
  await expect(connectionStatus).toHaveAttribute("role", "status");
  const connectionStatusElement = await connectionStatus.elementHandle();
  expect(connectionStatusElement).not.toBeNull();

  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect
    .poll(() => connectionStatusElement?.textContent())
    .toContain("Offline");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect
    .poll(() => connectionStatusElement?.textContent())
    .toContain("Reconnecting");
  await page.evaluate(() => {
    const source = (
      window as unknown as { __settleupTestEventSource: EventTarget }
    ).__settleupTestEventSource;
    source.dispatchEvent(new Event("connected"));
  });
  await expect
    .poll(() => connectionStatusElement?.textContent())
    .toContain("Up to date");
  expect(await connectionStatusElement?.evaluate((element) => element.isConnected))
    .toBe(true);
});

test(
  "event workspace stays legible across every section",
  async ({ page }, testInfo) => {
    await page.goto("/");
    await page.getByLabel("What are you splitting?").fill("Ledger weekend");
    await page.getByLabel("Your name").fill("Mia");
    await page.getByRole("button", { name: "Create private event" }).click();

    await expect(page).toHaveURL(/\/expenses$/);
    const connectionStatus = page.getByTitle("Live updates connected");
    await expect(connectionStatus).toBeVisible();
    await expect(connectionStatus).toHaveAttribute("aria-atomic", "true");
    await expect(connectionStatus).toHaveAttribute("role", "status");
    await expectEventScreenshot(page, testInfo, "event-expenses-empty.png");

    await page.getByRole("link", { name: "People", exact: true }).click();
    await page.getByRole("link", { name: "Add person" }).click();
    await page.getByLabel("Name").fill("Noah");
    await page.getByRole("button", { name: "Add person" }).click();

    await page.getByRole("link", { name: "Expenses", exact: true }).click();
    await page.getByRole("link", { name: "Add the first expense" }).click();
    await page.getByLabel("What was it?").fill("Dinner");
    await page.getByLabel("Amount").fill("40.00");
    const expenseDialog = page.getByRole("dialog", { name: "Add expense" });
    await expect(expenseDialog).toBeVisible();
    await expect(
      expenseDialog.getByRole("heading", { name: "Exact split" }),
    ).toBeVisible();
    await expect(
      expenseDialog.getByText("$20.00", { exact: true }),
    ).toHaveCount(2);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    await expectEventScreenshot(
      page,
      testInfo,
      "event-expense-dialog.png",
      false,
      [],
      false,
    );
    await page.getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Dinner", { exact: true })).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    await expect(page.locator("#main-content")).toBeFocused();
    await expect(
      page.getByRole("link", { name: "Skip to main content" }),
    ).not.toBeInViewport();
    await expectEventScreenshot(page, testInfo, "event-expenses.png", true, [
      page.getByText(/Mia paid · split with 2 people/),
    ]);

    await page.getByRole("link", { name: "Settle", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Noah pays Mia $20.00" }),
    ).toBeVisible();
    await expectEventScreenshot(page, testInfo, "event-settle.png");

    await page.getByRole("link", { name: "People", exact: true }).click();
    await expect(page.getByText("Noah", { exact: true })).toBeVisible();
    await expectEventScreenshot(page, testInfo, "event-people.png");

    await page.emulateMedia({
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    await page.goto(page.url().replace(/\/people$/, "/settle"));
    await expect(
      page.getByRole("heading", { name: "Noah pays Mia $20.00" }),
    ).toBeVisible();
    await expectEventScreenshot(page, testInfo, "event-settle-dark.png");

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
  },
);

test("long delete confirmation remains usable in a short viewport", async ({
  page,
}) => {
  const description =
    "Market supplies for the campsite, breakfast, snacks, and the long train ride home after everyone packed their bags and checked the cabin twice";

  await page.goto("/");
  await page.getByLabel("What are you splitting?").fill("Short viewport");
  await page.getByLabel("Your name").fill("Mia");
  await page.getByRole("button", { name: "Create private event" }).click();
  await page.getByRole("link", { name: "Add the first expense" }).click();
  await page.getByLabel("What was it?").fill(description);
  await page.getByLabel("Amount").fill("20.00");
  await page.getByRole("button", { name: "Add expense" }).click();

  const viewport = page.viewportSize();
  await page.setViewportSize({
    height: 320,
    width: viewport?.width ?? 390,
  });
  await page.addStyleTag({
    content: "html { font-size: 200% !important; }",
  });
  await page.getByRole("button", { name: `Delete ${description}` }).click();

  const alert = page.getByRole("alertdialog");
  await expect(alert).toBeVisible();
  const metrics = await alert.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      top: rect.top,
      viewportHeight: window.innerHeight,
    };
  });
  expect(metrics.top).toBeGreaterThanOrEqual(0);
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

  const keepButton = alert.getByRole("button", { name: "Keep it" });
  const deleteButton = alert.getByRole("button", { name: "Delete", exact: true });
  await expect(keepButton).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(deleteButton).toBeFocused();
  await expect(deleteButton).toBeInViewport();
});

test(
  "shows dedicated invalid and expired private-link states",
  async ({ page }, testInfo) => {
    await page.goto("/e/not-a-real-token");
    await expect(
      page.getByRole("heading", { name: "We can’t find that event" }),
    ).toBeVisible();

    if (capturesVisualSnapshots(testInfo)) {
      await page.evaluate(async () => document.fonts.ready);
      await expect(page).toHaveScreenshot("root-error.png", {
        animations: "disabled",
        fullPage: true,
      });
    }

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
  },
);

async function expectEventScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  fullPage = true,
  extraMasks: Locator[] = [],
  maskExpiry = true,
) {
  await page.evaluate(async () => document.fonts.ready);

  if (capturesVisualSnapshots(testInfo)) {
    await expect(page).toHaveScreenshot(name, {
      animations: "disabled",
      fullPage,
      // Concurrent desktop Chromium rasterization varies slightly across the
      // shared text-heavy event spine; all other goldens remain pixel-exact.
      maxDiffPixelRatio:
        testInfo.project.name === "desktop-chromium" ? 0.01 : undefined,
      mask: [
        ...(maskExpiry ? [page.getByText(/^Available until /)] : []),
        ...extraMasks,
      ],
      maskColor: "#f2e8d1",
      stylePath: screenshotStylePath,
    });
  }

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

function capturesVisualSnapshots(testInfo: TestInfo) {
  return testInfo.project.metadata.visualSnapshots === true;
}

import { expect, type Locator, type Page, test } from '@playwright/test'

test.describe('Event UI smoke flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-write'], { origin: 'http://127.0.0.1:8791' })
  })

  test('creates an Event, captures an Expense, records settlement, and shows Event History', async ({ page }) => {
    await createEvent(page, `Sydney smoke ${Date.now()}`)

    await expect(page.getByRole('heading', { name: /Sydney smoke/ })).toBeVisible()
    await expect(page.getByTestId('balances-panel')).toContainText('Sarah')
    await expect(page.getByTestId('add-expense-panel')).toBeVisible()
    await expect(page.getByTestId('record-settlement-panel')).toBeVisible()
    await expect(page.getByTestId('event-history-panel')).toBeVisible()
    await expect(page.getByText('Add the people sharing this Event')).toBeVisible()

    await addExpenseDraft(page, 'Dinner', '90.00')
    await addParticipantFromExpense(page, 'Alex')
    await addParticipantFromExpense(page, 'Priya')

    const addExpense = page.getByTestId('add-expense-panel')
    await expect(addExpense.getByLabel('Description')).toHaveValue('Dinner')
    await expect(addExpense.getByLabel('Amount')).toHaveValue('90.00')
    await expect(addExpense.getByRole('checkbox', { name: 'Sarah' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Alex' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Priya' })).toBeChecked()

    await addExpense.getByRole('button', { name: 'Save Expense' }).click()

    const balances = page.getByTestId('balances-panel')
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*60\.00/)
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/owes.*30\.00/)
    await expect(balances).toContainText(/Priya/)
    await expect(balances).toContainText(/owes.*30\.00/)

    const history = page.getByTestId('event-history-panel')
    const expenseRow = history.locator('.record-row').filter({ hasText: 'Dinner' })
    await expect(expenseRow).toContainText('Expense')
    await expect(expenseRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(expenseRow.getByRole('button', { name: 'Delete' })).toBeVisible()

    const settlement = page.getByTestId('record-settlement-panel')
    await expect(settlement).toContainText('Suggested Settlements')
    await expect(settlement).toContainText(/2 payments/)
    await settlement.getByRole('button', { name: 'Settle up' }).click()

    const suggestion = settlement.locator('.suggestion').first()
    await expect(suggestion).toContainText(/sends/)
    await suggestion.getByRole('button', { name: 'Record' }).click()
    await expect(suggestion.getByLabel('Recorded amount')).toHaveValue('30.00')
    await suggestion.getByRole('button', { name: 'Record Settlement Payment' }).click()

    const paymentRow = history.locator('.record-row').filter({ hasText: 'Settlement Payment' }).first()
    await expect(paymentRow).toContainText(/sent/)
    await expect(paymentRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(paymentRow.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect(settlement).toContainText(/1 payments/)
  })

  test('keeps mobile panels usable and Event Link feedback fixed', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await createEvent(page, `Mobile smoke ${Date.now()}`)
    await addExpenseDraft(page, 'Ferry tickets', '60.00')
    await addParticipantFromExpense(page, 'Alex')
    await page.getByTestId('add-expense-panel').getByRole('button', { name: 'Save Expense' }).click()

    await expectMobilePanel(page.getByTestId('balances-panel'))
    await expectMobilePanel(page.getByTestId('add-expense-panel'))
    await expectMobilePanel(page.getByTestId('record-settlement-panel'))
    await expectMobilePanel(page.getByTestId('event-history-panel'))
    await expectNoHorizontalOverflow(page)

    await page.evaluate(() => window.scrollTo(0, 0))
    const before = await requiredBox(page.getByTestId('add-expense-panel'))
    const copyButton = page.getByRole('button', { name: 'Copy Event Link' })
    await copyButton.click()
    await expect(page.getByText('Event Link copied')).toBeVisible()
    await expect(copyButton).toHaveText('Copy Event Link')
    const after = await requiredBox(page.getByTestId('add-expense-panel'))

    expect(Math.abs(after.y - before.y)).toBeLessThan(1)
  })
})

async function createEvent(page: Page, title: string): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Event Title').fill(title)
  await page.getByLabel('Your name').fill('Sarah')
  await page.getByRole('button', { name: 'Create Event' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
}

async function addExpenseDraft(page: Page, description: string, amount: string): Promise<void> {
  const addExpense = page.getByTestId('add-expense-panel')
  await addExpense.getByLabel('Description').fill(description)
  await addExpense.getByLabel('Amount').fill(amount)
}

async function addParticipantFromExpense(page: Page, displayName: string): Promise<void> {
  const addExpense = page.getByTestId('add-expense-panel')
  await addExpense.getByLabel('Display name').fill(displayName)
  await addExpense.getByRole('button', { name: 'Add Participant' }).click()
  await expect(addExpense.getByRole('checkbox', { name: displayName })).toBeVisible()
}

async function expectMobilePanel(panel: Locator): Promise<void> {
  await panel.scrollIntoViewIfNeeded()
  await expect(panel).toBeVisible()
  const box = await requiredBox(panel)
  expect(box.width).toBeGreaterThan(300)
  expect(box.width).toBeLessThanOrEqual(390)
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

async function requiredBox(locator: Locator): Promise<{ x: number, y: number, width: number, height: number }> {
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error('Expected element to have a layout box')
  }
  return box
}

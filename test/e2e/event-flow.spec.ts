import { expect, type Locator, type Page, test } from '@playwright/test'

test.describe('Event UI smoke flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8791' })
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

  test('edits and deletes an Expense from Event History with saved exact Shares', async ({ page }) => {
    await createEvent(page, `Expense correction ${Date.now()}`)
    await addParticipantFromExpense(page, 'Alex')
    await addParticipantFromExpense(page, 'Priya')

    const addExpense = page.getByTestId('add-expense-panel')
    await addExpenseDraft(page, 'Cab fare', '120.00')
    await addExpense.getByRole('checkbox', { name: 'Priya' }).uncheck()
    await expect(addExpense.getByText('Remaining', { exact: true })).toBeHidden()
    await addExpense.getByRole('button', { name: 'Save Expense' }).click()

    const history = page.getByTestId('event-history-panel')
    const savedExpense = history.locator('.record-row').filter({ hasText: 'Cab fare' })
    await savedExpense.getByRole('button', { name: 'Edit' }).click()

    await expect(addExpense.getByLabel('Description')).toHaveValue('Cab fare')
    await expect(addExpense.getByLabel('Amount')).toHaveValue('120.00')
    await expect(addExpense.getByRole('checkbox', { name: 'Sarah' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Alex' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Priya' })).not.toBeChecked()
    await expectShareRows(addExpense, [
      ['Sarah', '60.00'],
      ['Alex', '60.00']
    ])

    await addExpense.getByLabel('Description').fill('Cab fare corrected')
    await addExpense.getByLabel('Amount').fill('150.00')
    await addExpense.getByLabel('Payer').selectOption({ label: 'Alex' })
    await fillShareAmount(addExpense, 'Sarah', '50.00')
    await fillShareAmount(addExpense, 'Alex', '100.00')
    await addExpense.getByRole('button', { name: 'Save Expense' }).click()

    const correctedExpense = history.locator('.record-row').filter({ hasText: 'Cab fare corrected' })
    await expect(correctedExpense).toContainText(/Alex paid .*150\.00/)
    await expect(correctedExpense).toContainText(/Sarah .*50\.00/)
    await expect(correctedExpense).toContainText(/Alex .*100\.00/)

    const balances = page.getByTestId('balances-panel')
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/is owed.*50\.00/)
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/owes.*50\.00/)

    const settlement = page.getByTestId('record-settlement-panel')
    await expect(settlement).toContainText(/Sarah sends Alex/)
    await expect(settlement).toContainText(/50\.00/)

    await correctedExpense.getByRole('button', { name: 'Delete' }).click()
    await expect(history).toContainText('No Event history yet')
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is settled/)
    await expect(settlement).toContainText('Everyone is settled.')
  })

  test('captures advanced Expense Shares with assign remaining and payer warning', async ({ page }) => {
    await createEvent(page, `Advanced shares ${Date.now()}`)
    await addParticipantFromExpense(page, 'Alex')
    await addParticipantFromExpense(page, 'Priya')

    const addExpense = page.getByTestId('add-expense-panel')
    await addExpenseDraft(page, 'Tour passes', '100.00')
    await expect(addExpense.getByText('Remaining', { exact: true })).toBeHidden()

    await addExpense.getByRole('checkbox', { name: 'Sarah' }).uncheck()
    await addExpense.getByRole('checkbox', { name: 'Alex' }).uncheck()
    await addExpense.getByRole('checkbox', { name: 'Priya' }).uncheck()
    await expect(addExpense.getByRole('button', { name: 'Save Expense' })).toBeDisabled()

    await addExpense.getByRole('checkbox', { name: 'Alex' }).check()
    await addExpense.getByRole('checkbox', { name: 'Priya' }).check()
    await expect(addExpense.getByText('Sarah paid but is not included.')).toBeVisible()

    await addExpense.getByRole('button', { name: 'Adjust Shares' }).click()
    await expect(addExpense.getByText('Remaining', { exact: true })).toBeVisible()
    await fillShareAmount(addExpense, 'Alex', '30.00')
    await expect(addExpense).toContainText(/Remaining.*20\.00/)
    await addExpense.getByLabel('Assign remaining to').selectOption({ label: 'Priya' })
    await addExpense.getByRole('button', { name: 'Assign remaining' }).click()
    await expectShareRows(addExpense, [
      ['Alex', '30.00'],
      ['Priya', '70.00']
    ])
    await expect(addExpense).toContainText(/Remaining.*0\.00/)
    await addExpense.getByRole('button', { name: 'Save Expense' }).click()

    const history = page.getByTestId('event-history-panel')
    const savedExpense = history.locator('.record-row').filter({ hasText: 'Tour passes' })
    await expect(savedExpense).toContainText(/Sarah paid .*100\.00/)
    await expect(savedExpense).toContainText(/Alex .*30\.00/)
    await expect(savedExpense).toContainText(/Priya .*70\.00/)

    const balances = page.getByTestId('balances-panel')
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*100\.00/)
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/owes.*30\.00/)
    await expect(balances).toContainText(/Priya/)
    await expect(balances).toContainText(/owes.*70\.00/)

    const settlement = page.getByTestId('record-settlement-panel')
    await expect(settlement).toContainText(/Alex sends Sarah/)
    await expect(settlement).toContainText(/Priya sends Sarah/)
  })

  test('edits and deletes a Settlement Payment and copies settlement summary', async ({ page }) => {
    await createEvent(page, `Settlement correction ${Date.now()}`)
    await addParticipantFromExpense(page, 'Alex')
    await addParticipantFromExpense(page, 'Priya')
    await addExpenseDraft(page, 'Hotel', '120.00')
    await page.getByTestId('add-expense-panel').getByRole('button', { name: 'Save Expense' }).click()

    const settlement = page.getByTestId('record-settlement-panel')
    await expect(settlement).toContainText(/2 payments/)
    await settlement.getByRole('button', { name: 'Settle up' }).click()
    const copySummary = settlement.getByRole('button', { name: 'Copy summary' })
    await expect(copySummary).toBeVisible()
    const beforeCopy = await requiredBox(settlement)
    await copySummary.click()
    await expect(page.getByText('Summary copied')).toBeVisible()
    await expect(copySummary).toHaveText('Copy summary')
    await expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/sends Sarah.*40\.00/)
    const afterCopy = await requiredBox(settlement)
    expect(Math.abs(afterCopy.y - beforeCopy.y)).toBeLessThan(1)

    const suggestion = settlement.locator('.suggestion').first()
    const suggestionText = await suggestion.textContent()
    const sender = participantBefore(suggestionText, ' sends Sarah')
    await suggestion.getByRole('button', { name: 'Record' }).click()
    await suggestion.getByRole('button', { name: 'Record Settlement Payment' }).click()

    const history = page.getByTestId('event-history-panel')
    const paymentRow = history.locator('.record-row').filter({ hasText: 'Settlement Payment' }).first()
    await expect(paymentRow).toContainText(new RegExp(`${sender} sent Sarah`))
    await paymentRow.getByRole('button', { name: 'Edit' }).click()

    await expect(settlement.getByLabel('Sender')).toHaveValue(await optionValueForLabel(settlement.getByLabel('Sender'), sender))
    await expect(settlement.getByLabel('Recipient')).toHaveValue(await optionValueForLabel(settlement.getByLabel('Recipient'), 'Sarah'))
    await expect(settlement.getByLabel('Amount')).toHaveValue('40.00')
    await settlement.getByLabel('Amount').fill('20.00')
    await settlement.getByRole('button', { name: 'Record Settlement Payment' }).click()

    await expect(paymentRow).toContainText(/20\.00/)
    const balances = page.getByTestId('balances-panel')
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*60\.00/)
    await expect(balances).toContainText(new RegExp(`${sender}[\\s\\S]*owes[\\s\\S]*20\\.00`))
    await expect(settlement).toContainText(/2 payments/)

    await paymentRow.getByRole('button', { name: 'Delete' }).click()
    await expect(history.locator('.record-row').filter({ hasText: 'Settlement Payment' })).toHaveCount(0)
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*80\.00/)
    await expect(settlement).toContainText(/2 payments/)
  })

  test('renames and deletes Participants while protecting referenced Participants on mobile', async ({ page }) => {
    await createEvent(page, `Participant correction ${Date.now()}`)
    await addParticipantFromExpense(page, 'Alex')
    await addParticipantFromExpense(page, 'Temp')

    const addExpense = page.getByTestId('add-expense-panel')
    const alexRow = participantRow(addExpense, 'Alex')
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Participant display name')
      await dialog.accept('Avery')
    })
    await alexRow.getByRole('button', { name: 'Rename' }).click()

    await expect(participantRow(addExpense, 'Avery')).toBeVisible()
    await expect(addExpense.getByRole('checkbox', { name: 'Avery' })).toBeVisible()
    await expect(addExpense.getByLabel('Payer')).toContainText('Avery')

    await participantRow(addExpense, 'Temp').getByRole('button', { name: 'Delete' }).click()
    await expect(participantRow(addExpense, 'Temp')).toHaveCount(0)
    await expect(addExpense.getByRole('checkbox', { name: 'Temp' })).toHaveCount(0)

    await addExpenseDraft(page, 'Museum tickets', '80.00')
    await addExpense.getByRole('button', { name: 'Save Expense' }).click()

    await expect(participantRow(addExpense, 'Sarah')).toContainText('in use')
    await expect(participantRow(addExpense, 'Avery')).toContainText('in use')
    await expect(participantRow(addExpense, 'Sarah').getByRole('button', { name: 'Delete' })).toHaveCount(0)
    await expect(participantRow(addExpense, 'Avery').getByRole('button', { name: 'Delete' })).toHaveCount(0)

    await page.setViewportSize({ width: 390, height: 844 })
    await expectNoHorizontalOverflow(page)
    await expectMobilePanel(addExpense)
    const history = page.getByTestId('event-history-panel')
    await expectMobilePanel(history)
    const expenseRow = history.locator('.record-row').filter({ hasText: 'Museum tickets' })
    await expect(expenseRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(expenseRow.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expenseRow.getByRole('button', { name: 'Edit' }).click()
    await expect(addExpense.getByLabel('Description')).toHaveValue('Museum tickets')
    await expect(addExpense.getByRole('checkbox', { name: 'Avery' })).toBeChecked()
    await expectMobilePanel(addExpense)
    await expectNoHorizontalOverflow(page)
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

function participantRow(addExpense: Locator, displayName: string): Locator {
  return addExpense.locator('[data-participants] .ledger-row').filter({ hasText: displayName })
}

async function expectShareRows(addExpense: Locator, expectedRows: Array<[string, string]>): Promise<void> {
  const rows = addExpense.locator('.share-row')
  await expect(rows).toHaveCount(expectedRows.length)
  for (const [participant, amount] of expectedRows) {
    const row = await shareRowForParticipant(addExpense, participant)
    await expect(row.getByLabel('Share')).toHaveValue(amount)
  }
}

async function fillShareAmount(addExpense: Locator, participant: string, amount: string): Promise<void> {
  const row = await shareRowForParticipant(addExpense, participant)
  await row.getByLabel('Share').fill(amount)
}

async function shareRowForParticipant(addExpense: Locator, participant: string): Promise<Locator> {
  const rows = addExpense.locator('.share-row')
  const count = await rows.count()
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index)
    const value = await row.getByLabel('Participant').inputValue()
    const expectedValue = await optionValueForLabel(row.getByLabel('Participant'), participant)
    if (value === expectedValue) {
      return row
    }
  }
  throw new Error(`Could not find Share row for ${participant}`)
}

async function optionValueForLabel(select: Locator, label: string): Promise<string> {
  const value = await select.evaluate((element, optionLabel) => {
    if (!(element instanceof HTMLSelectElement)) {
      throw new Error('Expected a select element')
    }
    const option = Array.from(element.options).find((candidate) => candidate.label === optionLabel)
    if (!option) {
      throw new Error(`Could not find option ${optionLabel}`)
    }
    return option.value
  }, label)
  return value
}

function participantBefore(value: string | null, marker: string): string {
  const text = value || ''
  const index = text.indexOf(marker)
  if (index === -1) {
    throw new Error(`Could not find participant before ${marker}`)
  }
  return text.slice(0, index).trim()
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

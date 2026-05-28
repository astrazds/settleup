import { expect, test } from '@playwright/test'
import {
  eventUi,
  expectMobilePanel,
  expectNoHorizontalOverflow,
  optionValueForLabel,
  participantBefore,
  requiredBox
} from './event-ui-builders'
import { describeEventAccessibility } from './event-accessibility'

test.describe('Event UI smoke flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8791' })
  })

  test('creates an Event, captures an Expense, records settlement, and shows Event History', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Sydney smoke ${Date.now()}` })

    await expect(page.getByRole('heading', { name: /Sydney smoke/ })).toBeVisible()
    await expect(event.balancesPanel()).toContainText('Sarah')
    await expect(event.addExpensePanel()).toBeVisible()
    await expect(event.settlementPanel()).toBeVisible()
    await expect(event.historyPanel()).toBeVisible()
    await expect(page.getByText('Add the people sharing this Event')).toBeVisible()

    await event.draftExpense({ description: 'Dinner', amount: '90.00' })
    await event.addParticipants(['Alex', 'Priya'])

    const addExpense = event.addExpensePanel()
    await expect(addExpense.getByLabel('Description')).toHaveValue('Dinner')
    await expect(addExpense.getByLabel('Amount')).toHaveValue('90.00')
    await expect(addExpense.getByRole('checkbox', { name: 'Sarah' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Alex' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Priya' })).toBeChecked()

    await addExpense.getByRole('button', { name: 'Save Expense' }).click()

    const balances = event.balancesPanel()
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*60\.00/)
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/owes.*30\.00/)
    await expect(balances).toContainText(/Priya/)
    await expect(balances).toContainText(/owes.*30\.00/)

    const history = event.historyPanel()
    const expenseRow = event.expenseRecord('Dinner')
    await expect(expenseRow).toContainText('Expense')
    await expect(expenseRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(expenseRow.getByRole('button', { name: 'Delete' })).toBeVisible()

    const settlement = event.settlementPanel()
    await expect(settlement).toContainText('Suggested Settlements')
    await expect(settlement).toContainText(/2 payments/)
    await settlement.getByRole('button', { name: 'Settle up' }).click()

    const suggestion = event.firstSuggestedSettlement()
    await expect(suggestion).toContainText(/sends/)
    await suggestion.getByRole('button', { name: 'Record' }).click()
    await expect(suggestion.getByLabel('Recorded amount')).toHaveValue('30.00')
    await suggestion.getByRole('button', { name: 'Record Settlement Payment' }).click()

    const paymentRow = event.settlementPaymentRecord()
    await expect(paymentRow).toContainText(/sent/)
    await expect(paymentRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(paymentRow.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect(settlement).toContainText(/1 payments/)
  })

  test('edits and deletes an Expense from Event History with saved exact Shares', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Expense correction ${Date.now()}` })
    await event.addParticipants(['Alex', 'Priya'])

    const addExpense = event.addExpensePanel()
    await event.draftExpense({ description: 'Cab fare', amount: '120.00' })
    await event.excludeParticipant('Priya')
    await expect(addExpense.getByText('Remaining', { exact: true })).toBeHidden()
    await addExpense.getByRole('button', { name: 'Save Expense' }).click()

    const history = event.historyPanel()
    const savedExpense = event.expenseRecord('Cab fare')
    await savedExpense.getByRole('button', { name: 'Edit' }).click()

    await expect(addExpense.getByLabel('Description')).toHaveValue('Cab fare')
    await expect(addExpense.getByLabel('Amount')).toHaveValue('120.00')
    await expect(addExpense.getByRole('checkbox', { name: 'Sarah' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Alex' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Priya' })).not.toBeChecked()
    await event.expectShares([
      { participant: 'Sarah', amount: '60.00' },
      { participant: 'Alex', amount: '60.00' }
    ])

    await addExpense.getByLabel('Description').fill('Cab fare corrected')
    await addExpense.getByLabel('Amount').fill('150.00')
    await event.selectPayer('Alex')
    await event.fillShare('Sarah', '50.00')
    await event.fillShare('Alex', '100.00')
    await addExpense.getByRole('button', { name: 'Save Expense' }).click()

    const correctedExpense = event.expenseRecord('Cab fare corrected')
    await expect(correctedExpense).toContainText(/Alex paid .*150\.00/)
    await expect(correctedExpense).toContainText(/Sarah .*50\.00/)
    await expect(correctedExpense).toContainText(/Alex .*100\.00/)

    const balances = event.balancesPanel()
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/is owed.*50\.00/)
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/owes.*50\.00/)

    const settlement = event.settlementPanel()
    await expect(settlement).toContainText(/Sarah sends Alex/)
    await expect(settlement).toContainText(/50\.00/)

    await correctedExpense.getByRole('button', { name: 'Delete' }).click()
    await expect(history).toContainText('No Event history yet')
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is settled/)
    await expect(settlement).toContainText('Everyone is settled.')
  })

  test('captures advanced Expense Shares with assign remaining and payer warning', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Advanced shares ${Date.now()}` })
    await event.addParticipants(['Alex', 'Priya'])

    const addExpense = event.addExpensePanel()
    await event.draftExpense({ description: 'Tour passes', amount: '100.00' })
    await expect(addExpense.getByText('Remaining', { exact: true })).toBeHidden()

    await event.excludeParticipant('Sarah')
    await event.excludeParticipant('Alex')
    await event.excludeParticipant('Priya')
    await expect(event.saveExpenseButton()).toBeDisabled()

    await event.includeParticipant('Alex')
    await event.includeParticipant('Priya')
    await expect(addExpense.getByText('Sarah paid but is not included.')).toBeVisible()

    await event.adjustShares()
    await event.fillShare('Alex', '30.00')
    await expect(addExpense).toContainText(/Remaining.*20\.00/)
    await event.assignRemainingTo('Priya')
    await event.expectShares([
      { participant: 'Alex', amount: '30.00' },
      { participant: 'Priya', amount: '70.00' }
    ])
    await expect(addExpense).toContainText(/Remaining.*0\.00/)
    await addExpense.getByRole('button', { name: 'Save Expense' }).click()

    const history = event.historyPanel()
    const savedExpense = event.expenseRecord('Tour passes')
    await expect(savedExpense).toContainText(/Sarah paid .*100\.00/)
    await expect(savedExpense).toContainText(/Alex .*30\.00/)
    await expect(savedExpense).toContainText(/Priya .*70\.00/)

    const balances = event.balancesPanel()
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*100\.00/)
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/owes.*30\.00/)
    await expect(balances).toContainText(/Priya/)
    await expect(balances).toContainText(/owes.*70\.00/)

    const settlement = event.settlementPanel()
    await expect(settlement).toContainText(/Alex sends Sarah/)
    await expect(settlement).toContainText(/Priya sends Sarah/)
  })

  test('edits and deletes a Settlement Payment and copies settlement summary', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Settlement correction ${Date.now()}` })
    await event.addParticipants(['Alex', 'Priya'])
    await event.draftExpense({ description: 'Hotel', amount: '120.00' })
    await event.saveExpense()

    const settlement = event.settlementPanel()
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

    const suggestion = event.firstSuggestedSettlement()
    const suggestionText = await suggestion.textContent()
    const sender = participantBefore(suggestionText, ' sends Sarah')
    await suggestion.getByRole('button', { name: 'Record' }).click()
    await suggestion.getByRole('button', { name: 'Record Settlement Payment' }).click()

    const history = event.historyPanel()
    const paymentRow = event.settlementPaymentRecord()
    await expect(paymentRow).toContainText(new RegExp(`${sender} sent Sarah`))
    await paymentRow.getByRole('button', { name: 'Edit' }).click()

    await expect(settlement.getByLabel('Sender')).toHaveValue(await optionValueForLabel(settlement.getByLabel('Sender'), sender))
    await expect(settlement.getByLabel('Recipient')).toHaveValue(await optionValueForLabel(settlement.getByLabel('Recipient'), 'Sarah'))
    await expect(settlement.getByLabel('Amount')).toHaveValue('40.00')
    await event.draftSettlementPayment({ amount: '20.00' })
    await event.saveSettlementPayment()

    await expect(paymentRow).toContainText(/20\.00/)
    const balances = event.balancesPanel()
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
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Participant correction ${Date.now()}` })
    await event.addParticipants(['Alex', 'Temp'])

    const addExpense = event.addExpensePanel()
    const alexRow = event.participantRow('Alex')
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Participant display name')
      await dialog.accept('Avery')
    })
    await alexRow.getByRole('button', { name: 'Rename' }).click()

    await expect(event.participantRow('Avery')).toBeVisible()
    await expect(addExpense.getByRole('checkbox', { name: 'Avery' })).toBeVisible()
    await expect(addExpense.getByLabel('Payer')).toContainText('Avery')

    await event.participantRow('Temp').getByRole('button', { name: 'Delete' }).click()
    await expect(event.participantRow('Temp')).toHaveCount(0)
    await expect(addExpense.getByRole('checkbox', { name: 'Temp' })).toHaveCount(0)

    await event.draftExpense({ description: 'Museum tickets', amount: '80.00' })
    await event.saveExpense()

    await expect(event.participantRow('Sarah')).toContainText('in use')
    await expect(event.participantRow('Avery')).toContainText('in use')
    await expect(event.participantRow('Sarah').getByRole('button', { name: 'Delete' })).toHaveCount(0)
    await expect(event.participantRow('Avery').getByRole('button', { name: 'Delete' })).toHaveCount(0)

    await page.setViewportSize({ width: 390, height: 844 })
    await expectNoHorizontalOverflow(page)
    await expectMobilePanel(addExpense)
    const history = event.historyPanel()
    await expectMobilePanel(history)
    const expenseRow = event.expenseRecord('Museum tickets')
    await expect(expenseRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(expenseRow.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expenseRow.getByRole('button', { name: 'Edit' }).click()
    await expect(addExpense.getByLabel('Description')).toHaveValue('Museum tickets')
    await expect(addExpense.getByRole('checkbox', { name: 'Avery' })).toBeChecked()
    await expectMobilePanel(addExpense)
    await expectNoHorizontalOverflow(page)
  })

  test('keeps mobile panels usable and Event Link feedback fixed', async ({ page }) => {
    const event = eventUi(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await event.createEvent({ eventTitle: `Mobile smoke ${Date.now()}` })
    await event.draftExpense({ description: 'Ferry tickets', amount: '60.00' })
    await event.addParticipant('Alex')
    await event.saveExpense()

    await expectMobilePanel(event.balancesPanel())
    await expectMobilePanel(event.addExpensePanel())
    await expectMobilePanel(event.settlementPanel())
    await expectMobilePanel(event.historyPanel())
    await expectNoHorizontalOverflow(page)

    await page.evaluate(() => window.scrollTo(0, 0))
    const before = await requiredBox(event.addExpensePanel())
    const copyButton = page.getByRole('button', { name: 'Copy Event Link' })
    await copyButton.click()
    await expect(page.getByText('Event Link copied')).toBeVisible()
    await expect(copyButton).toHaveText('Copy Event Link')
    const after = await requiredBox(event.addExpensePanel())

    expect(Math.abs(after.y - before.y)).toBeLessThan(1)
  })
})

describeEventAccessibility()

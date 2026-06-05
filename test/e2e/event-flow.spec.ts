import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  eventUi,
  expectMobilePanel,
  expectNoHorizontalOverflow,
  requiredBox
} from './event-ui-builders'
import { describeEventAccessibility } from './event-accessibility'

test.describe('Event UI smoke flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8791' })
  })

  test('shows durable inline create form errors before submitting invalid fields', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Create Event' }).click()
    await expect(page.getByText('Enter an Event Title.')).toBeVisible()
    await expect(page.getByLabel('Event Title')).toBeFocused()
    await expect(page.getByLabel('Event Title')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Event Title')).toHaveAttribute('aria-describedby', /create-title-error/)

    await page.getByLabel('Event Title').fill('Sydney weekend')
    await expect(page.getByText('One detail left before the private Event Link opens.')).toBeVisible()
    await page.getByRole('button', { name: 'Create Event' }).click()
    await expect(page.getByText('Enter your name.')).toBeVisible()
    await expect(page.getByLabel('Your name')).toBeFocused()
    await expect(page.getByLabel('Your name')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Your name')).toHaveAttribute('aria-describedby', /create-display-name-error/)
  })

  test('creates an Event, captures an Expense, records settlement, and shows Event History', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Sydney smoke ${Date.now()}` })

    await expect(page.getByRole('heading', { name: /Sydney smoke/ })).toBeVisible()
    await expect(event.balancesPanel()).toContainText('Sarah')
    await expect(event.addExpensePanel()).toBeVisible()
    await expect(event.settlementPanel()).toHaveCount(0)
    await expect(event.historyPanel()).toBeVisible()
    await expect(event.addExpensePanel().getByText('Add another Participant first')).toBeVisible()

    await event.addParticipants(['Alex', 'Priya'])
    await expect(event.settlementPanel()).toBeVisible()
    await event.draftExpense({ description: 'Dinner', amount: '90.00' })

    const addExpense = event.addExpensePanel()
    await expect(addExpense.getByLabel('Description')).toHaveValue('Dinner')
    await expect(addExpense.getByLabel('Amount')).toHaveValue('90.00')
    await expect(addExpense.getByRole('checkbox', { name: 'Sarah' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Alex' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Priya' })).toBeChecked()

    await event.saveExpense()

    const balances = event.balancesPanel()
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*60\.00/)
    await expect(balanceRow(balances, 'Sarah').getByRole('button', { name: 'Pay' })).toHaveCount(0)
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/owes.*30\.00/)
    await expect(balances).toContainText(/Priya/)
    await expect(balances).toContainText(/owes.*30\.00/)

    const expenseRow = event.expenseRecord('Dinner')
    await expect(expenseRow).toContainText('Expense')
    await expect(expenseRow).toContainText('Split between')
    await expect(expenseRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(expenseRow.getByRole('button', { name: 'Delete' })).toBeVisible()

    const settlement = event.settlementPanel()
    await expect(settlement).toContainText('Record outside payment')
    await expect(settlement.getByRole('button', { name: 'Record outside payment' })).toBeVisible()

    const alexBalance = balanceRow(balances, 'Alex')
    await alexBalance.getByRole('button', { name: 'Pay' }).click()
    await expect(alexBalance.getByText(/Alex pays Sarah.*30\.00/)).toBeVisible()
    const payResponsePromise = page.waitForResponse((response) => {
      const request = response.request()
      return response.url().includes('/settlement-payments') && request.method() === 'POST'
    })
    await alexBalance.getByRole('button', { name: 'Record payment' }).click()
    expect((await payResponsePromise).ok()).toBe(true)

    const paymentRow = event.settlementPaymentRecord()
    await expect(paymentRow).toContainText('Payment')
    await expect(paymentRow).toContainText('Recorded payment outside SettleUp')
    await expect(paymentRow).toContainText(/Alex paid Sarah/)
    await expect(paymentRow).toContainText(/30\.00/)
    await expect(paymentRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(paymentRow.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/is settled/)
    await expect(balances).toContainText(/Priya/)
    await expect(balances).toContainText(/owes.*30\.00/)
  })

  test('keeps the one-Participant Event focused on adding people before expenses', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `First run ${Date.now()}` })

    const addExpense = event.addExpensePanel()
    await expect(page.getByText('Add the people sharing this Event')).toHaveCount(0)
    await expect(addExpense.getByText('Add another Participant first')).toBeVisible()
    await expect(addExpense.getByText('Expenses need at least two Participants so SettleUp can split the cost.')).toBeVisible()
    await expect(addExpense.getByLabel('Description')).toHaveCount(0)
    await expect(addExpense.getByLabel('Amount')).toHaveCount(0)
    await expect(addExpense.getByRole('button', { name: 'Save expense' })).toHaveCount(0)
    await expect(event.expenseDefaults()).toHaveCount(0)
    await expect(addExpense.getByLabel('Display name')).toBeVisible()
    await expect(event.settlementPanel()).toHaveCount(0)

    await event.addParticipant('Alex')
    await expect(page.getByText('Record the first shared cost')).toBeVisible()
    await expect(addExpense.getByText('Add another Participant first')).toHaveCount(0)
    await expect(addExpense.getByLabel('Description')).toBeVisible()
    await expect(addExpense.getByLabel('Amount')).toBeVisible()
    await expect(event.expenseDefaults()).toBeVisible()
  })

  test('edits and deletes an Expense from Event History with included Participants', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Expense correction ${Date.now()}` })
    await event.addParticipants(['Alex', 'Priya'])

    const addExpense = event.addExpensePanel()
    await event.draftExpense({ description: 'Cab fare', amount: '120.00' })
    await event.excludeParticipant('Priya')
    await event.saveExpense()

    const history = event.historyPanel()
    const savedExpense = event.expenseRecord('Cab fare')
    await savedExpense.getByRole('button', { name: 'Edit' }).click()

    await expect(addExpense.getByLabel('Description')).toHaveValue('Cab fare')
    await expect(addExpense.getByLabel('Amount')).toHaveValue('120.00')
    await expect(addExpense.getByRole('checkbox', { name: 'Sarah' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Alex' })).toBeChecked()
    await expect(addExpense.getByRole('checkbox', { name: 'Priya' })).not.toBeChecked()

    await addExpense.getByLabel('Description').fill('Cab fare corrected')
    await addExpense.getByLabel('Amount').fill('150.00')
    await event.switchExpenseDefault('Alex')
    await event.saveExpense()

    const correctedExpense = event.expenseRecord('Cab fare corrected')
    await expect(correctedExpense).toContainText(/Alex paid .*150\.00/)
    await expect(correctedExpense).toContainText(/Sarah .*75\.00/)
    await expect(correctedExpense).toContainText(/Alex .*75\.00/)

    const balances = event.balancesPanel()
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/is owed.*75\.00/)
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/owes.*75\.00/)

    const settlement = event.settlementPanel()
    await expect(settlement.getByRole('button', { name: 'Record outside payment' })).toBeVisible()

    page.once('dialog', (dialog) => void dialog.accept())
    await correctedExpense.getByRole('button', { name: 'Delete' }).click()
    await expect(history).toContainText('No activity yet')
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is settled/)
    await expect(settlement.getByRole('button', { name: 'Record outside payment' })).toBeVisible()
  })

  test('uses instant programmatic scrolling when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Reduced motion ${Date.now()}` })
    await event.addParticipant('Alex')
    await event.draftExpense({ description: 'Train tickets', amount: '50.00' })
    await event.saveExpense()

    await trackScrollIntoViewCalls(page)
    await event.expenseRecord('Train tickets').getByRole('button', { name: 'Edit' }).click()

    await expect(event.addExpensePanel().getByLabel('Description')).toHaveValue('Train tickets')
    await expect(await scrollIntoViewCalls(page)).toContainEqual({ behavior: 'auto', block: 'start' })
  })

  test('captures an Expense with participant exclusions and payer warning', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Advanced shares ${Date.now()}` })
    await event.addParticipants(['Alex', 'Priya'])

    const addExpense = event.addExpensePanel()
    await event.draftExpense({ description: 'Tour passes', amount: '100.00' })

    await event.excludeParticipant('Sarah')
    await event.excludeParticipant('Alex')
    await event.excludeParticipant('Priya')
    await expect(event.saveExpenseButton()).toBeDisabled()
    await expect(addExpense.getByText('Choose at least one Participant to split this expense.')).toBeVisible()

    await event.includeParticipant('Alex')
    await event.includeParticipant('Priya')
    await expect(addExpense.getByText('Sarah paid but is not included.')).toBeVisible()

    await event.saveExpense()

    const savedExpense = event.expenseRecord('Tour passes')
    await expect(savedExpense).toContainText(/Sarah paid .*100\.00/)
    await expect(savedExpense).toContainText(/Alex .*50\.00/)
    await expect(savedExpense).toContainText(/Priya .*50\.00/)

    const balances = event.balancesPanel()
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*100\.00/)
    await expect(balances).toContainText(/Alex/)
    await expect(balances).toContainText(/owes.*50\.00/)
    await expect(balances).toContainText(/Priya/)
    await expect(balances).toContainText(/owes.*50\.00/)

    await expect(event.settlementPanel().getByRole('button', { name: 'Record outside payment' })).toBeVisible()
  })

  test('edits and deletes a Payment from direct balance settlement', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Settlement correction ${Date.now()}` })
    await event.addParticipants(['Alex', 'Priya'])
    await event.draftExpense({ description: 'Hotel', amount: '120.00' })
    await event.saveExpense()

    const settlement = event.settlementPanel()
    await expect(settlement.getByRole('button', { name: 'Copy summary' })).toHaveCount(0)

    const sender = 'Alex'
    await event.draftSettlementPayment({ sender, recipient: 'Sarah', amount: '40.00' })
    await expect(settlement.locator('[data-settlement-preview]')).toContainText(new RegExp(`${sender} paid Sarah[\\s\\S]*40\\.00[\\s\\S]*outside SettleUp`))
    await event.saveSettlementPayment()

    const history = event.historyPanel()
    const paymentRow = event.settlementPaymentRecord()
    await expect(paymentRow).toContainText(new RegExp(`${sender} paid Sarah`))
    await paymentRow.getByRole('button', { name: 'Edit' }).click()

    await expect(settlement.getByRole('combobox', { name: 'Who paid' })).toContainText(sender)
    await expect(settlement.getByRole('combobox', { name: 'Who received' })).toContainText('Sarah')
    await expect(settlement.getByLabel('Amount')).toHaveValue('40.00')
    await event.draftSettlementPayment({ amount: '20.00' })
    await event.saveSettlementPayment()

    await expect(paymentRow).toContainText(/20\.00/)
    const balances = event.balancesPanel()
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*60\.00/)
    await expect(balances).toContainText(new RegExp(`${sender}[\\s\\S]*owes[\\s\\S]*20\\.00`))
    await expect(settlement.getByRole('button', { name: 'Record outside payment' })).toBeVisible()

    page.once('dialog', (dialog) => void dialog.accept())
    await paymentRow.getByRole('button', { name: 'Delete' }).click()
    await expect(history.getByTestId('history-record').filter({ hasText: 'Payment' })).toHaveCount(0)
    await expect(balances).toContainText(/Sarah/)
    await expect(balances).toContainText(/is owed.*80\.00/)
    await expect(settlement.getByRole('button', { name: 'Record outside payment' })).toBeVisible()
  })

  test('renames and deletes Participants while protecting referenced Participants on mobile', async ({ page }) => {
    const event = eventUi(page)
    await event.createEvent({ eventTitle: `Participant correction ${Date.now()}` })
    await event.addParticipants(['Alex', 'Temp'])
    await event.openParticipantManager()

    const addExpense = event.addExpensePanel()
    await event.participantRow('Alex').getByRole('button', { name: 'Rename' }).click()
    const renameRow = addExpense.getByTestId('participant-rename-form')
    await expect(renameRow.getByLabel('Participant display name')).toHaveValue('Alex')

    const correctedName = 'Avery אלכס Traveler With A Very Long Shared Name 😊'
    await renameRow.getByLabel('Participant display name').fill(correctedName)
    await renameRow.getByRole('button', { name: 'Save' }).click()

    await expect(event.participantRow(correctedName)).toBeVisible()
    await expect(addExpense.getByRole('checkbox', { name: correctedName })).toBeVisible()
    await event.expenseDefaults().getByRole('combobox', { name: 'Choose who is adding expenses' }).click()
    await expect(page.getByRole('option', { name: correctedName, exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    const tempRow = event.participantRow('Temp')
    page.once('dialog', (dialog) => void dialog.accept())
    await tempRow.getByRole('button', { name: 'Delete' }).click()
    await expect(event.participantRow('Temp')).toHaveCount(0)
    await expect(addExpense.getByRole('checkbox', { name: 'Temp' })).toHaveCount(0)

    await event.draftExpense({ description: 'Museum tickets', amount: '80.00' })
    await event.saveExpense()

    await expect(event.participantRow('Sarah')).toContainText('Referenced Participants cannot be deleted.')
    await expect(event.participantRow(correctedName)).toContainText('Referenced Participants cannot be deleted.')
    await expect(event.participantRow('Sarah').getByRole('button', { name: 'Delete' })).toBeDisabled()
    await expect(event.participantRow(correctedName).getByRole('button', { name: 'Delete' })).toBeDisabled()

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
    await expect(addExpense.getByRole('checkbox', { name: correctedName })).toBeChecked()
    await expectMobilePanel(addExpense)
    await expectNoHorizontalOverflow(page)
  })

  test('keeps mobile panels usable and Event Link feedback fixed', async ({ page }) => {
    const event = eventUi(page)
    await page.setViewportSize({ width: 320, height: 740 })
    await event.createEvent({ eventTitle: `MobileSmokeLongEventTitleWithoutSpaces${Date.now()}` })
    await event.addParticipant('Alex')
    await event.draftExpense({ description: 'Ferry tickets', amount: '60.00' })
    await event.saveExpense()

    await expectMobilePanel(event.balancesPanel())
    await expectMobilePanel(event.addExpensePanel())
    await expectMobilePanel(event.settlementPanel())
    await expectMobilePanel(event.historyPanel())
    await expectNoHorizontalOverflow(page)

    const editAction = event.expenseRecord('Ferry tickets').getByRole('button', { name: 'Edit expense' })
    const deleteAction = event.expenseRecord('Ferry tickets').getByRole('button', { name: 'Delete expense' })
    expect((await requiredBox(editAction)).height).toBeGreaterThanOrEqual(44)
    expect((await requiredBox(deleteAction)).height).toBeGreaterThanOrEqual(44)

    await page.evaluate(() => window.scrollTo(0, 0))
    const before = await requiredBox(event.addExpensePanel())
    const copyButton = page.getByRole('button', { name: 'Copy Event Link' })
    await copyButton.click()
    await expect(page.getByText('Event Link copied')).toBeVisible()
    await expect(copyButton).toHaveAccessibleName('Copy Event Link')
    const after = await requiredBox(event.addExpensePanel())

    expect(Math.abs(after.y - before.y)).toBeLessThan(1)
  })
})

describeEventAccessibility()

function balanceRow(balances: Locator, displayName: string): Locator {
  return balances.getByTestId('balance-row').filter({ hasText: displayName })
}

async function trackScrollIntoViewCalls(page: Page): Promise<void> {
  await page.evaluate(() => {
    const calls: Array<boolean | ScrollIntoViewOptions | undefined> = []
    const originalScrollIntoView = Element.prototype.scrollIntoView
    const targetWindow = window as Window & {
      __settleUpScrollIntoViewCalls?: Array<boolean | ScrollIntoViewOptions | undefined>
    }
    targetWindow.__settleUpScrollIntoViewCalls = calls
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions): void {
      calls.push(options)
      originalScrollIntoView.call(this, options)
    }
  })
}

async function scrollIntoViewCalls(page: Page): Promise<Array<boolean | { behavior?: ScrollBehavior, block?: ScrollLogicalPosition } | undefined>> {
  return page.evaluate(() => {
    const targetWindow = window as Window & {
      __settleUpScrollIntoViewCalls?: Array<boolean | ScrollIntoViewOptions | undefined>
    }
    return (targetWindow.__settleUpScrollIntoViewCalls ?? []).map((options) => {
      if (!options || typeof options === 'boolean') return options
      return {
        behavior: options.behavior,
        block: options.block
      }
    })
  })
}

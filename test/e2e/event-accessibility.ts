import { expect, test } from '@playwright/test'
import { eventUi } from './event-ui-builders'
import {
  expectFormControlNames,
  expectIncludedParticipantsGroup,
  expectNamedButtons,
  expectSectionWithHeading
} from './event-ui-accessibility'

export function describeEventAccessibility(): void {
  test.describe('Event UI accessibility', () => {
    test('keeps the core Event workflow labeled, grouped, and keyboard reachable', async ({ page }) => {
      const event = eventUi(page)
      await event.createEvent({ eventTitle: `A11y core ${Date.now()}` })

      await expect(page.getByRole('main')).toBeVisible()
      await expect(event.expenseDefaults()).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Copy Event Link' })).toBeVisible()

      await expectSectionWithHeading(event.balancesPanel(), 'Balances')
      await expectSectionWithHeading(event.addExpensePanel(), 'Add Expense')
      await expectSectionWithHeading(event.historyPanel(), 'Event History')
      await expect(event.settlementPanel()).toHaveCount(0)
      await expect(event.addExpensePanel().getByText('Add another Participant first')).toBeVisible()
      await expect(event.addExpensePanel().getByLabel('Description')).toHaveCount(0)
      await expect(event.addExpensePanel().getByLabel('Payer')).toHaveCount(0)

      await event.addParticipants(['Alex', 'Priya'])
      await expect(event.expenseDefaults().getByLabel('Choose who is adding expenses')).toBeVisible()
      await expect(event.expenseDefaults().getByRole('button')).toHaveCount(0)
      await expectFormControlNames(event.addExpensePanel(), ['Description', 'Amount'])
      await expect(event.addExpensePanel().getByLabel('Payer')).toHaveCount(0)
      await expectIncludedParticipantsGroup(event.addExpensePanel(), ['Sarah', 'Alex', 'Priya'])
      await expect(event.participantRow('Alex').getByRole('button', { name: 'Rename participant Alex' })).toBeVisible()
      await expect(event.participantRow('Priya').getByRole('button', { name: 'Delete participant Priya' })).toBeVisible()
      await event.settlementPanel().getByRole('button', { name: 'Record outside payment' }).click()
      await expectFormControlNames(event.settlementPanel(), ['Who paid', 'Who received', 'Amount'])
      await expect(event.settlementPanel()).toContainText('Record money that already moved outside SettleUp. This updates balances only.')
      await expect(event.settlementPanel().locator('[data-settlement-preview]')).toContainText(/Sarah paid Sarah outside SettleUp/)
      await event.settlementPanel().getByRole('button', { name: 'Cancel' }).click()

      await event.draftExpense({ description: 'Dinner', amount: '90.00' })
      await event.saveExpense()

      await expect(event.balancesPanel()).toContainText(/Sarah/)
      await expect(event.balancesPanel()).toContainText(/is owed.*60\.00/)
      await expect(event.balancesPanel().getByRole('button', { name: /Review payment for Alex owing .*30\.00/ })).toBeVisible()
      await expect(event.settlementPanel().getByRole('button', { name: 'Record outside payment' })).toBeVisible()
      await expect(event.expenseRecord('Dinner').getByRole('button', { name: /Edit expense Dinner.*90\.00/ })).toBeVisible()
    })

    test('keeps Event correction controls accessible without depending on visual layout', async ({ page }) => {
      const event = eventUi(page)
      await event.createEvent({ eventTitle: `A11y corrections ${Date.now()}` })
      await event.addParticipants(['Alex', 'Priya'])
      await event.draftExpense({ description: 'Tour passes', amount: '100.00' })

      await event.excludeParticipant('Sarah')
      await event.excludeParticipant('Alex')
      await event.excludeParticipant('Priya')
      await expect(event.saveExpenseButton()).toBeDisabled()
      await expect(event.addExpensePanel().getByText('Choose at least one Participant to split this expense.')).toBeVisible()

      await event.includeParticipant('Alex')
      await event.includeParticipant('Priya')
      await expect(event.addExpensePanel().getByText('Sarah paid but is not included.')).toBeVisible()

      await event.saveExpense()

      const expenseRecord = event.expenseRecord('Tour passes')
      await expectNamedButtons(expenseRecord, [/Edit expense Tour passes.*100\.00/, /Delete expense Tour passes.*100\.00/])

      await expect(event.settlementPanel().getByRole('button', { name: 'Record outside payment' })).toBeVisible()
      await event.draftSettlementPayment({ sender: 'Alex', recipient: 'Sarah', amount: '30.00' })
      await expectFormControlNames(event.settlementPanel(), ['Who paid', 'Who received', 'Amount'])
      await expectNamedButtons(event.settlementPanel(), ['Record payment', 'Cancel'])
      await expect(event.settlementPanel().locator('[data-settlement-preview]')).toContainText(/Alex paid Sarah[\s\S]*30\.00[\s\S]*outside SettleUp/)
    })

    test('connects form validation errors to their fields and live alert regions', async ({ page }) => {
      const event = eventUi(page)
      await event.createEvent({ eventTitle: `A11y errors ${Date.now()}` })
      await event.addParticipant('Alex')

      await page.route('**/api/events/**/expenses', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Amount must be positive' } })
        })
      })

      const addExpense = event.addExpensePanel()
      await event.draftExpense({ description: 'Snacks', amount: '12.00' })
      await event.saveExpenseButton().click()

      const expenseAmount = addExpense.getByLabel('Amount')
      const expenseError = addExpense.locator('[data-expense-error]')
      await expect(expenseError).toBeVisible()
      await expect(expenseError).toHaveAttribute('role', 'alert')
      await expect(expenseError).toHaveText('Amount must be positive')
      await expect(expenseAmount).toHaveAttribute('aria-invalid', 'true')
      await expect(expenseAmount).toHaveAttribute('aria-describedby', 'expense-error')

      await event.draftSettlementPayment({ sender: 'Alex', recipient: 'Sarah' })
      await event.settlementPanel().locator('[data-settlement-form]').getByRole('button', { name: 'Record payment' }).click()

      const settlementAmount = event.settlementPanel().getByLabel('Amount')
      const settlementError = event.settlementPanel().locator('[data-settlement-error]')
      await expect(settlementError).toBeVisible()
      await expect(settlementError).toHaveAttribute('role', 'alert')
      await expect(settlementError).toHaveText('Amount must be a positive decimal amount')
      await expect(settlementAmount).toHaveAttribute('aria-invalid', 'true')
      await expect(settlementAmount).toHaveAttribute('aria-describedby', 'settlement-error')
    })
  })
}

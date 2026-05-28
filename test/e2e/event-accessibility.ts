import { expect, test } from '@playwright/test'
import { eventUi } from './event-ui-builders'
import {
  expectActiveElementLabel,
  expectFormControlNames,
  expectIncludedParticipantsGroup,
  expectNamedButtons,
  expectSectionWithHeading,
  pressFocusedAction
} from './event-ui-accessibility'

export function describeEventAccessibility(): void {
  test.describe('Event UI accessibility', () => {
    test('keeps the core Event workflow labeled, grouped, and keyboard reachable', async ({ page }) => {
      const event = eventUi(page)
      await event.createEvent({ eventTitle: `A11y core ${Date.now()}` })

      await expect(page.getByRole('main')).toBeVisible()
      await expect(event.expenseDefaults().getByLabel('Expense defaults Participant')).toBeVisible()
      await expectNamedButtons(event.expenseDefaults(), ['Switch'])
      await expect(page.getByRole('button', { name: 'Copy Event Link' })).toBeVisible()

      await expectSectionWithHeading(event.balancesPanel(), 'Balances')
      await expectSectionWithHeading(event.addExpensePanel(), 'Add Expense')
      await expectSectionWithHeading(event.historyPanel(), 'Event History')
      await expect(event.settlementPanel()).toContainText('Manual Payment')

      await expectFormControlNames(event.addExpensePanel(), ['Description', 'Amount'])
      await expect(event.addExpensePanel().getByLabel('Payer')).toHaveCount(0)
      await expectIncludedParticipantsGroup(event.addExpensePanel(), ['Sarah'])

      await pressFocusedAction(page.locator('[data-start-guidance]').getByRole('button', { name: 'Add Participant' }))
      await expectActiveElementLabel(page, 'Display name')

      await event.addParticipants(['Alex', 'Priya'])
      await expectIncludedParticipantsGroup(event.addExpensePanel(), ['Sarah', 'Alex', 'Priya'])
      await event.settlementPanel().getByRole('button', { name: 'Manual Payment' }).click()
      await expectFormControlNames(event.settlementPanel(), ['Sender', 'Recipient', 'Amount'])
      await event.settlementPanel().getByRole('button', { name: 'Cancel' }).click()

      await event.draftExpense({ description: 'Dinner', amount: '90.00' })
      await event.saveExpense()

      await expect(event.balancesPanel()).toContainText(/Sarah/)
      await expect(event.balancesPanel()).toContainText(/is owed.*60\.00/)
      await expect(event.settlementPanel().getByRole('button', { name: 'Manual Payment' })).toBeVisible()
      await expect(event.expenseRecord('Dinner').getByRole('button', { name: 'Edit' })).toBeVisible()
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

      await event.includeParticipant('Alex')
      await event.includeParticipant('Priya')
      await expect(event.addExpensePanel().getByText('Sarah paid but is not included.')).toBeVisible()

      await event.saveExpense()

      const expenseRecord = event.expenseRecord('Tour passes')
      await expectNamedButtons(expenseRecord, ['Edit', 'Delete'])

      await expect(event.settlementPanel().getByRole('button', { name: 'Manual Payment' })).toBeVisible()
      await event.draftSettlementPayment({ sender: 'Alex', recipient: 'Sarah', amount: '30.00' })
      await expectFormControlNames(event.settlementPanel(), ['Sender', 'Recipient', 'Amount'])
      await expectNamedButtons(event.settlementPanel(), ['Record', 'Cancel'])
    })
  })
}
